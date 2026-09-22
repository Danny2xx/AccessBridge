"""Evidence payload for the story and evidence pages.

Runs the default scenario plus budget and walking-time sweeps against the active
travel-time matrix. Each solve takes about a tenth of a second, so the whole
payload is built once and cached until an input file changes.
"""

from __future__ import annotations

import json
import threading
from collections.abc import Iterable
from pathlib import Path

import geopandas as gpd
import pandas as pd

from app.accessibility import (
    TRAVEL_TIME_ACCESSIBILITY_CAVEAT,
    TRAVEL_TIME_ACCESSIBILITY_METHOD,
    compare_travel_time_accessibility,
    load_candidate_stops,
    load_travel_time_matrix,
    origin_population_frame,
    prepare_travel_time_matrix,
)
from app.accessibility.proxy import (
    INTERCHANGE_COLUMN,
    ORIGIN_DECILE_COLUMN,
    ORIGIN_POPULATION_COLUMN,
)
from app.config import Settings, get_settings
from app.insights import enrich_result
from app.optimisation import optimise_stop_selection
from app.places import PlaceNames, load_place_names
from app.schemas import (
    EvidenceResponse,
    OptimisationRequest,
    OptimisationResult,
    RoutingProvenance,
    SensitivityPoint,
    StudyAreaFacts,
)

DEFAULT_REQUEST = OptimisationRequest(
    budget_gbp=600_000,
    max_stops=8,
    threshold_min=10,
    require_interchange=True,
)
BUDGET_SWEEP_GBP = tuple(range(150_000, 900_001, 75_000))
WALK_TIME_SWEEP_MIN = (5, 10, 15, 20)

_CACHE: dict[tuple[object, ...], EvidenceResponse] = {}
_LOCK = threading.Lock()


def sensitivity_point(value: int, result: OptimisationResult) -> SensitivityPoint:
    comparison = result.accessibility
    if comparison is None:
        return SensitivityPoint(
            value=value,
            feasible=False,
            stop_count=0,
            total_cost_gbp=0,
            most_deprived_reached=0,
            most_deprived_gain=0,
            bottom_three_gain=0,
            total_gain=0,
        )
    return SensitivityPoint(
        value=value,
        feasible=result.feasible,
        stop_count=len(result.selected_stops),
        total_cost_gbp=result.total_cost_gbp,
        most_deprived_reached=comparison.scenario.most_deprived_decile_population,
        most_deprived_gain=comparison.delta_most_deprived_decile_population,
        bottom_three_gain=comparison.delta_bottom_three_deciles_population,
        total_gain=comparison.delta_total_population,
    )


def solve(prepared: pd.DataFrame, request: OptimisationRequest) -> OptimisationResult:
    return optimise_stop_selection(
        prepared,
        request,
        comparison_builder=compare_travel_time_accessibility,
    )


def sweep(
    prepared: pd.DataFrame,
    requests: Iterable[tuple[int, OptimisationRequest]],
) -> list[SensitivityPoint]:
    return [sensitivity_point(value, solve(prepared, request)) for value, request in requests]


def study_area_facts(
    prepared: pd.DataFrame,
    candidate_stops: gpd.GeoDataFrame,
    default_result: OptimisationResult,
) -> StudyAreaFacts:
    origins = origin_population_frame(prepared)
    population = origins[ORIGIN_POPULATION_COLUMN]
    decile = origins[ORIGIN_DECILE_COLUMN]
    most_deprived_population = int(population[decile == 1].sum())

    comparison = default_result.accessibility
    reached_today = comparison.baseline.most_deprived_decile_population if comparison else 0
    mode_counts = candidate_stops["mode_hint"].fillna("other").astype(str).value_counts()

    return StudyAreaFacts(
        neighbourhood_count=int(len(origins)),
        population=int(population.sum()),
        most_deprived_population=most_deprived_population,
        most_deprived_neighbourhood_count=int((decile == 1).sum()),
        bottom_three_population=int(population[decile <= 3].sum()),
        candidate_stop_count=int(len(candidate_stops)),
        rail_metro_stop_count=int(candidate_stops[INTERCHANGE_COLUMN].astype(bool).sum()),
        candidate_counts_by_mode={str(mode): int(count) for mode, count in mode_counts.items()},
        threshold_min=default_result.threshold_min,
        most_deprived_reached_today=reached_today,
        most_deprived_not_reached_today=max(0, most_deprived_population - reached_today),
    )


def routing_provenance(settings: Settings) -> RoutingProvenance:
    source_mode, routing_source, routing_profile = "unknown", "unknown", "unknown"
    path = settings.stage7_routing_metadata_path
    if path.exists():
        metadata = json.loads(path.read_text())
        source_mode = str(metadata.get("source_mode", source_mode))
        routing_source = str(metadata.get("routing_source", routing_source))
        routing_profile = str(metadata.get("routing_profile", routing_profile))
    return RoutingProvenance(
        method=TRAVEL_TIME_ACCESSIBILITY_METHOD,
        method_caveat=TRAVEL_TIME_ACCESSIBILITY_CAVEAT,
        source_mode=source_mode,
        routing_source=routing_source,
        routing_profile=routing_profile,
    )


def build_evidence(
    settings: Settings | None = None,
    places: PlaceNames | None = None,
) -> EvidenceResponse:
    """Run the default scenario and sensitivity sweeps."""

    resolved = settings or get_settings()
    resolved_places = places or load_place_names(resolved)
    matrix = load_travel_time_matrix(settings=resolved)
    candidate_stops = load_candidate_stops(resolved)
    default_threshold = DEFAULT_REQUEST.threshold_min
    prepared = prepare_travel_time_matrix(matrix, default_threshold)

    default_result = enrich_result(
        solve(prepared, DEFAULT_REQUEST),
        prepared,
        candidate_stops,
        resolved_places,
    )
    comparison = default_result.accessibility
    gain = comparison.delta_most_deprived_decile_population if comparison else 0
    cost_per_resident = round(default_result.total_cost_gbp / gain, 2) if gain > 0 else None

    budget_points = sweep(
        prepared,
        (
            (budget, DEFAULT_REQUEST.model_copy(update={"budget_gbp": budget}))
            for budget in BUDGET_SWEEP_GBP
        ),
    )
    walk_points = [
        sensitivity_point(
            minutes,
            solve(
                prepare_travel_time_matrix(matrix, minutes),
                DEFAULT_REQUEST.model_copy(update={"threshold_min": minutes}),
            ),
        )
        for minutes in WALK_TIME_SWEEP_MIN
    ]
    return EvidenceResponse(
        routing=routing_provenance(resolved),
        study_area=study_area_facts(prepared, candidate_stops, default_result),
        default_request=DEFAULT_REQUEST,
        default_result=default_result,
        cost_per_most_deprived_resident_gbp=cost_per_resident,
        budget_sensitivity=budget_points,
        walk_time_sensitivity=walk_points,
    )


def file_signature(path: Path) -> tuple[str, int]:
    return (str(path), path.stat().st_mtime_ns if path.exists() else -1)


def get_evidence(settings: Settings | None = None) -> EvidenceResponse:
    """Return the cached evidence payload, rebuilding it when inputs change."""

    resolved = settings or get_settings()
    key = tuple(
        file_signature(path)
        for path in (
            resolved.travel_time_matrix_path,
            resolved.candidate_stops_path,
            resolved.place_names_path,
            resolved.stage7_routing_metadata_path,
        )
    )
    with _LOCK:
        if key not in _CACHE:
            _CACHE.clear()
            _CACHE[key] = build_evidence(resolved)
        return _CACHE[key]
