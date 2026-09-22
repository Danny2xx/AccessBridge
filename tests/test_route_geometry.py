"""Tests for the schematic route geometry built for the dashboard."""

from __future__ import annotations

import geopandas as gpd
import pytest
from shapely.geometry import Point

from app.api.routes import (
    haversine_metres,
    order_route_coordinates,
    selected_route_geojson,
)


def path_length_m(coordinates: list[tuple[float, float]]) -> float:
    return sum(
        haversine_metres(coordinates[index], coordinates[index + 1])
        for index in range(len(coordinates) - 1)
    )


def test_haversine_matches_known_distance() -> None:
    # Birmingham New Street to Five Ways is roughly 1.6 km apart.
    distance = haversine_metres((-1.8990, 52.4778), (-1.9150, 52.4747))
    assert 1_000 < distance < 2_000


def test_order_route_coordinates_keeps_short_paths_unchanged() -> None:
    coordinates = [(-1.90, 52.48), (-1.85, 52.49)]
    assert order_route_coordinates(coordinates) == coordinates


def test_order_route_coordinates_preserves_every_stop() -> None:
    coordinates = [
        (-1.915, 52.474),
        (-1.831, 52.487),
        (-1.845, 52.478),
        (-1.900, 52.504),
        (-1.924, 52.509),
        (-1.850, 52.491),
        (-1.839, 52.464),
    ]
    ordered = order_route_coordinates(coordinates)

    assert len(ordered) == len(coordinates)
    assert sorted(ordered) == sorted(coordinates)


def test_order_route_coordinates_is_shorter_than_arbitrary_order() -> None:
    # Candidate ids are content hashes, so the unordered input stands in for the
    # geographically arbitrary order the optimiser returns.
    coordinates = [
        (-1.915, 52.474),
        (-1.831, 52.487),
        (-1.845, 52.478),
        (-1.900, 52.504),
        (-1.924, 52.509),
        (-1.850, 52.491),
        (-1.839, 52.464),
    ]
    ordered = order_route_coordinates(coordinates)

    assert path_length_m(ordered) < path_length_m(coordinates) * 0.8


def test_order_route_coordinates_is_deterministic() -> None:
    coordinates = [
        (-1.915, 52.474),
        (-1.831, 52.487),
        (-1.845, 52.478),
        (-1.900, 52.504),
    ]
    assert order_route_coordinates(coordinates) == order_route_coordinates(coordinates)


@pytest.fixture()
def candidate_stops() -> gpd.GeoDataFrame:
    return gpd.GeoDataFrame(
        {
            "candidate_id": ["cand_a", "cand_b", "cand_c"],
            "geometry": [
                Point(-1.92, 52.51),
                Point(-1.84, 52.47),
                Point(-1.88, 52.49),
            ],
        },
        crs="EPSG:4326",
    )


def test_selected_route_geojson_returns_linestring_for_multiple_stops(
    candidate_stops: gpd.GeoDataFrame,
) -> None:
    feature_collection = selected_route_geojson(
        candidate_stops, ["cand_a", "cand_b", "cand_c"]
    )
    geometry = feature_collection["features"][0]["geometry"]

    assert geometry["type"] == "LineString"
    assert len(geometry["coordinates"]) == 3
    # The middle stop sits between the other two, so it must not be an endpoint.
    assert geometry["coordinates"][1] == [-1.88, 52.49]


def test_selected_route_geojson_handles_single_and_empty_selection(
    candidate_stops: gpd.GeoDataFrame,
) -> None:
    single = selected_route_geojson(candidate_stops, ["cand_a"])
    assert single["features"][0]["geometry"]["type"] == "MultiPoint"
    assert single["features"][0]["properties"]["selected_stop_count"] == 1

    empty = selected_route_geojson(candidate_stops, [])
    assert empty["features"][0]["geometry"]["coordinates"] == []
    assert empty["features"][0]["properties"]["selected_stop_count"] == 0
