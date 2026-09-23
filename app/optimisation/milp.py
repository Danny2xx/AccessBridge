"""Single-objective MILP optimiser for Stage 3.

The optimiser chooses candidate feeder stops that maximise equity-weighted
coverage while respecting budget, stop-count, and interchange constraints.
"""

from __future__ import annotations

from collections.abc import Callable, Iterable
from dataclasses import dataclass
from typing import Literal

import pandas as pd
import pulp

from app.accessibility.proxy import (
    CANDIDATE_ID_COLUMN,
    INTERCHANGE_COLUMN,
    ORIGIN_DECILE_COLUMN,
    ORIGIN_ID_COLUMN,
    ORIGIN_POPULATION_COLUMN,
    compare_accessibility,
    load_proxy_matrix,
    origin_population_frame,
    validate_proxy_matrix,
)
from app.accessibility.travel_time import (
    compare_travel_time_accessibility,
    load_travel_time_matrix,
    prepare_travel_time_matrix,
)
from app.config import Settings
from app.schemas import (
    AccessibilityComparison,
    OptimisationRequest,
    OptimisationResult,
    SelectedStop,
)

CANDIDATE_NAME_COLUMN = "name"
CANDIDATE_MODE_COLUMN = "mode_hint"
CANDIDATE_COST_COLUMN = "cost_gbp"

OPTIMAL_STATUS = "Optimal"
INFEASIBLE_STATUSES = {"Infeasible", "Undefined"}

AccessibilityComparisonBuilder = Callable[
    [pd.DataFrame, Iterable[str], int],
    AccessibilityComparison,
]


@dataclass(frozen=True)
class CandidateOption:
    """Candidate stop attributes needed by the optimiser."""

    candidate_id: str
    name: str | None
    mode_hint: str | None
    cost_gbp: int
    is_interchange: bool


def deprivation_weight(imd_decile: int) -> int:
    """Return a simple equity weight for an IMD decile."""

    if not 1 <= imd_decile <= 10:
        raise ValueError(f"IMD decile must be 1-10, got {imd_decile}")
    return 11 - imd_decile


def validate_optimisation_inputs(
    matrix: pd.DataFrame,
    request: OptimisationRequest,
) -> str:
    """Validate request and matrix columns, returning the reachability column."""

    if request.budget_gbp < 0:
        raise ValueError(f"budget_gbp must be non-negative, got {request.budget_gbp}")
    if request.max_stops <= 0:
        raise ValueError(f"max_stops must be positive, got {request.max_stops}")
    if CANDIDATE_COST_COLUMN not in matrix.columns:
        raise ValueError(f"Accessibility matrix is missing {CANDIDATE_COST_COLUMN!r}")
    return validate_proxy_matrix(matrix, request.threshold_min)


def candidate_options_from_matrix(matrix: pd.DataFrame) -> list[CandidateOption]:
    """Extract one optimiser candidate row per candidate id."""

    required_columns = [CANDIDATE_ID_COLUMN, CANDIDATE_COST_COLUMN, INTERCHANGE_COLUMN]
    missing = sorted(set(required_columns).difference(matrix.columns))
    if missing:
        raise ValueError(f"Accessibility matrix is missing candidate columns: {missing}")

    optional_columns = [CANDIDATE_NAME_COLUMN, CANDIDATE_MODE_COLUMN]
    columns = [
        *required_columns,
        *[column for column in optional_columns if column in matrix.columns],
    ]
    candidates = matrix[columns].drop_duplicates(subset=[CANDIDATE_ID_COLUMN]).copy()
    candidates[CANDIDATE_ID_COLUMN] = candidates[CANDIDATE_ID_COLUMN].astype(str)
    candidates[CANDIDATE_COST_COLUMN] = pd.to_numeric(
        candidates[CANDIDATE_COST_COLUMN],
        errors="raise",
    ).astype("int64")

    rows = []
    for row in candidates.sort_values(CANDIDATE_ID_COLUMN).to_dict(orient="records"):
        name = row.get(CANDIDATE_NAME_COLUMN)
        mode_hint = row.get(CANDIDATE_MODE_COLUMN)
        rows.append(
            CandidateOption(
                candidate_id=str(row[CANDIDATE_ID_COLUMN]),
                name=str(name) if name is not None else None,
                mode_hint=str(mode_hint) if mode_hint is not None else None,
                cost_gbp=int(row[CANDIDATE_COST_COLUMN]),
                is_interchange=bool(row[INTERCHANGE_COLUMN]),
            )
        )
    return rows


def candidate_coverage(
    matrix: pd.DataFrame,
    candidate_ids: Iterable[str],
    reachability_column: str,
) -> dict[str, set[str]]:
    """Map each candidate id to the origins it can cover."""

    candidate_id_set = {str(candidate_id) for candidate_id in candidate_ids}
    reachable_rows = matrix.loc[
        matrix[CANDIDATE_ID_COLUMN].astype(str).isin(candidate_id_set) & matrix[reachability_column]
    ]
    grouped = reachable_rows.groupby(CANDIDATE_ID_COLUMN)[ORIGIN_ID_COLUMN].agg(
        lambda values: {str(value) for value in values}
    )
    return {
        candidate_id: set(grouped.get(candidate_id, set()))
        for candidate_id in sorted(candidate_id_set)
    }


def origin_objective_weights(matrix: pd.DataFrame) -> dict[str, int]:
    """Return equity-weighted population values by origin id."""

    origins = origin_population_frame(matrix)
    weights: dict[str, int] = {}
    for row in origins.to_dict(orient="records"):
        origin_id = str(row[ORIGIN_ID_COLUMN])
        population = int(row[ORIGIN_POPULATION_COLUMN])
        imd_decile = int(row[ORIGIN_DECILE_COLUMN])
        weights[origin_id] = population * deprivation_weight(imd_decile)
    return weights


def selected_stop_models(
    candidate_lookup: dict[str, CandidateOption],
    selected_candidate_ids: Iterable[str],
) -> list[SelectedStop]:
    """Build typed selected-stop models in stable order."""

    selected = []
    for candidate_id in sorted(selected_candidate_ids):
        candidate = candidate_lookup[candidate_id]
        selected.append(
            SelectedStop(
                candidate_id=candidate.candidate_id,
                name=candidate.name,
                mode_hint=candidate.mode_hint,
                cost_gbp=candidate.cost_gbp,
                is_interchange=candidate.is_interchange,
            )
        )
    return selected


def infeasible_result(
    request: OptimisationRequest,
    solver_status: str,
) -> OptimisationResult:
    """Build a deterministic infeasible result."""

    status: Literal["infeasible", "solver_error"] = (
        "infeasible" if solver_status in INFEASIBLE_STATUSES else "solver_error"
    )
    return OptimisationResult(
        status=status,
        feasible=False,
        solver_status=solver_status,
        budget_gbp=request.budget_gbp,
        max_stops=request.max_stops,
        threshold_min=request.threshold_min,
        require_interchange=request.require_interchange,
        objective_value=0.0,
        total_cost_gbp=0,
        selected_stops=[],
        covered_origin_ids=[],
        accessibility=None,
        explanation=(
            "No feasible stop selection found for "
            f"budget_gbp={request.budget_gbp}, max_stops={request.max_stops}, "
            f"require_interchange={request.require_interchange}."
        ),
    )


def optimise_stop_selection(
    matrix: pd.DataFrame,
    request: OptimisationRequest,
    comparison_builder: AccessibilityComparisonBuilder = compare_accessibility,
) -> OptimisationResult:
    """Run the Stage 3 single-objective stop-selection optimiser."""

    reachability_column = validate_optimisation_inputs(matrix, request)
    candidates = candidate_options_from_matrix(matrix)
    candidate_lookup = {candidate.candidate_id: candidate for candidate in candidates}
    candidate_ids = [candidate.candidate_id for candidate in candidates]
    origin_weights = origin_objective_weights(matrix)
    origin_ids = sorted(origin_weights)
    coverage_by_candidate = candidate_coverage(matrix, candidate_ids, reachability_column)

    covering_candidates_by_origin: dict[str, list[str]] = {
        origin_id: [] for origin_id in origin_ids
    }
    for candidate_id, covered_origins in coverage_by_candidate.items():
        for origin_id in covered_origins:
            if origin_id in covering_candidates_by_origin:
                covering_candidates_by_origin[origin_id].append(candidate_id)

    problem = pulp.LpProblem("accessbridge_equity_stop_selection", pulp.LpMaximize)
    x = {
        candidate_id: pulp.LpVariable(f"x_{candidate_id}", cat=pulp.LpBinary)
        for candidate_id in candidate_ids
    }
    y = {
        origin_id: pulp.LpVariable(f"y_{origin_id}", cat=pulp.LpBinary) for origin_id in origin_ids
    }

    problem += pulp.lpSum(origin_weights[origin_id] * y[origin_id] for origin_id in origin_ids)
    problem += (
        pulp.lpSum(
            candidate_lookup[candidate_id].cost_gbp * x[candidate_id]
            for candidate_id in candidate_ids
        )
        <= request.budget_gbp
    )
    problem += pulp.lpSum(x[candidate_id] for candidate_id in candidate_ids) <= request.max_stops

    if request.require_interchange:
        interchange_candidate_ids = [
            candidate.candidate_id for candidate in candidates if candidate.is_interchange
        ]
        problem += pulp.lpSum(x[candidate_id] for candidate_id in interchange_candidate_ids) >= 1

    for origin_id in origin_ids:
        covering_candidates = covering_candidates_by_origin[origin_id]
        if covering_candidates:
            problem += y[origin_id] <= pulp.lpSum(
                x[candidate_id] for candidate_id in covering_candidates
            )
        else:
            problem += y[origin_id] <= 0

    solver = pulp.PULP_CBC_CMD(msg=False, gapRel=0, threads=1)
    problem.solve(solver)
    solver_status = pulp.LpStatus.get(problem.status, "Unknown")

    if solver_status != OPTIMAL_STATUS:
        return infeasible_result(request, solver_status)

    selected_candidate_ids = [
        candidate_id for candidate_id in candidate_ids if (x[candidate_id].varValue or 0.0) >= 0.5
    ]
    selected_origin_ids = [
        origin_id for origin_id in origin_ids if (y[origin_id].varValue or 0.0) >= 0.5
    ]
    total_cost_gbp = sum(
        candidate_lookup[candidate_id].cost_gbp for candidate_id in selected_candidate_ids
    )
    objective_value = float(pulp.value(problem.objective) or 0.0)
    accessibility = comparison_builder(matrix, selected_candidate_ids, request.threshold_min)

    return OptimisationResult(
        status="optimal",
        feasible=True,
        solver_status=solver_status,
        budget_gbp=request.budget_gbp,
        max_stops=request.max_stops,
        threshold_min=request.threshold_min,
        require_interchange=request.require_interchange,
        objective_value=objective_value,
        total_cost_gbp=total_cost_gbp,
        selected_stops=selected_stop_models(candidate_lookup, selected_candidate_ids),
        covered_origin_ids=sorted(selected_origin_ids),
        accessibility=accessibility,
        explanation=(
            f"Selected {len(selected_candidate_ids)} stops within a "
            f"{request.budget_gbp} GBP budget, reaching "
            f"{accessibility.scenario.most_deprived_decile_population} "
            "most-deprived-decile residents in the active accessibility model."
        ),
    )


def optimise_from_stage0(
    request: OptimisationRequest,
    settings: Settings | None = None,
) -> OptimisationResult:
    """Load local Stage 0 matrix data and run the optimiser."""

    matrix = load_proxy_matrix(settings=settings)
    return optimise_stop_selection(matrix, request)


def optimise_from_travel_time(
    request: OptimisationRequest,
    settings: Settings | None = None,
) -> OptimisationResult:
    """Load local Stage 7 travel-time data and run the optimiser."""

    matrix = load_travel_time_matrix(settings=settings)
    prepared = prepare_travel_time_matrix(matrix, request.threshold_min)
    return optimise_stop_selection(
        prepared,
        request,
        comparison_builder=compare_travel_time_accessibility,
    )
