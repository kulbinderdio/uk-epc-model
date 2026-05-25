"""
Inference pipeline: load model + metadata, run prediction, convert score to grade.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import lightgbm as lgb
import numpy as np
import pandas as pd

from src.pipeline.cleaner import normalise_age_band
from src.pipeline.features import (
    ENERGY_EFF_MAP,
    FLAG_COLS,
    SAP_THRESHOLDS,
    load_feature_meta,
    score_to_grade,
)

MODEL_PATH = Path("data/models/lgbm_epc.txt")
META_PATH = Path("data/models/feature_meta.json")

_booster: lgb.Booster | None = None
_meta: dict | None = None


def load_model(model_path: str | Path = MODEL_PATH, meta_path: str | Path = META_PATH) -> None:
    """Load model and feature metadata into module-level cache."""
    global _booster, _meta
    _booster = lgb.Booster(model_file=str(model_path))
    _meta = load_feature_meta(meta_path)


def _get_model_and_meta() -> tuple[lgb.Booster, dict]:
    global _booster, _meta
    if _booster is None or _meta is None:
        load_model()
    return _booster, _meta  # type: ignore[return-value]


def _encode_input(raw: dict[str, Any], meta: dict) -> pd.DataFrame:
    """
    Convert a raw user-input dict to a one-row DataFrame matching training features.
    Handles encoding exactly as in features.py.
    """
    feature_cols: list[str] = meta["feature_columns"]
    cat_cols: set[str] = set(meta.get("categorical_cols", []))
    energy_eff_map: dict[str, int] = meta.get("energy_eff_map", ENERGY_EFF_MAP)

    row: dict[str, Any] = {}
    for col in feature_cols:
        val = raw.get(col)

        if col in {c for c in feature_cols if c.endswith("_energy_eff")}:
            if val is None:
                row[col] = -1
            else:
                row[col] = energy_eff_map.get(str(val).lower(), -1)

        elif col in FLAG_COLS:
            if val is None:
                row[col] = 0
            else:
                row[col] = 1 if str(val).upper() == "Y" else 0

        elif col in cat_cols:
            code_map: dict[str, int] = meta.get("category_maps", {}).get(col, {})
            # Use training-set mode as fallback for unknown/missing values so the model
            # receives a code it saw during training rather than an out-of-range sentinel.
            default_code: int = meta.get("category_defaults", {}).get(col, len(code_map))
            val_str = str(val) if val is not None else None
            row[col] = code_map.get(val_str, default_code) if val_str is not None else default_code

        else:
            # Numeric — construction_age_band arrives as a string band label from the form
            if col == "construction_age_band":
                row[col] = normalise_age_band(val)
            else:
                try:
                    row[col] = float(val) if val is not None else np.nan
                except (ValueError, TypeError):
                    row[col] = np.nan

    return pd.DataFrame([row], columns=feature_cols)


def predict(raw: dict[str, Any]) -> dict[str, Any]:
    """
    Predict EPC rating from a raw property input dict.

    Returns:
        {
            "efficiency_score": float,      # SAP score 1–100
            "letter_grade": str,            # A–G
            "score_low": float,             # approximate 90% interval low
            "score_high": float,            # approximate 90% interval high
            "grade_low": str,
            "grade_high": str,
        }
    """
    booster, meta = _get_model_and_meta()
    df = _encode_input(raw, meta)

    score = float(booster.predict(df)[0])
    score_clipped = float(np.clip(score, 1.0, 100.0))

    calibrated = meta.get("calibrated_thresholds")

    def grade(s: float) -> str:
        if calibrated:
            labels = list("GFEDCBA")
            for i, t in enumerate(sorted(calibrated)):
                if s < t:
                    return labels[i]
            return "A"
        return score_to_grade(s)

    margin = 5.0
    score_low = max(1.0, score_clipped - margin)
    score_high = min(100.0, score_clipped + margin)

    return {
        "efficiency_score": round(score_clipped, 1),
        "letter_grade": grade(score_clipped),
        "score_low": round(score_low, 1),
        "score_high": round(score_high, 1),
        "grade_low": grade(score_low),
        "grade_high": grade(score_high),
    }
