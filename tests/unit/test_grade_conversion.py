"""Exhaustive tests for SAP grade conversion boundaries."""

import pytest

from src.pipeline.features import score_to_grade


def test_all_grades_reachable():
    """Every grade A–G must be reachable from some valid score."""
    grades = {score_to_grade(s) for s in [95, 85, 75, 60, 45, 30, 10]}
    assert grades == {"A", "B", "C", "D", "E", "F", "G"}


def test_monotone():
    """Higher score must never yield a lower-ranked grade."""
    grade_rank = {"A": 0, "B": 1, "C": 2, "D": 3, "E": 4, "F": 5, "G": 6}
    prev_rank = 0
    for score in range(100, 0, -1):
        rank = grade_rank[score_to_grade(float(score))]
        assert rank >= prev_rank, f"Non-monotone at score {score}"
        prev_rank = rank
