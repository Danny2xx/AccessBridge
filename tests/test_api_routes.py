from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_scenario_endpoint_returns_geojson_and_baseline() -> None:
    response = client.get("/scenario")

    assert response.status_code == 200
    body = response.json()
    assert body["lsoa_geojson"]["type"] == "FeatureCollection"
    assert body["candidate_stops_geojson"]["type"] == "FeatureCollection"
    assert len(body["lsoa_geojson"]["features"]) == 174
    assert len(body["candidate_stops_geojson"]["features"]) == 828
    # The exact baseline population belongs to whichever travel-time matrix is
    # active, so assert the invariants here and pin the proxy figures in
    # tests/test_accessibility_proxy.py. That keeps this test passing when a real
    # R5 matrix replaces the proxy-derived artifact.
    baseline = body["baseline"]
    assert baseline["threshold_min"] == 10
    assert len(baseline["population_by_decile"]) == 10
    assert baseline["most_deprived_decile_population"] > 0
    assert (
        baseline["most_deprived_decile_population"]
        <= baseline["bottom_three_deciles_population"]
        <= baseline["total_population"]
    )
    assert body["method"] == "stage7_travel_time_matrix"
    assert body["method_caveat"]
    assert body["default_request"]["budget_gbp"] == 600_000
    assert body["default_request"]["max_stops"] == 8


def test_optimise_endpoint_returns_selected_stops_and_route_geometry() -> None:
    response = client.post(
        "/optimise",
        json={
            "budget_gbp": 600_000,
            "max_stops": 8,
            "threshold_min": 10,
            "require_interchange": True,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "optimal"
    assert body["feasible"] is True
    assert body["total_cost_gbp"] <= 600_000
    assert len(body["selected_stops"]) <= 8
    assert any(stop["is_interchange"] for stop in body["selected_stops"])
    assert body["route_geojson"]["type"] == "FeatureCollection"
    assert body["accessibility"]["scenario"]["total_population"] > 0
