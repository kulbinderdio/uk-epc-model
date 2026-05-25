"""
Model evaluation: MAE, grade accuracy, confusion matrix, SHAP plots.

Run:
    python -m src.model.evaluate
"""

from __future__ import annotations

import logging
from pathlib import Path

import lightgbm as lgb
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap
from sklearn.metrics import confusion_matrix, mean_absolute_error

from src.model.predict import _encode_input, load_model
from src.pipeline.features import SAP_THRESHOLDS, TARGET_COL, load_feature_meta, score_to_grade

log = logging.getLogger(__name__)

TEST_DIR = Path("data/processed/test")
MODEL_PATH = Path("data/models/lgbm_epc.txt")
META_PATH = Path("data/models/feature_meta.json")
REPORT_DIR = Path("data/models/eval")

GRADES = ["A", "B", "C", "D", "E", "F", "G"]


def _grade_accuracy(
    y_true: np.ndarray, y_pred: np.ndarray, thresholds: list | None = None
) -> tuple[float, float]:
    """Return (exact_accuracy, within_1_band_accuracy)."""
    def to_grade(s: float) -> str:
        if thresholds:
            labels = list("GFEDCBA")
            for i, t in enumerate(sorted(thresholds)):
                if s < t:
                    return labels[i]
            return "A"
        return score_to_grade(s)

    true_grades = np.array([score_to_grade(s) for s in y_true])
    pred_grades = np.array([to_grade(s) for s in y_pred])
    exact = np.mean(true_grades == pred_grades)
    grade_idx = {g: i for i, g in enumerate(GRADES)}
    within_1 = np.mean(
        np.abs(
            np.array([grade_idx[g] for g in true_grades])
            - np.array([grade_idx[g] for g in pred_grades])
        ) <= 1
    )
    return float(exact), float(within_1)


def evaluate(
    booster: lgb.Booster,
    meta: dict,
    test_dir: Path = TEST_DIR,
    report_dir: Path = REPORT_DIR,
) -> dict:
    """Run full evaluation on the test split. Returns metrics dict."""
    import polars as pl

    report_dir.mkdir(parents=True, exist_ok=True)
    files = sorted(test_dir.glob("*.parquet"))
    if not files:
        raise FileNotFoundError(f"No test Parquet files in {test_dir}")

    feature_cols = meta["feature_columns"]
    dfs = [pl.read_parquet(f) for f in files]
    df = pl.concat(dfs, how="diagonal")

    X = df.select([c for c in feature_cols if c in df.columns]).to_pandas()
    cat_maps: dict = meta.get("category_maps", {})
    cat_defaults: dict = meta.get("category_defaults", {})
    for col, code_map in cat_maps.items():
        if col not in X.columns:
            continue
        null_code = cat_defaults.get(col, len(code_map))
        X[col] = (
            X[col]
            .map(lambda v, cm=code_map, nc=null_code: cm.get(str(v), nc) if v is not None and str(v) != "nan" else nc)
            .astype("int32")
        )
    y_true = df[TARGET_COL].cast(pl.Float32).to_numpy()

    y_pred = booster.predict(X).astype(np.float32)
    y_pred = np.clip(y_pred, 1.0, 100.0)

    mae = mean_absolute_error(y_true, y_pred)
    exact_acc, within1_acc = _grade_accuracy(y_true, y_pred)
    calibrated = meta.get("calibrated_thresholds")
    cal_acc, cal_within1 = _grade_accuracy(y_true, y_pred, calibrated) if calibrated else (exact_acc, within1_acc)

    log.info("MAE: %.4f", mae)
    log.info("Exact grade accuracy (raw):        %.4f", exact_acc)
    if calibrated:
        log.info("Exact grade accuracy (calibrated): %.4f  (+%.4f)", cal_acc, cal_acc - exact_acc)
    log.info("Within-1-band accuracy: %.4f", within1_acc)

    # Confusion matrix — use calibrated grades for output
    def grade_fn(s):
        if calibrated:
            labels = list("GFEDCBA")
            for i, t in enumerate(sorted(calibrated)):
                if s < t:
                    return labels[i]
            return "A"
        return score_to_grade(s)

    true_grades = [score_to_grade(s) for s in y_true]
    pred_grades = [grade_fn(s) for s in y_pred]
    cm = confusion_matrix(true_grades, pred_grades, labels=GRADES)
    _plot_confusion_matrix(cm, report_dir / "confusion_matrix.png")

    # Per-property-type breakdown
    prop_type_col = "property_type"
    if prop_type_col in df.columns:
        pt_metrics = _per_property_type(df, y_true, y_pred, feature_cols, prop_type_col)
        for pt, m in pt_metrics.items():
            log.info("  %-15s  MAE=%.3f  exact_acc=%.3f", pt, m["mae"], m["exact_acc"])
    else:
        pt_metrics = {}

    metrics = {
        "mae": round(mae, 4),
        "exact_grade_accuracy": round(exact_acc, 4),
        "exact_grade_accuracy_calibrated": round(cal_acc, 4),
        "within_1_band_accuracy": round(within1_acc, 4),
        "n_test": int(len(y_true)),
        "per_property_type": pt_metrics,
    }

    # SHAP summary (sample for speed) — done after metrics so results aren't blocked
    n_shap = min(2000, len(X))
    X_shap = X.sample(n=n_shap, random_state=42).copy()
    _plot_shap(booster, X_shap, feature_cols, report_dir / "shap_summary.png")

    return metrics


def _per_property_type(df, y_true, y_pred, feature_cols, col) -> dict:
    import polars as pl
    results = {}
    for pt in df[col].drop_nulls().unique().to_list():
        mask = (df[col].cast(pl.Utf8) == str(pt)).to_numpy().astype(bool)
        if mask.sum() < 100:
            continue
        mae = mean_absolute_error(y_true[mask], y_pred[mask])
        exact, _ = _grade_accuracy(y_true[mask], y_pred[mask])
        results[str(pt)] = {"mae": round(mae, 4), "exact_acc": round(exact, 4)}
    return results


def _plot_confusion_matrix(cm: np.ndarray, out: Path) -> None:
    import seaborn as sns
    fig, ax = plt.subplots(figsize=(8, 7))
    sns.heatmap(
        cm, annot=True, fmt="d", xticklabels=GRADES, yticklabels=GRADES,
        cmap="Blues", ax=ax,
    )
    ax.set_xlabel("Predicted")
    ax.set_ylabel("True")
    ax.set_title("EPC Grade Confusion Matrix")
    fig.tight_layout()
    fig.savefig(out, dpi=150)
    plt.close(fig)
    log.info("Confusion matrix saved to %s", out)


def _plot_shap(booster: lgb.Booster, X: pd.DataFrame, feature_cols: list[str], out: Path) -> None:
    try:
        explainer = shap.TreeExplainer(booster)
        shap_values = explainer.shap_values(X)
        fig, ax = plt.subplots(figsize=(10, 8))
        shap.summary_plot(shap_values, X, feature_names=feature_cols, show=False, max_display=20)
        fig.savefig(out, dpi=150, bbox_inches="tight")
        plt.close(fig)
        log.info("SHAP summary saved to %s", out)
    except Exception as e:
        log.warning("SHAP plot failed: %s", e)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    booster = lgb.Booster(model_file=str(MODEL_PATH))
    meta = load_feature_meta(META_PATH)
    metrics = evaluate(booster, meta)
    import json
    report_path = REPORT_DIR / "metrics.json"
    report_path.write_text(json.dumps(metrics, indent=2))
    log.info("Metrics written to %s", report_path)
