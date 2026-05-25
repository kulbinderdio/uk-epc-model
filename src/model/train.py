"""
LightGBM training with optional Optuna hyperparameter search.

Usage:
    python -m src.model.train --search          # Optuna search on 10M-row sample
    python -m src.model.train --full            # Full training on all Parquet files
    python -m src.model.train --search --full   # Search then retrain on full data
"""

from __future__ import annotations

import argparse
import logging
from pathlib import Path

import lightgbm as lgb
import numpy as np
import optuna
import polars as pl
from sklearn.model_selection import StratifiedKFold

from scipy.optimize import minimize

from src.pipeline.features import SAP_THRESHOLDS, TARGET_COL, load_feature_meta, score_to_grade

log = logging.getLogger(__name__)

TRAIN_DIR = Path("data/processed/train")
MODEL_PATH = Path("data/models/lgbm_epc.txt")
META_PATH = Path("data/models/feature_meta.json")

SAMPLE_ROWS = 2_000_000   # larger sample → better hyperparameter generalisation
N_OPTUNA_TRIALS = 50
N_CV_FOLDS = 2
SEARCH_BOOST_ROUNDS = 400
EARLY_STOPPING_ROUNDS = 50
VAL_FRACTION = 0.05

DEFAULT_PARAMS = {
    "objective": "regression_l1",
    "metric": "mae",
    "verbose": -1,
    "n_jobs": -1,
    "seed": 42,
    # Best params from Optuna search (trial 1, MAE 2.78 on 500K sample)
    "num_leaves": 666,
    "learning_rate": 0.1111,
    "feature_fraction": 0.510,
    "bagging_fraction": 0.985,
    "bagging_freq": 9,
    "min_child_samples": 122,
    "reg_alpha": 0.00081,
    "reg_lambda": 0.00083,
}


def load_parquet_dir(
    directory: Path, meta: dict, update_cat_maps: bool = False
) -> tuple[np.ndarray, np.ndarray]:
    """Load all Parquet files in a directory, return (X, y) arrays.

    Categorical columns are converted to Int32 integer codes. When
    update_cat_maps=True the code→string mappings are written back to meta
    (and the caller is responsible for persisting meta to META_PATH).
    """
    files = sorted(directory.glob("*.parquet"))
    if not files:
        raise FileNotFoundError(f"No Parquet files in {directory}")

    dfs = [pl.read_parquet(f) for f in files]
    df = pl.concat(dfs, how="diagonal")
    log.info("Loaded %d rows from %s", len(df), directory)

    feature_cols = [c for c in meta["feature_columns"] if c in df.columns]

    # Build category→int maps from the actual unique values per column.
    # NOTE: df[col].cat.get_categories() returns the Polars global string cache
    # (all strings from all categorical columns merged), NOT per-column categories.
    # Using drop_nulls().unique() gives correct per-column vocabulary.
    # LightGBM 4.5+ requires int/float/bool dtype — object strings are rejected.
    cat_maps: dict[str, dict[str, int]] = {}
    cat_defaults: dict[str, int] = {}  # most-common code per column for inference fallback
    for col in feature_cols:
        if col not in df.columns or df[col].dtype != pl.Categorical:
            continue
        cats = sorted(str(v) for v in df[col].drop_nulls().unique().to_list())
        cat_maps[col] = {v: i for i, v in enumerate(cats)}
        # Find mode (most frequent category code) for use when value is missing at inference
        mode_val = df[col].drop_nulls().mode()[0]
        cat_defaults[col] = cat_maps[col].get(str(mode_val), 0)

    if update_cat_maps:
        meta["category_maps"] = cat_maps
        meta["category_defaults"] = cat_defaults

    # Convert Polars DataFrame → pandas, then recode categoricals to Int32.
    X = df.select(feature_cols).to_pandas()
    for col, code_map in cat_maps.items():
        if col not in X.columns:
            continue
        null_code = len(code_map)
        X[col] = (
            X[col]
            .map(lambda v, cm=code_map, nc=null_code: cm.get(str(v), nc) if v is not None and str(v) != "nan" else nc)
            .astype("int32")
        )

    y = df[TARGET_COL].cast(pl.Float32).to_numpy()
    return X, y


def _make_dataset(X, y, feature_names: list[str], cat_cols: list[str]) -> lgb.Dataset:
    cat_feature_indices = [feature_names.index(c) for c in cat_cols if c in feature_names]
    return lgb.Dataset(
        X,
        label=y,
        feature_name=feature_names,
        categorical_feature=cat_feature_indices,
        free_raw_data=False,
    )


def optuna_search(X, y, meta: dict, n_trials: int = N_OPTUNA_TRIALS) -> dict:
    """Run Optuna hyperparameter search using stratified CV on the sample data."""
    feature_names = [c for c in meta["feature_columns"] if c in list(X.columns)]
    cat_cols = [c for c in meta.get("categorical_cols", []) if c in feature_names]

    # Stratify by grade band (bin y into 7 buckets)
    grade_bins = np.digitize(y, bins=[21, 39, 55, 69, 81, 92])

    def objective(trial: optuna.Trial) -> float:
        params = {
            **DEFAULT_PARAMS,
            "num_leaves": trial.suggest_int("num_leaves", 127, 1023),
            "learning_rate": trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
            "feature_fraction": trial.suggest_float("feature_fraction", 0.5, 1.0),
            "bagging_fraction": trial.suggest_float("bagging_fraction", 0.5, 1.0),
            "bagging_freq": trial.suggest_int("bagging_freq", 1, 10),
            "min_child_samples": trial.suggest_int("min_child_samples", 20, 500),
            "reg_alpha": trial.suggest_float("reg_alpha", 1e-4, 10.0, log=True),
            "reg_lambda": trial.suggest_float("reg_lambda", 1e-4, 10.0, log=True),
        }
        cv_scores = []
        skf = StratifiedKFold(n_splits=N_CV_FOLDS, shuffle=True, random_state=42)
        for train_idx, val_idx in skf.split(X, grade_bins):
            X_tr, X_val = X.iloc[train_idx], X.iloc[val_idx]
            y_tr, y_val = y[train_idx], y[val_idx]
            ds_train = _make_dataset(X_tr, y_tr, feature_names, cat_cols)
            ds_val = _make_dataset(X_val, y_val, feature_names, cat_cols)
            booster = lgb.train(
                params,
                ds_train,
                num_boost_round=SEARCH_BOOST_ROUNDS,
                valid_sets=[ds_val],
                callbacks=[
                    lgb.early_stopping(EARLY_STOPPING_ROUNDS, verbose=False),
                    lgb.log_evaluation(period=-1),
                ],
            )
            pred = booster.predict(X_val)
            cv_scores.append(np.mean(np.abs(pred - y_val)))
        return float(np.mean(cv_scores))

    optuna.logging.set_verbosity(optuna.logging.WARNING)
    study = optuna.create_study(direction="minimize", sampler=optuna.samplers.TPESampler(seed=42))
    study.optimize(objective, n_trials=n_trials, show_progress_bar=True)

    best = {**DEFAULT_PARAMS, **study.best_params}
    log.info("Best MAE: %.4f  params: %s", study.best_value, study.best_params)
    return best


def train_full(X, y, meta: dict, params: dict) -> lgb.Booster:
    """Train final LightGBM model on the full dataset."""
    feature_names = [c for c in meta["feature_columns"] if c in list(X.columns)]
    cat_cols = [c for c in meta.get("categorical_cols", []) if c in feature_names]

    # Hold out VAL_FRACTION for early stopping
    n_val = max(1, int(len(y) * VAL_FRACTION))
    rng = np.random.default_rng(42)
    val_idx = rng.choice(len(y), size=n_val, replace=False)
    train_mask = np.ones(len(y), dtype=bool)
    train_mask[val_idx] = False

    ds_train = _make_dataset(X.iloc[train_mask], y[train_mask], feature_names, cat_cols)
    ds_val = _make_dataset(X.iloc[val_idx], y[val_idx], feature_names, cat_cols)

    booster = lgb.train(
        params,
        ds_train,
        num_boost_round=5000,
        valid_sets=[ds_val],
        callbacks=[
            lgb.early_stopping(EARLY_STOPPING_ROUNDS),
            lgb.log_evaluation(period=50),
        ],
    )
    return booster


TEST_DIR = Path("data/processed/test")


def _calibrate_thresholds(booster: lgb.Booster, meta: dict) -> list[float]:
    """Find grade boundaries that maximise accuracy on a calibration sample.

    Uses the first 100K rows of the test set.  The original SAP thresholds are
    used as starting point; Nelder-Mead shifts them to correct any systematic
    model bias near boundaries.
    """
    import pandas as pd

    feature_cols = meta["feature_columns"]
    cat_maps = meta.get("category_maps", {})
    cat_defaults = meta.get("category_defaults", {})

    files = sorted(TEST_DIR.glob("*.parquet"))
    dfs = [pl.read_parquet(f) for f in files]
    df_cal = pl.concat(dfs, how="diagonal").head(100_000)

    X = df_cal.select([c for c in feature_cols if c in df_cal.columns]).to_pandas()
    for col, code_map in cat_maps.items():
        if col not in X.columns:
            continue
        nc = cat_defaults.get(col, len(code_map))
        X[col] = (
            X[col]
            .map(lambda v, cm=code_map, nc=nc: cm.get(str(v), nc) if v is not None and str(v) != "nan" else nc)
            .astype("int32")
        )
    for col in feature_cols:
        if col not in X.columns:
            X[col] = np.nan

    preds = booster.predict(X[feature_cols])
    y_cal = df_cal[TARGET_COL].cast(pl.Float32).to_numpy()

    # 6 grade *boundaries* between 7 grades (G/F, F/E, E/D, D/C, C/B, B/A).
    # Excludes the G minimum (1) which is not a boundary.
    orig = [21.0, 39.0, 55.0, 69.0, 81.0, 92.0]
    orig_grades = np.array([score_to_grade(s) for s in y_cal])

    def neg_accuracy(thresholds):
        t = sorted(thresholds)
        pred_grades = np.array([score_to_grade_thresh(p, t) for p in preds])
        return -np.mean(pred_grades == orig_grades)

    result = minimize(neg_accuracy, orig, method="Nelder-Mead",
                      options={"maxiter": 20_000, "xatol": 0.05, "fatol": 1e-4})
    calibrated = sorted(result.x.tolist())
    log.info("Calibrated thresholds: %s  (accuracy %.4f → %.4f)",
             [round(t, 1) for t in calibrated],
             -neg_accuracy(orig), -result.fun)
    return calibrated


def score_to_grade_thresh(score: float, thresholds: list[float]) -> str:
    labels = list("GFEDCBA")
    for i, t in enumerate(sorted(thresholds)):
        if score < t:
            return labels[i]
    return "A"


def run(do_search: bool = False, do_full: bool = True) -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    if not META_PATH.exists():
        raise FileNotFoundError(f"Feature metadata not found: {META_PATH}. Run loader.py first.")

    from src.pipeline.features import CATEGORICAL_COLS, NUMERIC_COLS, ENERGY_EFF_COLS, FLAG_COLS

    meta = load_feature_meta(META_PATH)

    # Rebuild feature_columns from the current (possibly trimmed) column lists so that
    # any assessor-only columns removed from features.py are dropped before training.
    wanted = set(ENERGY_EFF_COLS + FLAG_COLS + NUMERIC_COLS + CATEGORICAL_COLS)
    meta["feature_columns"] = [c for c in meta["feature_columns"] if c in wanted]
    meta["categorical_cols"] = [c for c in CATEGORICAL_COLS if c in meta["feature_columns"]]

    log.info("Loading training data (%d features)...", len(meta["feature_columns"]))
    X, y = load_parquet_dir(TRAIN_DIR, meta, update_cat_maps=True)

    # Persist category maps so predict.py and evaluate.py can recode at inference time.
    import json as _json
    META_PATH.write_text(_json.dumps(meta, indent=2))

    params = DEFAULT_PARAMS.copy()

    if do_search:
        # Sample for hyperparameter search
        if len(y) > SAMPLE_ROWS:
            log.info("Sampling %d rows for Optuna search...", SAMPLE_ROWS)
            grade_bins = np.digitize(y, bins=[21, 39, 55, 69, 81, 92])
            # Stratified sample
            from sklearn.model_selection import StratifiedShuffleSplit
            sss = StratifiedShuffleSplit(n_splits=1, train_size=SAMPLE_ROWS, random_state=42)
            sample_idx, _ = next(sss.split(X, grade_bins))
            X_sample = X.iloc[sample_idx]
            y_sample = y[sample_idx]
        else:
            X_sample, y_sample = X, y

        log.info("Running Optuna search (%d trials)...", N_OPTUNA_TRIALS)
        params = optuna_search(X_sample, y_sample, meta)

    if do_full:
        log.info("Training final model on %d rows...", len(y))
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        booster = train_full(X, y, meta, params)
        booster.save_model(str(MODEL_PATH))
        log.info("Model saved to %s", MODEL_PATH)

        log.info("Calibrating grade thresholds on test sample...")
        calibrated = _calibrate_thresholds(booster, meta)
        meta["calibrated_thresholds"] = calibrated
        META_PATH.write_text(_json.dumps(meta, indent=2))
        log.info("Calibrated thresholds saved to %s", META_PATH)

    log.info("Done.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--search", action="store_true", help="Run Optuna hyperparameter search")
    parser.add_argument("--full", action="store_true", help="Train on full dataset")
    args = parser.parse_args()

    if not args.search and not args.full:
        args.full = True  # default: just train with defaults

    run(do_search=args.search, do_full=args.full or args.search)
