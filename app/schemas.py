"""Shared API schemas.

Stage 2 defines the accessibility response contract. Stage 3 adds the
single-objective optimiser result contract.
"""

from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Response returned by the health endpoint."""

    service: str = Field(..., description="Human-readable service name.")
    slug: str = Field(..., description="Stable service identifier.")
    version: str = Field(..., description="Application version.")
    status: Literal["ok"] = Field("ok", description="Health status.")
    stage: str = Field(..., description="Current implementation stage.")
    accessibility_method: str = Field(
        ...,
        description="Current accessibility method.",
    )


class DataAsset(BaseModel):
    """A local data artifact expected by the backend."""

    key: str
    path: str
    required_for_stage: str


class Attribution(BaseModel):
    """Attribution text that must be visible in API and frontend surfaces."""

    public_sector: str = (
        "Contains public sector information licensed under the Open Government Licence v3.0."
    )
    imd_ons_naptan: str = (
        "Contains data from IMD 2025, ONS population estimates, ONS/OS boundaries, and NaPTAN."
    )
    osm: str = "Map data © OpenStreetMap contributors, available under the ODbL."
    transit: str = "Transit data should be attributed to the relevant open transit feed source."


class DecilePopulation(BaseModel):
    """Population reached for one IMD decile."""

    imd_decile: int = Field(..., ge=1, le=10)
    population: int = Field(..., ge=0)


class DecileAccessibilityDelta(BaseModel):
    """Baseline, scenario, and delta population for one IMD decile."""

    imd_decile: int = Field(..., ge=1, le=10)
    baseline_population: int = Field(..., ge=0)
    scenario_population: int = Field(..., ge=0)
    delta_population: int


class AccessibilityMetric(BaseModel):
    """Coverage metric for a single accessibility state."""

    threshold_min: int = Field(..., gt=0)
    covered_origin_ids: list[str]
    population_by_decile: list[DecilePopulation]
    most_deprived_decile_population: int = Field(..., ge=0)
    bottom_three_deciles_population: int = Field(..., ge=0)
    total_population: int = Field(..., ge=0)


class AccessibilityComparison(BaseModel):
    """Baseline-vs-scenario accessibility comparison for selected stops."""

    method: str
    method_caveat: str
    threshold_min: int = Field(..., gt=0)
    selected_candidate_ids: list[str]
    baseline: AccessibilityMetric
    scenario: AccessibilityMetric
    delta_most_deprived_decile_population: int
    delta_bottom_three_deciles_population: int
    delta_total_population: int
    decile_breakdown: list[DecileAccessibilityDelta]


class OptimisationRequest(BaseModel):
    """Single-objective optimiser request."""

    budget_gbp: int = Field(..., ge=0)
    max_stops: int = Field(..., gt=0)
    threshold_min: int = Field(10, gt=0)
    require_interchange: bool = True


class SelectedStop(BaseModel):
    """Candidate stop selected by the optimiser."""

    candidate_id: str
    name: Optional[str] = None
    mode_hint: Optional[str] = None
    cost_gbp: int = Field(..., ge=0)
    is_interchange: bool


class NeighbourhoodReach(BaseModel):
    """A neighbourhood within walking reach of one selected stop."""

    lsoa21cd: str
    lsoa_name: str
    place_name: str
    imd_decile: int = Field(..., ge=1, le=10)
    population: int = Field(..., ge=0)
    travel_time_min: float = Field(..., ge=0)
    reached_today: bool = Field(
        ...,
        description="Already within the threshold of a rail or Metro stop today.",
    )


class StopDetail(BaseModel):
    """Plain-language facts about one selected stop."""

    candidate_id: str
    name: Optional[str] = None
    place_name: str
    mode_hint: Optional[str] = None
    cost_gbp: int = Field(..., ge=0)
    is_interchange: bool
    longitude: float
    latitude: float
    people_reached: int = Field(..., ge=0)
    most_deprived_reached: int = Field(..., ge=0)
    newly_reached: int = Field(
        ...,
        ge=0,
        description="People reached who cannot walk to a rail or Metro stop today.",
    )
    only_this_stop: int = Field(
        ...,
        ge=0,
        description="People reached by this stop and no other selected stop.",
    )
    neighbourhoods: list[NeighbourhoodReach]


class OptimisationResult(BaseModel):
    """Single-objective optimiser result."""

    status: Literal["optimal", "infeasible", "solver_error"]
    feasible: bool
    solver_status: str
    budget_gbp: int = Field(..., ge=0)
    max_stops: int = Field(..., gt=0)
    threshold_min: int = Field(..., gt=0)
    require_interchange: bool
    objective_value: float = 0.0
    total_cost_gbp: int = Field(0, ge=0)
    selected_stops: list[SelectedStop]
    covered_origin_ids: list[str]
    accessibility: Optional[AccessibilityComparison] = None
    route_geojson: Optional[dict[str, Any]] = None
    stop_details: list[StopDetail] = Field(
        default_factory=list,
        description="Selected stops in route order, with who each one reaches.",
    )
    explanation: str


class ScenarioResponse(BaseModel):
    """Scenario payload used by the 2D frontend dashboard."""

    lsoa_geojson: dict[str, Any]
    candidate_stops_geojson: dict[str, Any]
    baseline: AccessibilityMetric
    attribution: Attribution
    method: str
    method_caveat: str
    default_request: OptimisationRequest
    study_area_bounds: list[float] = Field(
        default_factory=list,
        description="[min_lon, min_lat, max_lon, max_lat] of the study area.",
    )


class RoutingProvenance(BaseModel):
    """Which travel-time matrix produced the figures."""

    method: str
    method_caveat: str
    source_mode: str
    routing_source: str
    routing_profile: str


class StudyAreaFacts(BaseModel):
    """Headline facts about the study area and today's access."""

    neighbourhood_count: int = Field(..., ge=0)
    population: int = Field(..., ge=0)
    most_deprived_population: int = Field(..., ge=0)
    most_deprived_neighbourhood_count: int = Field(..., ge=0)
    bottom_three_population: int = Field(..., ge=0)
    candidate_stop_count: int = Field(..., ge=0)
    rail_metro_stop_count: int = Field(..., ge=0)
    candidate_counts_by_mode: dict[str, int]
    threshold_min: int = Field(..., gt=0)
    most_deprived_reached_today: int = Field(..., ge=0)
    most_deprived_not_reached_today: int = Field(..., ge=0)


class SensitivityPoint(BaseModel):
    """One optimiser run in a sensitivity sweep."""

    value: int
    feasible: bool
    stop_count: int = Field(..., ge=0)
    total_cost_gbp: int = Field(..., ge=0)
    most_deprived_reached: int = Field(..., ge=0)
    most_deprived_gain: int
    bottom_three_gain: int
    total_gain: int


class EvidenceResponse(BaseModel):
    """Everything the story and evidence pages need, computed once and cached."""

    routing: RoutingProvenance
    study_area: StudyAreaFacts
    default_request: OptimisationRequest
    default_result: OptimisationResult
    cost_per_most_deprived_resident_gbp: Optional[float] = None
    budget_sensitivity: list[SensitivityPoint]
    walk_time_sensitivity: list[SensitivityPoint]
