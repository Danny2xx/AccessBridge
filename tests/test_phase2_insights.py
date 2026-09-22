"""Tests for place names, per-stop insight and the evidence payload."""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.evidence import BUDGET_SWEEP_GBP, WALK_TIME_SWEEP_MIN, get_evidence
from app.main import app
from app.places import PlaceNames, read_place_names

client = TestClient(app)
DEFAULT_REQUEST = {
    "budget_gbp": 600_000,
    "max_stops": 8,
    "threshold_min": 10,
    "require_interchange": True,
}
PROJECT_ROOT = Path(__file__).resolve().parents[1]


def load_script(name: str) -> Any:
    path = PROJECT_ROOT / "scripts" / f"{name}.py"
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def default_result() -> dict[str, Any]:
    response = client.post("/optimise", json=DEFAULT_REQUEST)
    assert response.status_code == 200
    body: dict[str, Any] = response.json()
    return body


def test_place_names_cover_every_neighbourhood_and_candidate() -> None:
    payload = json.loads(get_settings().place_names_path.read_text())
    scenario = client.get("/scenario").json()

    lsoa_codes = {f["properties"]["lsoa21cd"] for f in scenario["lsoa_geojson"]["features"]}
    candidate_ids = {
        f["properties"]["candidate_id"] for f in scenario["candidate_stops_geojson"]["features"]
    }
    assert lsoa_codes == set(payload["neighbourhoods"])
    assert candidate_ids == set(payload["candidates"])
    assert "Birmingham" not in set(payload["neighbourhoods"].values())


def test_place_name_helpers_break_ties_alphabetically() -> None:
    module = load_script("build_place_names")

    assert module.most_common(["Aston", "Nechells", "Nechells", "Aston"]) == "Aston"
    assert module.most_common([None, "", None]) is None
    assert module.clean_locality("Birmingham") == "Birmingham City Centre"
    assert module.clean_locality(float("nan")) is None


def test_missing_place_names_fall_back_to_official_names(tmp_path: Path) -> None:
    empty = PlaceNames()
    assert empty.neighbourhood("E01000001", "Birmingham 001A") == "Birmingham 001A"

    path = tmp_path / "places.json"
    path.write_text(json.dumps({"neighbourhoods": {"E1": "Aston"}, "candidates": {}}))
    names = read_place_names(path)
    assert names.neighbourhood("E1", "fallback") == "Aston"
    assert names.candidate("cand_x", "fallback") == "fallback"


def test_scenario_features_carry_place_names_and_bounds() -> None:
    scenario = client.get("/scenario").json()

    assert all(f["properties"]["place_name"] for f in scenario["lsoa_geojson"]["features"])
    assert all(
        f["properties"]["place_name"] for f in scenario["candidate_stops_geojson"]["features"]
    )
    min_lon, min_lat, max_lon, max_lat = scenario["study_area_bounds"]
    assert -2.1 < min_lon < max_lon < -1.7
    assert 52.3 < min_lat < max_lat < 52.7


def test_stop_details_match_selected_stops_in_route_order(
    default_result: dict[str, Any],
) -> None:
    details = default_result["stop_details"]
    route = default_result["route_geojson"]["features"][0]["geometry"]["coordinates"]

    assert {d["candidate_id"] for d in details} == {
        s["candidate_id"] for s in default_result["selected_stops"]
    }
    assert [[d["longitude"], d["latitude"]] for d in details] == route


def test_stop_detail_counts_are_consistent(default_result: dict[str, Any]) -> None:
    threshold = default_result["threshold_min"]
    for detail in default_result["stop_details"]:
        people = sum(n["population"] for n in detail["neighbourhoods"])
        assert detail["people_reached"] == people
        assert 0 <= detail["most_deprived_reached"] <= people
        assert 0 <= detail["newly_reached"] <= people
        assert 0 <= detail["only_this_stop"] <= people
        assert all(n["travel_time_min"] <= threshold for n in detail["neighbourhoods"])
        assert detail["place_name"]


def test_stop_details_add_up_to_the_scenario_total(default_result: dict[str, Any]) -> None:
    reached: dict[str, tuple[int, int]] = {}
    for detail in default_result["stop_details"]:
        for n in detail["neighbourhoods"]:
            reached[n["lsoa21cd"]] = (n["population"], n["imd_decile"])

    scenario = default_result["accessibility"]["scenario"]
    assert sum(pop for pop, _ in reached.values()) == scenario["total_population"]
    assert (
        sum(pop for pop, decile in reached.values() if decile == 1)
        == scenario["most_deprived_decile_population"]
    )


def test_infeasible_result_has_no_stop_details() -> None:
    response = client.post(
        "/optimise",
        json={**DEFAULT_REQUEST, "budget_gbp": 0},
    )

    body = response.json()
    assert body["status"] == "infeasible"
    assert body["stop_details"] == []


def test_evidence_payload_is_internally_consistent() -> None:
    body = client.get("/evidence").json()
    facts = body["study_area"]

    assert (
        facts["most_deprived_reached_today"] + facts["most_deprived_not_reached_today"]
        == facts["most_deprived_population"]
    )
    assert facts["most_deprived_population"] <= facts["bottom_three_population"]
    assert facts["bottom_three_population"] <= facts["population"]
    assert sum(facts["candidate_counts_by_mode"].values()) == facts["candidate_stop_count"]

    assert [p["value"] for p in body["budget_sensitivity"]] == list(BUDGET_SWEEP_GBP)
    assert [p["value"] for p in body["walk_time_sensitivity"]] == list(WALK_TIME_SWEEP_MIN)
    assert all(p["total_cost_gbp"] <= p["value"] for p in body["budget_sensitivity"])


def test_evidence_default_matches_the_optimise_endpoint(
    default_result: dict[str, Any],
) -> None:
    body = client.get("/evidence").json()
    evidence_default = body["default_result"]
    gain = evidence_default["accessibility"]["delta_most_deprived_decile_population"]

    assert evidence_default["selected_stops"] == default_result["selected_stops"]
    assert evidence_default["stop_details"] == default_result["stop_details"]
    assert body["cost_per_most_deprived_resident_gbp"] == pytest.approx(
        evidence_default["total_cost_gbp"] / gain, abs=0.01
    )
    default_point = next(
        p for p in body["budget_sensitivity"] if p["value"] == DEFAULT_REQUEST["budget_gbp"]
    )
    assert default_point["most_deprived_gain"] == gain


def test_evidence_is_cached_between_calls() -> None:
    assert get_evidence() is get_evidence()
