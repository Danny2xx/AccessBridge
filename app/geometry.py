"""Geometry helpers for the dashboard: GeoJSON conversion and route ordering."""

from __future__ import annotations

import json
import math
from collections.abc import Sequence
from typing import Any, cast

import geopandas as gpd

EARTH_RADIUS_M = 6_371_000.0
TWO_OPT_MAX_STOPS = 60

Coordinate = tuple[float, float]


def frame_to_geojson(frame: gpd.GeoDataFrame) -> dict[str, Any]:
    """Convert a GeoDataFrame to a JSON-serialisable GeoJSON mapping."""

    return cast(dict[str, Any], json.loads(frame.to_json()))


def haversine_metres(first: Coordinate, second: Coordinate) -> float:
    """Return the great-circle distance in metres between two lon/lat points."""

    longitude_1, latitude_1 = first
    longitude_2, latitude_2 = second
    phi_1 = math.radians(latitude_1)
    phi_2 = math.radians(latitude_2)
    delta_phi = math.radians(latitude_2 - latitude_1)
    delta_lambda = math.radians(longitude_2 - longitude_1)
    inner = (
        math.sin(delta_phi / 2) ** 2
        + math.cos(phi_1) * math.cos(phi_2) * math.sin(delta_lambda / 2) ** 2
    )
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(min(1.0, inner)))


def nearest_neighbour_order(coordinates: Sequence[Coordinate]) -> list[int]:
    """Return a nearest-neighbour visiting order starting from the western-most stop."""

    remaining = list(range(len(coordinates)))
    start = min(remaining, key=lambda index: coordinates[index])
    order = [start]
    remaining.remove(start)

    while remaining:
        last = coordinates[order[-1]]
        nearest = min(remaining, key=lambda index: haversine_metres(last, coordinates[index]))
        order.append(nearest)
        remaining.remove(nearest)

    return order


def two_opt_order(order: list[int], coordinates: Sequence[Coordinate]) -> list[int]:
    """Improve an open-path visiting order with 2-opt segment reversals."""

    improved = True
    while improved:
        improved = False
        for i in range(1, len(order)):
            for j in range(i + 1, len(order)):
                previous = coordinates[order[i - 1]]
                segment_start = coordinates[order[i]]
                segment_end = coordinates[order[j]]
                before = haversine_metres(previous, segment_start)
                after = haversine_metres(previous, segment_end)
                if j + 1 < len(order):
                    following = coordinates[order[j + 1]]
                    before += haversine_metres(segment_end, following)
                    after += haversine_metres(segment_start, following)
                if after + 1e-9 < before:
                    order[i : j + 1] = order[i : j + 1][::-1]
                    improved = True
    return order


def route_order_indices(coordinates: Sequence[Coordinate]) -> list[int]:
    """Return the visiting order for a short schematic path through the stops.

    Candidate ids are content hashes, so their sort order is geographically
    arbitrary and draws a zig-zag line across the study area. A nearest-neighbour
    tour refined with 2-opt gives a readable path for the small stop counts the
    optimiser returns.
    """

    if len(coordinates) < 3:
        return list(range(len(coordinates)))

    order = nearest_neighbour_order(coordinates)
    if len(coordinates) <= TWO_OPT_MAX_STOPS:
        order = two_opt_order(order, coordinates)
    return order


def order_route_coordinates(coordinates: Sequence[Coordinate]) -> list[Coordinate]:
    """Order selected stops into a short schematic path."""

    return [coordinates[index] for index in route_order_indices(coordinates)]


def selected_route_geojson(
    candidate_stops: gpd.GeoDataFrame,
    selected_candidate_ids: list[str],
) -> dict[str, Any]:
    """Build a schematic LineString through the selected candidate stops."""

    coordinates: list[Coordinate] = []
    if selected_candidate_ids:
        selected = candidate_stops.loc[
            candidate_stops["candidate_id"].astype(str).isin(set(selected_candidate_ids))
        ]
        coordinates = [
            (float(point.x), float(point.y))
            for point in selected.geometry
            if point is not None and not point.is_empty
        ]
        coordinates = order_route_coordinates(coordinates)

    geometry_type = "LineString" if len(coordinates) >= 2 else "MultiPoint"

    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"selected_stop_count": len(selected_candidate_ids)},
                "geometry": {
                    "type": geometry_type,
                    "coordinates": [list(coordinate) for coordinate in coordinates],
                },
            }
        ],
    }
