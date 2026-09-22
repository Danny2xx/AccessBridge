import pandas as pd

from app.optimisation import (
    deprivation_weight,
    optimise_from_stage0,
    optimise_from_travel_time,
    optimise_stop_selection,
)
from app.schemas import OptimisationRequest


def toy_matrix() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "origin_id": "lsoa_a",
                "origin_name": "A",
                "origin_imd_decile": 1,
                "origin_population_mid_2024": 1_000,
                "candidate_id": "hub",
                "name": "Interchange Hub",
                "mode_hint": "rail",
                "is_interchange": True,
                "cost_gbp": 100,
                "within_10_min": True,
            },
            {
                "origin_id": "lsoa_b",
                "origin_name": "B",
                "origin_imd_decile": 2,
                "origin_population_mid_2024": 800,
                "candidate_id": "hub",
                "name": "Interchange Hub",
                "mode_hint": "rail",
                "is_interchange": True,
                "cost_gbp": 100,
                "within_10_min": False,
            },
            {
                "origin_id": "lsoa_c",
                "origin_name": "C",
                "origin_imd_decile": 9,
                "origin_population_mid_2024": 300,
                "candidate_id": "hub",
                "name": "Interchange Hub",
                "mode_hint": "rail",
                "is_interchange": True,
                "cost_gbp": 100,
                "within_10_min": False,
            },
            {
                "origin_id": "lsoa_a",
                "origin_name": "A",
                "origin_imd_decile": 1,
                "origin_population_mid_2024": 1_000,
                "candidate_id": "stop_a",
                "name": "High Need Stop",
                "mode_hint": "bus",
                "is_interchange": False,
                "cost_gbp": 50,
                "within_10_min": True,
            },
            {
                "origin_id": "lsoa_b",
                "origin_name": "B",
                "origin_imd_decile": 2,
                "origin_population_mid_2024": 800,
                "candidate_id": "stop_a",
                "name": "High Need Stop",
                "mode_hint": "bus",
                "is_interchange": False,
                "cost_gbp": 50,
                "within_10_min": False,
            },
            {
                "origin_id": "lsoa_c",
                "origin_name": "C",
                "origin_imd_decile": 9,
                "origin_population_mid_2024": 300,
                "candidate_id": "stop_a",
                "name": "High Need Stop",
                "mode_hint": "bus",
                "is_interchange": False,
                "cost_gbp": 50,
                "within_10_min": False,
            },
            {
                "origin_id": "lsoa_a",
                "origin_name": "A",
                "origin_imd_decile": 1,
                "origin_population_mid_2024": 1_000,
                "candidate_id": "stop_b",
                "name": "Broad Stop",
                "mode_hint": "bus",
                "is_interchange": False,
                "cost_gbp": 50,
                "within_10_min": False,
            },
            {
                "origin_id": "lsoa_b",
                "origin_name": "B",
                "origin_imd_decile": 2,
                "origin_population_mid_2024": 800,
                "candidate_id": "stop_b",
                "name": "Broad Stop",
                "mode_hint": "bus",
                "is_interchange": False,
                "cost_gbp": 50,
                "within_10_min": True,
            },
            {
                "origin_id": "lsoa_c",
                "origin_name": "C",
                "origin_imd_decile": 9,
                "origin_population_mid_2024": 300,
                "candidate_id": "stop_b",
                "name": "Broad Stop",
                "mode_hint": "bus",
                "is_interchange": False,
                "cost_gbp": 50,
                "within_10_min": True,
            },
        ]
    )


def test_deprivation_weight() -> None:
    assert deprivation_weight(1) == 10
    assert deprivation_weight(10) == 1


def test_optimiser_respects_budget_max_stops_and_interchange() -> None:
    request = OptimisationRequest(
        budget_gbp=150,
        max_stops=2,
        threshold_min=10,
        require_interchange=True,
    )

    result = optimise_stop_selection(toy_matrix(), request)

    assert result.status == "optimal"
    assert result.feasible is True
    assert result.total_cost_gbp <= 150
    assert len(result.selected_stops) <= 2
    assert any(stop.is_interchange for stop in result.selected_stops)
    assert {stop.candidate_id for stop in result.selected_stops} == {"hub", "stop_b"}
    assert result.covered_origin_ids == ["lsoa_a", "lsoa_b", "lsoa_c"]


def test_optimiser_reports_infeasible_interchange_requirement() -> None:
    request = OptimisationRequest(
        budget_gbp=50,
        max_stops=1,
        threshold_min=10,
        require_interchange=True,
    )

    result = optimise_stop_selection(toy_matrix(), request)

    assert result.status == "infeasible"
    assert result.feasible is False
    assert result.selected_stops == []
    assert result.covered_origin_ids == []
    assert result.accessibility is None


def test_optimiser_prefers_equity_weighted_coverage() -> None:
    request = OptimisationRequest(
        budget_gbp=50,
        max_stops=1,
        threshold_min=10,
        require_interchange=False,
    )

    result = optimise_stop_selection(toy_matrix(), request)

    assert result.status == "optimal"
    assert [stop.candidate_id for stop in result.selected_stops] == ["stop_a"]
    assert result.covered_origin_ids == ["lsoa_a"]


def test_stage0_real_data_smoke_result_is_feasible() -> None:
    result = optimise_from_stage0(
        OptimisationRequest(budget_gbp=450_000, max_stops=3, threshold_min=10)
    )

    assert result.status == "optimal"
    assert result.feasible is True
    assert result.total_cost_gbp <= 450_000
    assert len(result.selected_stops) <= 3
    assert any(stop.is_interchange for stop in result.selected_stops)
    assert result.objective_value > 0
    assert result.accessibility is not None
    assert result.accessibility.scenario.total_population > 0


def test_stage7_travel_time_real_data_smoke_result_is_feasible() -> None:
    result = optimise_from_travel_time(
        OptimisationRequest(budget_gbp=600_000, max_stops=8, threshold_min=10)
    )

    assert result.status == "optimal"
    assert result.feasible is True
    assert result.total_cost_gbp <= 600_000
    assert len(result.selected_stops) <= 8
    assert result.accessibility is not None
    assert result.accessibility.method == "stage7_travel_time_matrix"
    assert result.accessibility.scenario.total_population > 0
