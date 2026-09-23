"""HTTP routes for the dashboard API."""

from __future__ import annotations

import geopandas as gpd
from fastapi import APIRouter

from app.accessibility import (
    TRAVEL_TIME_ACCESSIBILITY_METHOD,
    compare_travel_time_accessibility,
    load_candidate_stops,
    load_travel_time_matrix,
    prepare_travel_time_matrix,
    travel_time_caveat,
)
from app.config import Settings, get_settings
from app.evidence import DEFAULT_REQUEST, get_evidence
from app.geometry import (
    frame_to_geojson,
    haversine_metres,
    nearest_neighbour_order,
    order_route_coordinates,
    selected_route_geojson,
    two_opt_order,
)
from app.insights import enrich_result
from app.optimisation import optimise_stop_selection
from app.places import load_place_names
from app.schemas import (
    Attribution,
    EvidenceResponse,
    OptimisationRequest,
    OptimisationResult,
    ScenarioResponse,
)

__all__ = [
    "frame_to_geojson",
    "haversine_metres",
    "nearest_neighbour_order",
    "order_route_coordinates",
    "router",
    "selected_route_geojson",
    "two_opt_order",
]

router = APIRouter()


def with_place_names(
    frame: gpd.GeoDataFrame,
    id_column: str,
    lookup: dict[str, str],
    fallback_column: str,
) -> gpd.GeoDataFrame:
    """Return a copy with a human-readable `place_name` column."""

    named = frame.copy()
    ids = named[id_column].astype(str)
    fallback = named[fallback_column].astype(str)
    named["place_name"] = [lookup.get(key) or default for key, default in zip(ids, fallback)]
    return named


def build_scenario_response(settings: Settings | None = None) -> ScenarioResponse:
    """Build the dashboard scenario payload from local data."""

    resolved_settings = settings or get_settings()
    places = load_place_names(resolved_settings)
    lsoa = with_place_names(
        gpd.read_file(resolved_settings.study_area_lsoa_path),
        "lsoa21cd",
        places.neighbourhoods,
        "boundary_lsoa21nm",
    )
    candidate_stops = with_place_names(
        load_candidate_stops(resolved_settings),
        "candidate_id",
        places.candidates,
        "lsoa_name",
    )
    matrix = load_travel_time_matrix(settings=resolved_settings)
    baseline_comparison = compare_travel_time_accessibility(
        matrix,
        selected_candidate_ids=[],
        threshold_min=DEFAULT_REQUEST.threshold_min,
    )
    min_lon, min_lat, max_lon, max_lat = (float(value) for value in lsoa.total_bounds)

    return ScenarioResponse(
        lsoa_geojson=frame_to_geojson(lsoa),
        candidate_stops_geojson=frame_to_geojson(candidate_stops),
        baseline=baseline_comparison.baseline,
        attribution=Attribution(),
        method=TRAVEL_TIME_ACCESSIBILITY_METHOD,
        method_caveat=travel_time_caveat(resolved_settings),
        default_request=DEFAULT_REQUEST,
        study_area_bounds=[min_lon, min_lat, max_lon, max_lat],
    )


@router.get("/scenario", response_model=ScenarioResponse)
def scenario() -> ScenarioResponse:
    """Return the base map layers and baseline metrics for the dashboard."""

    return build_scenario_response()


@router.post("/optimise", response_model=OptimisationResult)
def optimise(request: OptimisationRequest) -> OptimisationResult:
    """Run the optimiser and describe who each selected stop reaches."""

    settings = get_settings()
    matrix = prepare_travel_time_matrix(
        load_travel_time_matrix(settings=settings),
        request.threshold_min,
    )
    result = optimise_stop_selection(
        matrix,
        request,
        comparison_builder=compare_travel_time_accessibility,
    )
    return enrich_result(
        result,
        matrix,
        load_candidate_stops(settings),
        load_place_names(settings),
    )


@router.get("/evidence", response_model=EvidenceResponse)
def evidence() -> EvidenceResponse:
    """Return study-area facts, the default scenario and sensitivity sweeps."""

    return get_evidence()
