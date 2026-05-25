"""
DuckDB-based data loading: streams all certificate CSVs, cleans them,
encodes features, and exports to Parquet for downstream training.

Run as a script:
    python -m src.pipeline.loader [--dry-run] [--sample N]
"""

from __future__ import annotations

import argparse
import logging
import time
from pathlib import Path

import duckdb
import polars as pl

from src.pipeline.cleaner import clean_certificates
from src.pipeline.features import (
    TARGET_COL,
    build_feature_columns,
    encode_features,
    save_feature_meta,
)

log = logging.getLogger(__name__)

DATA_DIR = Path("domestic-csv")
OUT_DIR = Path("data/processed")
TRAIN_YEARS = range(2012, 2024)
TEST_YEARS = range(2024, 2027)

# Columns to drop before writing Parquet (identifiers, leakage, derived)
DROP_COLS = {
    "certificate_number",
    "address1", "address2", "address3", "address",
    "postcode", "posttown",
    "uprn", "uprn_source",
    "inspection_date", "lodgement_date", "lodgement_datetime",
    "constituency", "constituency_label",
    "local_authority", "local_authority_label",
    "country",
    "report_type",
    # Leakage: derived from physical inputs, not available at prediction time
    "energy_consumption_current", "energy_consumption_potential",
    "co2_emissions_current", "co2_emissions_potential",
    "co2_emiss_curr_per_floor_area",
    "environment_impact_current", "environment_impact_potential",
    "heating_cost_current", "heating_cost_potential",
    "lighting_cost_current", "lighting_cost_potential",
    "hot_water_cost_current", "hot_water_cost_potential",
    "potential_energy_efficiency", "potential_energy_rating",
    "current_energy_rating",  # fully determined by current_energy_efficiency
    "main_heating_controls",  # code-number, subsumed by mainheatcont_description
}


def _cert_glob(years: range) -> list[str]:
    return [str(DATA_DIR / f"certificates-{y}.csv") for y in years if (DATA_DIR / f"certificates-{y}.csv").exists()]


def load_year_polars(year: int, con: duckdb.DuckDBPyConnection) -> pl.DataFrame:
    """Load a single year's certificate CSV via DuckDB and return a Polars DataFrame."""
    path = DATA_DIR / f"certificates-{year}.csv"
    if not path.exists():
        log.warning("Missing: %s", path)
        return pl.DataFrame()

    result = con.execute(
        f"SELECT * FROM read_csv_auto('{path}', ignore_errors=true, all_varchar=true)"
    ).pl()
    log.info("Year %d: %d rows", year, len(result))
    return result


def process_split(years: range, con: duckdb.DuckDBPyConnection, out_path: Path, sample: int | None = None) -> list[str]:
    """
    Process all years for a split, clean + encode, write Parquet.
    Returns the list of feature columns used.
    """
    out_path.mkdir(parents=True, exist_ok=True)
    feature_cols: list[str] = []

    for year in years:
        t0 = time.perf_counter()
        df = load_year_polars(year, con)
        if df.is_empty():
            continue

        if sample:
            df = df.sample(min(sample, len(df)), seed=42)

        df = clean_certificates(df)
        df = encode_features(df)

        # Drop unused columns
        cols_to_drop = [c for c in DROP_COLS if c in df.columns]
        df = df.drop(cols_to_drop)

        # Ensure target column is present
        if TARGET_COL not in df.columns:
            log.error("Target column '%s' missing in year %d", TARGET_COL, year)
            continue

        # Cast target to Float32
        df = df.with_columns(df[TARGET_COL].cast(pl.Float32).alias(TARGET_COL))

        # Determine feature cols on first iteration
        if not feature_cols:
            feature_cols = build_feature_columns(df.columns)

        # Keep only feature cols + target
        keep = [c for c in feature_cols + [TARGET_COL] if c in df.columns]
        df = df.select(keep)

        out_file = out_path / f"certificates-{year}.parquet"
        df.write_parquet(out_file, compression="snappy")
        elapsed = time.perf_counter() - t0
        log.info("Written %s  (%d rows, %.1fs)", out_file, len(df), elapsed)

    return feature_cols


def run(dry_run: bool = False, sample: int | None = None) -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    con = duckdb.connect()

    log.info("Processing TRAIN split (years %d–%d)", TRAIN_YEARS.start, TRAIN_YEARS.stop - 1)
    feature_cols = process_split(TRAIN_YEARS, con, OUT_DIR / "train", sample=sample)

    log.info("Processing TEST split (years %d–%d)", TEST_YEARS.start, TEST_YEARS.stop - 1)
    process_split(TEST_YEARS, con, OUT_DIR / "test", sample=sample)

    if feature_cols:
        meta_path = Path("data/models/feature_meta.json")
        meta_path.parent.mkdir(parents=True, exist_ok=True)
        save_feature_meta(feature_cols, meta_path)
        log.info("Feature metadata saved to %s  (%d features)", meta_path, len(feature_cols))

    log.info("Done.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert EPC CSVs to Parquet")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--sample", type=int, default=None, help="Rows per year for testing pipeline")
    args = parser.parse_args()
    run(dry_run=args.dry_run, sample=args.sample)
