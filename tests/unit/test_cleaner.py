"""Unit tests for data cleaning functions."""

import polars as pl
import pytest

from src.pipeline.cleaner import clean_certificates, normalise_age_band


class TestNormaliseAgeBand:
    def test_exact_canonical_string(self):
        assert normalise_age_band("before 1900") == 0
        assert normalise_age_band("1950-1966") == 3
        assert normalise_age_band("2012 onwards") == 11

    def test_case_insensitive(self):
        assert normalise_age_band("BEFORE 1900") == 0
        assert normalise_age_band("Before 1900") == 0

    def test_scotland_variant(self):
        assert normalise_age_band("Scotland: before 1919") == 0
        assert normalise_age_band("England and Wales: 1900-1929") == 1

    def test_post_2012_aliases(self):
        assert normalise_age_band("post-2012") == 11
        assert normalise_age_band("new dwelling") == 11

    def test_raw_numeric_year(self):
        assert normalise_age_band("1955") == 3
        assert normalise_age_band("1975") == 4
        assert normalise_age_band("2015") == 11

    def test_garbage_returns_none(self):
        assert normalise_age_band("A") is None
        assert normalise_age_band("Not applicable") is None
        assert normalise_age_band("2200") is None

    def test_none_returns_none(self):
        assert normalise_age_band(None) is None

    def test_future_year_returns_none(self):
        # Years beyond 2100 should map to None
        assert normalise_age_band("2200") is None


class TestCleanCertificates:
    def _make_df(self, **kwargs) -> pl.DataFrame:
        defaults = {
            "construction_age_band": ["before 1900", "garbage"],
            "total_floor_area": [80.0, 5000.0],   # second will be clipped
            "number_habitable_rooms": [3.0, 50.0], # second will be clipped
            "mains_gas_flag": [None, "Y"],
            "solar_water_heating_flag": ["N", None],
            "floor_level": [None, 3.0],
            "flat_storey_count": [None, 8.0],
        }
        defaults.update(kwargs)
        return pl.DataFrame(defaults)

    def test_age_band_cleaned(self):
        df = self._make_df()
        out = clean_certificates(df)
        assert out["construction_age_band"][0] == 0   # "before 1900" → 0
        assert out["construction_age_band"][1] is None  # garbage → None

    def test_floor_area_clipped(self):
        df = self._make_df()
        out = clean_certificates(df)
        assert out["total_floor_area"][1] == 2000.0

    def test_habitable_rooms_clipped(self):
        df = self._make_df()
        out = clean_certificates(df)
        assert out["number_habitable_rooms"][1] == 30.0

    def test_structural_nulls_filled(self):
        df = self._make_df()
        out = clean_certificates(df)
        assert out["mains_gas_flag"][0] == "N"   # None → "N"
        assert out["solar_water_heating_flag"][1] == "N"  # None → "N"

    def test_flat_columns_filled(self):
        df = self._make_df()
        out = clean_certificates(df)
        assert out["floor_level"][0] == -1   # None → -1
        assert out["flat_storey_count"][0] == -1  # None → -1
        assert out["floor_level"][1] == 3.0      # unchanged
