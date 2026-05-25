"""
Pre-compute and serve improvement recommendations.

Build phase (run once after Parquet is ready):
    python -m src.recommendations.lookup --build

Lookup at inference time:
    from src.recommendations.lookup import get_recommendations
    recs = get_recommendations("House", "Semi-Detached", "D")
"""

from __future__ import annotations

import argparse
import logging
import re
from pathlib import Path

import duckdb
import polars as pl

log = logging.getLogger(__name__)

DATA_DIR = Path("domestic-csv")
OUT_PATH = Path("data/processed/recommendations_lookup.parquet")

_lookup_df: pl.DataFrame | None = None


# ---------------------------------------------------------------------------
# Build phase
# ---------------------------------------------------------------------------

def _parse_cost_midpoint(cost_str: str | None) -> float | None:
    """Extract numeric midpoint from strings like '£2,200 - £3,000' or '£15'."""
    if not cost_str:
        return None
    numbers = re.findall(r"[\d,]+", cost_str.replace("£", ""))
    values = [float(n.replace(",", "")) for n in numbers if n.replace(",", "").isdigit() or n.replace(",", "").replace(".", "").isdigit()]
    if not values:
        return None
    return sum(values) / len(values)


def build_lookup(max_per_group: int = 10) -> None:
    """
    Join all recommendation CSVs with certificate CSVs via DuckDB,
    aggregate top improvements per (property_type, built_form, current_energy_rating),
    and write to Parquet.
    """
    con = duckdb.connect()

    # Check for available files
    cert_files = sorted(DATA_DIR.glob("certificates-*.csv"))
    rec_files = sorted(DATA_DIR.glob("recommendations-*.csv"))
    if not cert_files or not rec_files:
        raise FileNotFoundError(f"CSV files not found in {DATA_DIR}")

    log.info("Building recommendations lookup from %d cert + %d rec files...",
             len(cert_files), len(rec_files))

    # Register views
    con.execute(f"""
        CREATE VIEW certs AS
        SELECT certificate_number, property_type, built_form, current_energy_rating
        FROM read_csv_auto('{DATA_DIR}/certificates-*.csv',
            union_by_name=true, ignore_errors=true, all_varchar=true)
        WHERE current_energy_rating IS NOT NULL
          AND property_type IS NOT NULL
    """)

    con.execute(f"""
        CREATE VIEW recs AS
        SELECT certificate_number, improvement_id, improvement_summary_text, indicative_cost
        FROM read_csv_auto('{DATA_DIR}/recommendations-*.csv',
            union_by_name=true, ignore_errors=true)
        WHERE improvement_id IS NOT NULL
    """)

    # Join and aggregate: count frequency of each improvement per group
    result = con.execute("""
        SELECT
            c.property_type,
            c.built_form,
            c.current_energy_rating,
            r.improvement_id,
            ANY_VALUE(r.improvement_summary_text)  AS improvement_summary,
            COUNT(*)                                AS frequency,
            MEDIAN(TRY_CAST(
                REGEXP_REPLACE(REGEXP_REPLACE(r.indicative_cost, '[£,]', ''), '[^0-9.]', ' ')
                AS DOUBLE
            )) AS median_cost_estimate
        FROM recs r
        JOIN certs c ON r.certificate_number = c.certificate_number
        WHERE c.current_energy_rating IN ('A','B','C','D','E','F','G')
          AND c.property_type IS NOT NULL
          AND c.built_form IS NOT NULL
        GROUP BY
            c.property_type,
            c.built_form,
            c.current_energy_rating,
            r.improvement_id
        ORDER BY
            c.property_type,
            c.built_form,
            c.current_energy_rating,
            frequency DESC
    """).pl()

    log.info("Aggregated %d rows; ranking top %d per group...", len(result), max_per_group)

    # Keep top N improvements per group
    ranked = (
        result
        .with_columns(
            pl.col("frequency")
            .rank("ordinal", descending=True)
            .over(["property_type", "built_form", "current_energy_rating"])
            .alias("rank")
        )
        .filter(pl.col("rank") <= max_per_group)
        .drop("rank")
    )

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    ranked.write_parquet(OUT_PATH, compression="snappy")
    log.info("Recommendations lookup saved to %s  (%d rows)", OUT_PATH, len(ranked))


# ---------------------------------------------------------------------------
# Lookup phase
# ---------------------------------------------------------------------------

def _load_lookup() -> pl.DataFrame:
    global _lookup_df
    if _lookup_df is None:
        if not OUT_PATH.exists():
            raise FileNotFoundError(
                f"Recommendations lookup not found: {OUT_PATH}\n"
                "Run: python -m src.recommendations.lookup --build"
            )
        _lookup_df = pl.read_parquet(OUT_PATH)
    return _lookup_df


def get_recommendations(
    property_type: str,
    built_form: str,
    current_grade: str,
    max_results: int = 8,
) -> list[dict]:
    """
    Return ranked improvement recommendations for a property.

    Falls back to property_type-only matching if no exact match found.
    """
    df = _load_lookup()

    filtered = df.filter(
        (pl.col("property_type") == property_type)
        & (pl.col("built_form") == built_form)
        & (pl.col("current_energy_rating") == current_grade)
    ).sort("frequency", descending=True).head(max_results)

    if filtered.is_empty():
        # Fallback: match on property_type + grade only
        filtered = df.filter(
            (pl.col("property_type") == property_type)
            & (pl.col("current_energy_rating") == current_grade)
        ).sort("frequency", descending=True).head(max_results)

    if filtered.is_empty():
        # Fallback: grade only
        filtered = df.filter(
            pl.col("current_energy_rating") == current_grade
        ).sort("frequency", descending=True).head(max_results)

    return filtered.to_dicts()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--build", action="store_true")
    parser.add_argument("--max-per-group", type=int, default=10)
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    if args.build:
        build_lookup(max_per_group=args.max_per_group)
