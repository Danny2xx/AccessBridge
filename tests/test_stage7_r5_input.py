"""Tests for the Stage 7 `--r5-input` merge path.

The R5 merge is the documented upgrade route from the proxy-derived matrix to a
real walk-plus-transit matrix, so it is covered here even though it lives in a
script rather than the `app` package.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from typing import Any

import pandas as pd
import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = PROJECT_ROOT / "scripts" / "build_stage7_travel_time_matrix.py"


def load_build_module() -> Any:
    """Import the Stage 7 build script by path, since scripts/ is not a package."""

    spec = importlib.util.spec_from_file_location("build_stage7", SCRIPT_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules["build_stage7"] = module
    spec.loader.exec_module(module)
    return module


build_stage7 = load_build_module()


@pytest.fixture()
def proxy_matrix_path(tmp_path: Path) -> Path:
    frame = pd.DataFrame(
        {
            "origin_id": ["E01000001", "E01000001", "E01000002", "E01000002"],
            "origin_name": ["A", "A", "B", "B"],
            "origin_imd_decile": [1, 1, 4, 4],
            "origin_population_mid_2024": [1000, 1000, 2000, 2000],
            "candidate_id": ["cand_a", "cand_b", "cand_a", "cand_b"],
            "name": ["Stop A", "Stop B", "Stop A", "Stop B"],
            "mode_hint": ["bus", "rail", "bus", "rail"],
            "is_interchange": [False, True, False, True],
            "cost_gbp": [75_000, 150_000, 75_000, 150_000],
            "walk_time_min": [4.0, 22.0, 30.0, 9.0],
            "within_5_min": [True, False, False, False],
            "within_10_min": [True, False, False, True],
            "within_15_min": [True, False, False, True],
        }
    )
    path = tmp_path / "proxy.csv"
    frame.to_csv(path, index=False)
    return path


def write_r5(tmp_path: Path, frame: pd.DataFrame) -> Path:
    path = tmp_path / "r5.csv"
    frame.to_csv(path, index=False)
    return path


def full_r5_frame(travel_times: list[float]) -> pd.DataFrame:
    return pd.DataFrame(
        {
            "origin_id": ["E01000001", "E01000001", "E01000002", "E01000002"],
            "candidate_id": ["cand_a", "cand_b", "cand_a", "cand_b"],
            "travel_time_min": travel_times,
        }
    )


def test_r5_times_replace_the_walk_proxy(proxy_matrix_path: Path, tmp_path: Path) -> None:
    r5_path = write_r5(tmp_path, full_r5_frame([4.0, 8.0, 12.0, 9.0]))

    merged = build_stage7.r5_merged_matrix(
        proxy_matrix_path=proxy_matrix_path,
        r5_input_path=r5_path,
        routing_source="r5",
        routing_profile="walk_transit",
    )

    assert merged["travel_time_min"].tolist() == [4.0, 8.0, 12.0, 9.0]
    # The 22-minute walk becomes an 8-minute transit trip, so reachability flips.
    assert merged["within_10_min"].tolist() == [True, True, False, True]
    assert merged["routing_source"].unique().tolist() == ["r5"]
    assert merged["routing_profile"].unique().tolist() == ["walk_transit"]


def test_r5_merge_keeps_origin_and_candidate_attributes(
    proxy_matrix_path: Path, tmp_path: Path
) -> None:
    r5_path = write_r5(tmp_path, full_r5_frame([1.0, 2.0, 3.0, 4.0]))

    merged = build_stage7.r5_merged_matrix(
        proxy_matrix_path=proxy_matrix_path,
        r5_input_path=r5_path,
        routing_source="r5",
        routing_profile="walk_transit",
    )

    for column in (
        "origin_imd_decile",
        "origin_population_mid_2024",
        "is_interchange",
        "cost_gbp",
    ):
        assert column in merged.columns
    assert len(merged) == 4
    assert merged["cost_gbp"].tolist() == [75_000, 150_000, 75_000, 150_000]


def test_r5_merge_rejects_missing_columns(proxy_matrix_path: Path, tmp_path: Path) -> None:
    r5_path = write_r5(
        tmp_path,
        pd.DataFrame({"origin_id": ["E01000001"], "travel_time_min": [5.0]}),
    )

    with pytest.raises(ValueError, match="missing required columns"):
        build_stage7.r5_merged_matrix(
            proxy_matrix_path=proxy_matrix_path,
            r5_input_path=r5_path,
            routing_source="r5",
            routing_profile="walk_transit",
        )


def test_r5_merge_rejects_duplicate_pairs(proxy_matrix_path: Path, tmp_path: Path) -> None:
    duplicated = full_r5_frame([4.0, 8.0, 12.0, 9.0])
    duplicated = pd.concat([duplicated, duplicated.iloc[[0]]], ignore_index=True)
    r5_path = write_r5(tmp_path, duplicated)

    with pytest.raises(ValueError, match="duplicate"):
        build_stage7.r5_merged_matrix(
            proxy_matrix_path=proxy_matrix_path,
            r5_input_path=r5_path,
            routing_source="r5",
            routing_profile="walk_transit",
        )


def test_r5_merge_rejects_incomplete_coverage(proxy_matrix_path: Path, tmp_path: Path) -> None:
    partial = full_r5_frame([4.0, 8.0, 12.0, 9.0]).iloc[:2]
    r5_path = write_r5(tmp_path, partial)

    with pytest.raises(ValueError, match="missing 2 origin-candidate travel times"):
        build_stage7.r5_merged_matrix(
            proxy_matrix_path=proxy_matrix_path,
            r5_input_path=r5_path,
            routing_source="r5",
            routing_profile="walk_transit",
        )


def test_r5_merge_rejects_negative_travel_times(proxy_matrix_path: Path, tmp_path: Path) -> None:
    r5_path = write_r5(tmp_path, full_r5_frame([4.0, -1.0, 12.0, 9.0]))

    with pytest.raises(ValueError, match="non-negative"):
        build_stage7.r5_merged_matrix(
            proxy_matrix_path=proxy_matrix_path,
            r5_input_path=r5_path,
            routing_source="r5",
            routing_profile="walk_transit",
        )


def test_r5_merge_requires_the_input_file(proxy_matrix_path: Path, tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError):
        build_stage7.r5_merged_matrix(
            proxy_matrix_path=proxy_matrix_path,
            r5_input_path=tmp_path / "does_not_exist.csv",
            routing_source="r5",
            routing_profile="walk_transit",
        )


def test_proxy_derived_matrix_uses_walk_times(proxy_matrix_path: Path) -> None:
    matrix = build_stage7.proxy_derived_matrix(proxy_matrix_path)

    assert matrix["travel_time_min"].tolist() == [4.0, 22.0, 30.0, 9.0]
    assert matrix["routing_source"].unique().tolist() == ["stage0_proxy_derived"]
    assert matrix["routing_profile"].unique().tolist() == ["walk_proxy"]
