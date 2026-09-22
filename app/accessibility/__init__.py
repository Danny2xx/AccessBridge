"""Accessibility calculations for AccessBridge AI."""

from app.accessibility.proxy import (
    PROXY_ACCESSIBILITY_CAVEAT,
    PROXY_ACCESSIBILITY_METHOD,
    baseline_interchange_covered_origins,
    build_accessibility_metric,
    compare_accessibility,
    compare_selected_candidates_from_stage0,
    covered_origins_for_candidates,
    load_candidate_stops,
    load_proxy_matrix,
    load_study_area_origins,
    origin_population_frame,
    population_by_decile,
)
from app.accessibility.travel_time import (
    TRAVEL_TIME_ACCESSIBILITY_CAVEAT,
    TRAVEL_TIME_ACCESSIBILITY_METHOD,
    compare_travel_time_accessibility,
    load_travel_time_matrix,
    prepare_travel_time_matrix,
    validate_travel_time_matrix,
    with_reachability_columns,
)

__all__ = [
    "PROXY_ACCESSIBILITY_CAVEAT",
    "PROXY_ACCESSIBILITY_METHOD",
    "TRAVEL_TIME_ACCESSIBILITY_CAVEAT",
    "TRAVEL_TIME_ACCESSIBILITY_METHOD",
    "baseline_interchange_covered_origins",
    "build_accessibility_metric",
    "compare_accessibility",
    "compare_selected_candidates_from_stage0",
    "compare_travel_time_accessibility",
    "covered_origins_for_candidates",
    "load_candidate_stops",
    "load_proxy_matrix",
    "load_study_area_origins",
    "load_travel_time_matrix",
    "origin_population_frame",
    "population_by_decile",
    "prepare_travel_time_matrix",
    "validate_travel_time_matrix",
    "with_reachability_columns",
]
