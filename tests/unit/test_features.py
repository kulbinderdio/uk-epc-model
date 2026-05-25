"""Unit tests for feature engineering."""

import polars as pl
import pytest

from src.pipeline.features import encode_features, score_to_grade


class TestScoreToGrade:
    @pytest.mark.parametrize("score,expected", [
        (100.0, "A"),
        (92.0, "A"),
        (91.9, "B"),
        (81.0, "B"),
        (80.9, "C"),
        (69.0, "C"),
        (68.9, "D"),
        (55.0, "D"),
        (54.9, "E"),
        (39.0, "E"),
        (38.9, "F"),
        (21.0, "F"),
        (20.9, "G"),
        (1.0, "G"),
    ])
    def test_boundary_values(self, score, expected):
        assert score_to_grade(score) == expected


class TestEncodeFeatures:
    def _sample_df(self) -> pl.DataFrame:
        return pl.DataFrame({
            "walls_energy_eff": ["Good", "Very Poor", None],
            "mains_gas_flag": ["Y", "N", None],
            "flat_top_storey": ["Y", None, "N"],
            "property_type": ["House", "Flat", "Bungalow"],
            "total_floor_area": [80.0, 55.0, None],
        })

    def test_energy_eff_ordinal_range(self):
        df = encode_features(self._sample_df())
        vals = df["walls_energy_eff"].to_list()
        assert vals[0] == 3   # Good → 3
        assert vals[1] == 0   # Very Poor → 0
        assert vals[2] == -1  # None → -1

    def test_flag_binary(self):
        df = encode_features(self._sample_df())
        vals = df["mains_gas_flag"].to_list()
        assert vals[0] == 1  # Y → 1
        assert vals[1] == 0  # N → 0
        assert vals[2] == 0  # None → 0

    def test_categorical_dtype(self):
        df = encode_features(self._sample_df())
        assert df["property_type"].dtype == pl.Categorical

    def test_numeric_cast(self):
        df = encode_features(self._sample_df())
        assert df["total_floor_area"].dtype == pl.Float32
