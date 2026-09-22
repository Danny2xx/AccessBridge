import pandas as pd
import pytest

from app.accessibility.travel_time import (
    TRAVEL_TIME_ACCESSIBILITY_METHOD,
    compare_travel_time_accessibility,
    load_travel_time_matrix,
    prepare_travel_time_matrix,
    validate_travel_time_matrix,
    with_reachability_columns,
)


def toy_travel_time_matrix() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "origin_id": "lsoa_a",
                "origin_name": "A",
                "origin_imd_decile": 1,
                "origin_population_mid_2024": 900,
                "candidate_id": "hub",
                "is_interchange": True,
                "travel_time_min": 8.0,
                "routing_source": "unit_test",
                "routing_profile": "walk_transit",
            },
            {
                "origin_id": "lsoa_a",
                "origin_name": "A",
                "origin_imd_decile": 1,
                "origin_population_mid_2024": 900,
                "candidate_id": "stop",
                "is_interchange": False,
                "travel_time_min": 12.0,
                "routing_source": "unit_test",
                "routing_profile": "walk_transit",
            },
            {
                "origin_id": "lsoa_b",
                "origin_name": "B",
                "origin_imd_decile": 2,
                "origin_population_mid_2024": 700,
                "candidate_id": "hub",
                "is_interchange": True,
                "travel_time_min": 18.0,
                "routing_source": "unit_test",
                "routing_profile": "walk_transit",
            },
            {
                "origin_id": "lsoa_b",
                "origin_name": "B",
                "origin_imd_decile": 2,
                "origin_population_mid_2024": 700,
                "candidate_id": "stop",
                "is_interchange": False,
                "travel_time_min": 9.0,
                "routing_source": "unit_test",
                "routing_profile": "walk_transit",
            },
        ]
    )


def test_travel_time_matrix_validation_rejects_missing_columns() -> None:
    matrix = toy_travel_time_matrix().drop(columns=["travel_time_min"])

    with pytest.raises(ValueError, match="missing required columns"):
        validate_travel_time_matrix(matrix)


def test_travel_time_matrix_validation_rejects_negative_times() -> None:
    matrix = toy_travel_time_matrix()
    matrix.loc[0, "travel_time_min"] = -1

    with pytest.raises(ValueError, match="non-negative"):
        validate_travel_time_matrix(matrix)


def test_reachability_columns_are_derived_from_travel_time() -> None:
    prepared = with_reachability_columns(toy_travel_time_matrix(), thresholds_min=(10, 15))

    assert prepared.loc[0, "within_10_min"]
    assert not prepared.loc[1, "within_10_min"]
    assert prepared.loc[1, "within_15_min"]
    assert not prepared.loc[2, "within_15_min"]


def test_compare_travel_time_accessibility_returns_stage7_method() -> None:
    comparison = compare_travel_time_accessibility(
        toy_travel_time_matrix(),
        selected_candidate_ids={"stop"},
        threshold_min=10,
    )

    assert comparison.method == TRAVEL_TIME_ACCESSIBILITY_METHOD
    assert comparison.baseline.covered_origin_ids == ["lsoa_a"]
    assert comparison.scenario.covered_origin_ids == ["lsoa_b"]
    assert comparison.delta_most_deprived_decile_population == -900
    assert comparison.delta_bottom_three_deciles_population == -200


def test_prepare_travel_time_matrix_supports_non_default_threshold() -> None:
    prepared = prepare_travel_time_matrix(toy_travel_time_matrix(), threshold_min=12)

    assert "within_12_min" in prepared.columns
    assert prepared.loc[1, "within_12_min"]


def test_stage7_real_data_matrix_matches_proxy_shape() -> None:
    matrix = load_travel_time_matrix()

    assert len(matrix) == 144_072
    assert matrix["origin_id"].nunique() == 174
    assert matrix["candidate_id"].nunique() == 828
    assert {"travel_time_min", "routing_source", "routing_profile"}.issubset(matrix.columns)
