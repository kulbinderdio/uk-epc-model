"""Data cleaning functions for EPC certificate data."""

from __future__ import annotations

import re

import polars as pl

# Official SAP/RdSAP construction age band mapping
# Maps any observed string → canonical integer code (0–12)
AGE_BAND_MAP: dict[str, int] = {
    "before 1900": 0,
    "england and wales: before 1900": 0,
    "scotland: before 1919": 0,
    "1900-1929": 1,
    "england and wales: 1900-1929": 1,
    "scotland: 1919-1929": 1,
    "1930-1949": 2,
    "england and wales: 1930-1949": 2,
    "scotland: 1930-1949": 2,
    "1950-1966": 3,
    "england and wales: 1950-1966": 3,
    "scotland: 1950-1964": 3,
    "1967-1975": 4,
    "england and wales: 1967-1975": 4,
    "scotland: 1965-1975": 4,
    "1976-1982": 5,
    "england and wales: 1976-1982": 5,
    "scotland: 1976-1983": 5,
    "1983-1990": 6,
    "england and wales: 1983-1990": 6,
    "scotland: 1984-1991": 6,
    "1991-1995": 7,
    "england and wales: 1991-1995": 7,
    "scotland: 1992-1998": 7,
    "1996-2002": 8,
    "england and wales: 1996-2002": 8,
    "scotland: 1999-2002": 8,
    "2003-2006": 9,
    "england and wales: 2003-2006": 9,
    "scotland: 2003-2007": 9,
    "2007-2011": 10,
    "england and wales: 2007-2011": 10,
    "scotland: 2008-2011": 10,
    "2012 onwards": 11,
    "england and wales: 2012 onwards": 11,
    "scotland: 2012 onwards": 11,
    "post-2012": 11,
    "2007 onwards": 11,
    "new dwelling": 11,
}

# Year ranges for mapping raw numeric years to age bands
_YEAR_BANDS: list[tuple[int, int, int]] = [
    (0, 1899, 0),
    (1900, 1929, 1),
    (1930, 1949, 2),
    (1950, 1966, 3),
    (1967, 1975, 4),
    (1976, 1982, 5),
    (1983, 1990, 6),
    (1991, 1995, 7),
    (1996, 2002, 8),
    (2003, 2006, 9),
    (2007, 2011, 10),
    (2012, 2100, 11),
]


def _year_to_band(year: int) -> int | None:
    for low, high, band in _YEAR_BANDS:
        if low <= year <= high:
            return band
    return None


def normalise_age_band(value: str | None) -> int | None:
    """Convert any construction_age_band string to integer code 0–11, or None."""
    if value is None:
        return None
    cleaned = str(value).strip().lower()
    if cleaned in AGE_BAND_MAP:
        return AGE_BAND_MAP[cleaned]
    # Try to extract a 4-digit year
    years = re.findall(r"\b(1[0-9]{3}|20[0-2][0-9])\b", cleaned)
    if years:
        year = int(years[0])
        return _year_to_band(year)
    return None


def clean_certificates(df: pl.DataFrame) -> pl.DataFrame:
    """Apply all cleaning transformations to a certificates DataFrame."""
    df = _fix_age_band(df)
    df = _fix_numeric_outliers(df)
    df = _fill_structural_nulls(df)
    df = _fill_flat_specific_cols(df)
    return df


def _fix_age_band(df: pl.DataFrame) -> pl.DataFrame:
    """Replace construction_age_band strings with integer codes."""
    if "construction_age_band" not in df.columns:
        return df

    # Build a mapping expression using pl.when chains
    # First, lowercase the column, then map via the dictionary
    mapped = (
        df["construction_age_band"]
        .cast(pl.Utf8)
        .map_elements(normalise_age_band, return_dtype=pl.Int8)
    )
    return df.with_columns(mapped.alias("construction_age_band"))


def _fix_numeric_outliers(df: pl.DataFrame) -> pl.DataFrame:
    """Clip numeric columns to valid physical ranges."""
    clips: list[tuple[str, float, float]] = [
        ("total_floor_area", 10.0, 2000.0),
        ("number_habitable_rooms", 1.0, 30.0),
        ("number_heated_rooms", 0.0, 30.0),
        ("floor_height", 1.5, 10.0),
        ("flat_storey_count", 1.0, 100.0),
        ("multi_glaze_proportion", 0.0, 100.0),
        ("extension_count", 0.0, 20.0),
        ("number_open_fireplaces", 0.0, 20.0),
        ("wind_turbine_count", 0.0, 10.0),
    ]
    exprs = []
    for col, lo, hi in clips:
        if col in df.columns:
            exprs.append(df[col].cast(pl.Float32).clip(lo, hi).alias(col))
    return df.with_columns(exprs) if exprs else df


def _fill_structural_nulls(df: pl.DataFrame) -> pl.DataFrame:
    """
    Nulls in flag columns are structural (feature absent, not missing data).
    Fill with 'N' so they encode as the negative class.
    """
    flag_cols = [
        "mains_gas_flag",
        "solar_water_heating_flag",
        "low_energy_lighting",
        "mechanical_ventilation",
        "photo_supply",
    ]
    exprs = []
    for col in flag_cols:
        if col in df.columns:
            exprs.append(df[col].fill_null("N").alias(col))
    return df.with_columns(exprs) if exprs else df


def _fill_flat_specific_cols(df: pl.DataFrame) -> pl.DataFrame:
    """
    Columns that only apply to flats: fill non-flat nulls with -1 so
    LightGBM can distinguish 'N/A' from a genuine zero value.
    """
    flat_cols = [
        "floor_level",
        "flat_storey_count",
        "heat_loss_corridor",
        "unheated_corridor_length",
    ]
    exprs = []
    for col in flat_cols:
        if col in df.columns:
            exprs.append(df[col].fill_null(-1).alias(col))
    return df.with_columns(exprs) if exprs else df
