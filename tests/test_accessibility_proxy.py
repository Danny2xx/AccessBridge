import pandas as pd
import pytest

from app.accessibility import (
    baseline_interchange_covered_origins,
    compare_accessibility,
    compare_selected_candidates_from_stage0,
    covered_origins_for_candidates,
    origin_population_frame,
    population_by_decile,
)
from app.accessibility.proxy import threshold_column


def toy_matrix() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "origin_id": "lsoa_a",
                "origin_name": "A",
                "origin_imd_decile": 1,
                "origin_population_mid_2024": 900,
                "candidate_id": "stop_1",
                "is_interchange": True,
                "within_10_min": True,
                "within_15_min": True,
            },
            {
                "origin_id": "lsoa_a",
                "origin_name": "A",
                "origin_imd_decile": 1,
                "origin_population_mid_2024": 900,
                "candidate_id": "stop_2",
                "is_interchange": False,
                "within_10_min": False,
                "within_15_min": True,
            },
            {
                "origin_id": "lsoa_b",
                "origin_name": "B",
                "origin_imd_decile": 2,
                "origin_population_mid_2024": 700,
                "candidate_id": "stop_1",
                "is_interchange": True,
                "within_10_min": False,
                "within_15_min": True,
            },
            {
                "origin_id": "lsoa_b",
                "origin_name": "B",
                "origin_imd_decile": 2,
                "origin_population_mid_2024": 700,
                "candidate_id": "stop_2",
                "is_interchange": False,
                "within_10_min": True,
                "within_15_min": True,
            },
            {
                "origin_id": "lsoa_c",
                "origin_name": "C",
                "origin_imd_decile": 7,
                "origin_population_mid_2024": 500,
                "candidate_id": "stop_1",
                "is_interchange": True,
                "within_10_min": False,
                "within_15_min": False,
            },
            {
                "origin_id": "lsoa_c",
                "origin_name": "C",
                "origin_imd_decile": 7,
                "origin_population_mid_2024": 500,
                "candidate_id": "stop_2",
                "is_interchange": False,
                "within_10_min": True,
                "within_15_min": True,
            },
        ]
    )


def test_threshold_column_validation() -> None:
    matrix = toy_matrix()

    assert threshold_column(10, matrix) == "within_10_min"

    with pytest.raises(ValueError, match="threshold_min must be positive"):
        threshold_column(0, matrix)

    with pytest.raises(ValueError, match="Missing reachability column"):
        threshold_column(20, matrix)


def test_covered_origins_for_selected_candidates() -> None:
    matrix = toy_matrix()

    assert covered_origins_for_candidates(matrix, {"stop_2"}, 10) == {"lsoa_b", "lsoa_c"}
    assert covered_origins_for_candidates(matrix, set(), 10) == set()


def test_baseline_interchange_covered_origins() -> None:
    matrix = toy_matrix()

    assert baseline_interchange_covered_origins(matrix, 10) == {"lsoa_a"}
    assert baseline_interchange_covered_origins(matrix, 15) == {"lsoa_a", "lsoa_b"}


def test_population_by_decile_counts_each_origin_once() -> None:
    matrix = toy_matrix()
    origins = origin_population_frame(matrix)

    assert population_by_decile(origins, {"lsoa_a", "lsoa_b", "lsoa_c"}) == {
        1: 900,
        2: 700,
        7: 500,
    }


def test_compare_accessibility_returns_api_ready_deltas() -> None:
    comparison = compare_accessibility(toy_matrix(), {"stop_2"}, threshold_min=10)

    assert comparison.method == "stage0_proxy"
    assert comparison.selected_candidate_ids == ["stop_2"]
    assert comparison.baseline.covered_origin_ids == ["lsoa_a"]
    assert comparison.scenario.covered_origin_ids == ["lsoa_b", "lsoa_c"]
    assert comparison.baseline.most_deprived_decile_population == 900
    assert comparison.scenario.most_deprived_decile_population == 0
    assert comparison.delta_most_deprived_decile_population == -900
    assert comparison.delta_bottom_three_deciles_population == -200
    assert comparison.delta_total_population == 300
    assert comparison.decile_breakdown[0].imd_decile == 1
    assert comparison.decile_breakdown[0].delta_population == -900


def test_stage0_full_candidate_comparison_matches_existing_proxy_summary() -> None:
    matrix = pd.read_csv("data/processed/accessibility_proxy_matrix.csv")
    selected_candidate_ids = matrix["candidate_id"].unique().tolist()

    comparison = compare_selected_candidates_from_stage0(selected_candidate_ids, threshold_min=10)

    assert comparison.baseline.most_deprived_decile_population == 71_309
    assert comparison.scenario.most_deprived_decile_population == 250_646
    assert comparison.delta_most_deprived_decile_population == 179_337
    assert comparison.baseline.bottom_three_deciles_population == 96_296
    assert comparison.scenario.bottom_three_deciles_population == 305_799
    assert comparison.delta_bottom_three_deciles_population == 209_503
    assert comparison.baseline.total_population == 128_755
    assert comparison.scenario.total_population == 349_787
    assert comparison.delta_total_population == 221_032
