"""Feature engineering: encoding, imputation, and feature matrix construction."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import polars as pl

# SAP 2012 thresholds for converting numeric score → letter grade
SAP_THRESHOLDS: list[tuple[str, int]] = [
    ("A", 92),
    ("B", 81),
    ("C", 69),
    ("D", 55),
    ("E", 39),
    ("F", 21),
    ("G", 1),
]

# Ordinal mapping for energy efficiency descriptors
ENERGY_EFF_MAP: dict[str, int] = {
    "very good": 4,
    "good": 3,
    "average": 2,
    "poor": 1,
    "very poor": 0,
    "n/a": -1,
    "no data!": -1,
}

# Binary flag Y/N → 1/0
FLAG_COLS = [
    "mains_gas_flag",
    "solar_water_heating_flag",
    "flat_top_storey",
    "low_energy_lighting",
    "photo_supply",
]

# Component efficiency columns to ordinal-encode
ENERGY_EFF_COLS = [
    "walls_energy_eff",
    "roof_energy_eff",
    "floor_energy_eff",
    "windows_energy_eff",
    "mainheat_energy_eff",
    "mainheatc_energy_eff",
    "hot_water_energy_eff",
    "lighting_energy_eff",
    "sheating_energy_eff",
]

# Categorical columns to label-encode
# Excluded: transaction_type (assessor-only), region (ONS code unknown to user)
CATEGORICAL_COLS = [
    "property_type",
    "built_form",
    "tenure",
    "main_fuel",
    "energy_tariff",
    "glazed_type",
    "mechanical_ventilation",
    "mainheat_description",
    "hotwater_description",
    "walls_description",
    "roof_description",
    "floor_description",
    "windows_description",
    "secondheat_description",
    "mainheatcont_description",
    "heat_loss_corridor",
]

# Numeric columns to keep as-is
# Excluded: floor_height, fixed_lighting_outlets_count,
# low_energy_fixed_lighting_outlets_count, unheated_corridor_length
# — all assessor-measured; not available from user input
NUMERIC_COLS = [
    "total_floor_area",
    "number_habitable_rooms",
    "number_heated_rooms",
    "floor_level",
    "flat_storey_count",
    "multi_glaze_proportion",
    "extension_count",
    "number_open_fireplaces",
    "wind_turbine_count",
    "construction_age_band",
]

TARGET_COL = "current_energy_efficiency"


def score_to_grade(score: float) -> str:
    """Convert numeric SAP score to A–G letter grade."""
    for grade, threshold in SAP_THRESHOLDS:
        if score >= threshold:
            return grade
    return "G"


def build_feature_columns(available: list[str]) -> list[str]:
    """Return the ordered list of feature columns present in the dataset."""
    wanted = (
        ENERGY_EFF_COLS
        + FLAG_COLS
        + NUMERIC_COLS
        + CATEGORICAL_COLS
    )
    return [c for c in wanted if c in available]


def encode_features(df: pl.DataFrame) -> pl.DataFrame:
    """
    Apply all feature encodings in-place:
    - Ordinal encode energy efficiency columns
    - Binary encode Y/N flags
    - Cast categoricals to Categorical dtype (LightGBM handles them directly)
    - Cast numerics to Float32
    """
    exprs: list[pl.Expr] = []

    for col in ENERGY_EFF_COLS:
        if col in df.columns:
            exprs.append(
                df[col]
                .cast(pl.Utf8)
                .str.to_lowercase()
                .map_elements(lambda v: ENERGY_EFF_MAP.get(v, -1) if v else -1, return_dtype=pl.Int8, skip_nulls=False)
                .alias(col)
            )

    for col in FLAG_COLS:
        if col in df.columns:
            exprs.append(
                pl.when(df[col].cast(pl.Utf8).str.to_uppercase() == "Y")
                .then(pl.lit(1, dtype=pl.Int8))
                .otherwise(pl.lit(0, dtype=pl.Int8))
                .alias(col)
            )

    for col in CATEGORICAL_COLS:
        if col in df.columns:
            exprs.append(df[col].cast(pl.Categorical).alias(col))

    for col in NUMERIC_COLS:
        if col in df.columns:
            exprs.append(df[col].cast(pl.Float32).alias(col))

    return df.with_columns(exprs) if exprs else df


def save_feature_meta(feature_cols: list[str], output_path: str | Path) -> None:
    """Persist feature column list + SAP thresholds to JSON for use at inference time."""
    meta: dict[str, Any] = {
        "feature_columns": feature_cols,
        "sap_thresholds": SAP_THRESHOLDS,
        "energy_eff_map": ENERGY_EFF_MAP,
        "target_col": TARGET_COL,
        "categorical_cols": [c for c in CATEGORICAL_COLS if c in feature_cols],
    }
    Path(output_path).write_text(json.dumps(meta, indent=2))


def load_feature_meta(path: str | Path) -> dict[str, Any]:
    """Load feature metadata JSON written by save_feature_meta."""
    return json.loads(Path(path).read_text())
