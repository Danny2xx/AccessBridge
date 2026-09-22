"""Plain-language facts built on top of optimiser results.

The optimiser answers "which stops"; this module answers "who does each stop
reach, and would they have had access anyway", which is what the dashboard's
stop cards and story need.
"""

from __future__ import annotations

from collections.abc import Sequence

import geopandas as gpd
import pandas as pd

from app.accessibility.proxy import (
    CANDIDATE_ID_COLUMN,
    ORIGIN_DECILE_COLUMN,
    ORIGIN_ID_COLUMN,
    ORIGIN_NAME_COLUMN,
    ORIGIN_POPULATION_COLUMN,
    threshold_column,
)
from app.accessibility.travel_time import TRAVEL_TIME_COLUMN
from app.geometry import Coordinate, route_order_indices, selected_route_geojson
from app.places import PlaceNames
from app.schemas import NeighbourhoodReach, OptimisationResult, StopDetail

MOST_DEPRIVED_DECILE = 1


def stop_coordinates(
    candidate_stops: gpd.GeoDataFrame,
    candidate_ids: Sequence[str],
) -> dict[str, Coordinate]:
    """Return lon/lat for each requested candidate id that has a geometry."""

    wanted = {str(candidate_id) for candidate_id in candidate_ids}
    subset = candidate_stops.loc[candidate_stops["candidate_id"].astype(str).isin(wanted)]
    coordinates: dict[str, Coordinate] = {}
    for candidate_id, point in zip(subset["candidate_id"].astype(str), subset.geometry):
        if point is not None and not point.is_empty:
            coordinates[candidate_id] = (float(point.x), float(point.y))
    return coordinates


def route_ordered_ids(
    candidate_ids: Sequence[str],
    coordinates: dict[str, Coordinate],
) -> list[str]:
    """Order candidate ids along the schematic route; unplaced ids go last."""

    placed = [candidate_id for candidate_id in candidate_ids if candidate_id in coordinates]
    unplaced = [candidate_id for candidate_id in candidate_ids if candidate_id not in coordinates]
    order = route_order_indices([coordinates[candidate_id] for candidate_id in placed])
    return [placed[index] for index in order] + unplaced


def build_stop_details(
    matrix: pd.DataFrame,
    ordered_candidate_ids: Sequence[str],
    threshold_min: int,
    baseline_covered_ids: set[str],
    candidate_stops: gpd.GeoDataFrame,
    places: PlaceNames,
) -> list[StopDetail]:
    """Describe who each selected stop reaches, in the order given."""

    if not ordered_candidate_ids:
        return []

    reach_column = threshold_column(threshold_min, matrix)
    selected = {str(candidate_id) for candidate_id in ordered_candidate_ids}
    rows = matrix.loc[
        matrix[CANDIDATE_ID_COLUMN].astype(str).isin(selected) & matrix[reach_column].astype(bool)
    ].copy()
    rows[CANDIDATE_ID_COLUMN] = rows[CANDIDATE_ID_COLUMN].astype(str)
    rows[ORIGIN_ID_COLUMN] = rows[ORIGIN_ID_COLUMN].astype(str)
    stops_reaching_origin = rows.groupby(ORIGIN_ID_COLUMN)[CANDIDATE_ID_COLUMN].nunique()

    stop_frame = candidate_stops.copy()
    stop_frame["candidate_id"] = stop_frame["candidate_id"].astype(str)
    stop_lookup = stop_frame.set_index("candidate_id")
    coordinates = stop_coordinates(candidate_stops, list(ordered_candidate_ids))

    details: list[StopDetail] = []
    for candidate_id in ordered_candidate_ids:
        candidate_id = str(candidate_id)
        if candidate_id not in stop_lookup.index:
            continue
        stop = stop_lookup.loc[candidate_id]
        reach = rows.loc[rows[CANDIDATE_ID_COLUMN] == candidate_id].sort_values(
            [ORIGIN_POPULATION_COLUMN, ORIGIN_ID_COLUMN],
            ascending=[False, True],
        )

        neighbourhoods = [
            NeighbourhoodReach(
                lsoa21cd=str(row[ORIGIN_ID_COLUMN]),
                lsoa_name=str(row[ORIGIN_NAME_COLUMN]),
                place_name=places.neighbourhood(
                    str(row[ORIGIN_ID_COLUMN]), str(row[ORIGIN_NAME_COLUMN])
                ),
                imd_decile=int(row[ORIGIN_DECILE_COLUMN]),
                population=int(row[ORIGIN_POPULATION_COLUMN]),
                travel_time_min=round(float(row[TRAVEL_TIME_COLUMN]), 1),
                reached_today=str(row[ORIGIN_ID_COLUMN]) in baseline_covered_ids,
            )
            for row in reach.to_dict(orient="records")
        ]

        population = [neighbourhood.population for neighbourhood in neighbourhoods]
        longitude, latitude = coordinates.get(candidate_id, (0.0, 0.0))
        name = stop.get("name")
        mode_hint = stop.get("mode_hint")
        details.append(
            StopDetail(
                candidate_id=candidate_id,
                name=str(name) if name is not None else None,
                place_name=places.candidate(candidate_id, str(stop.get("lsoa_name", ""))),
                mode_hint=str(mode_hint) if mode_hint is not None else None,
                cost_gbp=int(stop["cost_gbp"]),
                is_interchange=bool(stop["is_interchange"]),
                longitude=longitude,
                latitude=latitude,
                people_reached=sum(population),
                most_deprived_reached=sum(
                    item.population
                    for item in neighbourhoods
                    if item.imd_decile == MOST_DEPRIVED_DECILE
                ),
                newly_reached=sum(
                    item.population for item in neighbourhoods if not item.reached_today
                ),
                only_this_stop=sum(
                    item.population
                    for item in neighbourhoods
                    if int(stops_reaching_origin.get(item.lsoa21cd, 0)) == 1
                ),
                neighbourhoods=neighbourhoods,
            )
        )
    return details


def enrich_result(
    result: OptimisationResult,
    matrix: pd.DataFrame,
    candidate_stops: gpd.GeoDataFrame,
    places: PlaceNames,
) -> OptimisationResult:
    """Add the route line and per-stop details to an optimiser result."""

    selected_ids = [stop.candidate_id for stop in result.selected_stops]
    coordinates = stop_coordinates(candidate_stops, selected_ids)
    ordered_ids = route_ordered_ids(selected_ids, coordinates)
    baseline_ids = (
        set(result.accessibility.baseline.covered_origin_ids) if result.accessibility else set()
    )

    return result.model_copy(
        update={
            "route_geojson": selected_route_geojson(candidate_stops, ordered_ids),
            "stop_details": build_stop_details(
                matrix,
                ordered_ids,
                result.threshold_min,
                baseline_ids,
                candidate_stops,
                places,
            ),
        }
    )
