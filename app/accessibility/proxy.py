"""Stage 2 proxy accessibility engine.

The functions in this module use the Stage 0 Euclidean walking-distance matrix.
They are deliberately named as proxy calculations so they are not confused with
the later R5 walk-plus-transit accessibility model.
"""

from __future__ import annotations

from collections.abc import Iterable
from pathlib import Path

import geopandas as gpd
import pandas as pd

from app.config import Settings, get_settings
from app.schemas import (
    AccessibilityComparison,
    AccessibilityMetric,
    DecileAccessibilityDelta,
    DecilePopulation,
)

PROXY_ACCESSIBILITY_METHOD = "stage0_proxy"
PROXY_ACCESSIBILITY_CAVEAT = (
    "Euclidean centroid-to-candidate walking-distance proxy; not final R5 routing."
)

ORIGIN_ID_COLUMN = "origin_id"
ORIGIN_NAME_COLUMN = "origin_name"
ORIGIN_DECILE_COLUMN = "origin_imd_decile"
ORIGIN_POPULATION_COLUMN = "origin_population_mid_2024"
CANDIDATE_ID_COLUMN = "candidate_id"
INTERCHANGE_COLUMN = "is_interchange"

REQUIRED_MATRIX_COLUMNS = {
    ORIGIN_ID_COLUMN,
    ORIGIN_NAME_COLUMN,
    ORIGIN_DECILE_COLUMN,
    ORIGIN_POPULATION_COLUMN,
    CANDIDATE_ID_COLUMN,
    INTERCHANGE_COLUMN,
}


def threshold_column(threshold_min: int, matrix: pd.DataFrame) -> str:
    """Return the reachability column for a threshold, validating it exists."""

    if threshold_min <= 0:
        raise ValueError(f"threshold_min must be positive, got {threshold_min}")

    column = f"within_{threshold_min}_min"
    if column not in matrix.columns:
        available = sorted(
            column_name
            for column_name in matrix.columns
            if column_name.startswith("within_") and column_name.endswith("_min")
        )
        raise ValueError(
            f"Missing reachability column {column!r}. Available threshold columns: {available}"
        )
    return column


def validate_proxy_matrix(matrix: pd.DataFrame, threshold_min: int) -> str:
    """Validate the minimum matrix shape needed for proxy accessibility metrics."""

    missing = sorted(REQUIRED_MATRIX_COLUMNS.difference(matrix.columns))
    if missing:
        raise ValueError(f"Accessibility matrix is missing required columns: {missing}")

    reachability_column = threshold_column(threshold_min, matrix)
    if matrix[ORIGIN_ID_COLUMN].isna().any():
        raise ValueError("Accessibility matrix contains rows with missing origin_id")
    if matrix[CANDIDATE_ID_COLUMN].isna().any():
        raise ValueError("Accessibility matrix contains rows with missing candidate_id")

    return reachability_column


def selected_candidate_set(selected_candidate_ids: Iterable[str]) -> set[str]:
    """Normalise selected candidate ids for stable calculations."""

    return {candidate_id for candidate_id in selected_candidate_ids if candidate_id}


def covered_origins_for_candidates(
    matrix: pd.DataFrame,
    selected_candidate_ids: Iterable[str],
    threshold_min: int,
) -> set[str]:
    """Return origins covered by at least one selected candidate stop."""

    reachability_column = validate_proxy_matrix(matrix, threshold_min)
    selected_ids = selected_candidate_set(selected_candidate_ids)
    if not selected_ids:
        return set()

    covered_rows = matrix.loc[
        matrix[CANDIDATE_ID_COLUMN].isin(selected_ids) & matrix[reachability_column]
    ]
    return set(covered_rows[ORIGIN_ID_COLUMN].astype(str).unique().tolist())


def baseline_interchange_covered_origins(
    matrix: pd.DataFrame,
    threshold_min: int,
) -> set[str]:
    """Return origins directly covered by rail/Metro interchange candidates."""

    reachability_column = validate_proxy_matrix(matrix, threshold_min)
    interchange_rows = matrix.loc[
        matrix[INTERCHANGE_COLUMN].astype(bool) & matrix[reachability_column]
    ]
    return set(interchange_rows[ORIGIN_ID_COLUMN].astype(str).unique().tolist())


def origin_population_frame(matrix: pd.DataFrame) -> pd.DataFrame:
    """Return one population row per origin from the matrix."""

    required = {
        ORIGIN_ID_COLUMN,
        ORIGIN_NAME_COLUMN,
        ORIGIN_DECILE_COLUMN,
        ORIGIN_POPULATION_COLUMN,
    }
    missing = sorted(required.difference(matrix.columns))
    if missing:
        raise ValueError(f"Accessibility matrix is missing origin columns: {missing}")

    origins = matrix[
        [
            ORIGIN_ID_COLUMN,
            ORIGIN_NAME_COLUMN,
            ORIGIN_DECILE_COLUMN,
            ORIGIN_POPULATION_COLUMN,
        ]
    ].drop_duplicates(subset=[ORIGIN_ID_COLUMN])

    origins = origins.copy()
    origins[ORIGIN_ID_COLUMN] = origins[ORIGIN_ID_COLUMN].astype(str)
    origins[ORIGIN_DECILE_COLUMN] = pd.to_numeric(
        origins[ORIGIN_DECILE_COLUMN],
        errors="raise",
    ).astype("int64")
    origins[ORIGIN_POPULATION_COLUMN] = pd.to_numeric(
        origins[ORIGIN_POPULATION_COLUMN],
        errors="raise",
    ).astype("int64")

    invalid_deciles = origins.loc[
        ~origins[ORIGIN_DECILE_COLUMN].between(1, 10), ORIGIN_DECILE_COLUMN
    ].unique()
    if len(invalid_deciles) > 0:
        raise ValueError(f"IMD deciles must be in the range 1-10, got {invalid_deciles.tolist()}")

    return origins


def population_by_decile(
    origins: pd.DataFrame,
    covered_origin_ids: Iterable[str],
) -> dict[int, int]:
    """Aggregate covered population by IMD decile."""

    covered_ids = {str(origin_id) for origin_id in covered_origin_ids}
    if not covered_ids:
        return {}

    covered = origins.loc[origins[ORIGIN_ID_COLUMN].astype(str).isin(covered_ids)]
    grouped = covered.groupby(ORIGIN_DECILE_COLUMN, as_index=True)[ORIGIN_POPULATION_COLUMN].sum()
    return {int(decile): int(population) for decile, population in grouped.items()}


def build_accessibility_metric(
    origins: pd.DataFrame,
    covered_origin_ids: Iterable[str],
    threshold_min: int,
) -> AccessibilityMetric:
    """Build an API-ready metric from covered origins."""

    by_decile = population_by_decile(origins, covered_origin_ids)
    decile_rows = [
        DecilePopulation(imd_decile=decile, population=by_decile.get(decile, 0))
        for decile in range(1, 11)
    ]
    covered_ids = sorted({str(origin_id) for origin_id in covered_origin_ids})

    return AccessibilityMetric(
        threshold_min=threshold_min,
        covered_origin_ids=covered_ids,
        population_by_decile=decile_rows,
        most_deprived_decile_population=by_decile.get(1, 0),
        bottom_three_deciles_population=sum(by_decile.get(decile, 0) for decile in range(1, 4)),
        total_population=sum(by_decile.values()),
    )


def compare_accessibility(
    matrix: pd.DataFrame,
    selected_candidate_ids: Iterable[str],
    threshold_min: int,
) -> AccessibilityComparison:
    """Compare baseline interchange access against selected feeder-stop access."""

    validate_proxy_matrix(matrix, threshold_min)
    origins = origin_population_frame(matrix)
    baseline_covered = baseline_interchange_covered_origins(matrix, threshold_min)
    scenario_covered = covered_origins_for_candidates(matrix, selected_candidate_ids, threshold_min)

    baseline = build_accessibility_metric(origins, baseline_covered, threshold_min)
    scenario = build_accessibility_metric(origins, scenario_covered, threshold_min)

    baseline_deciles = {row.imd_decile: row.population for row in baseline.population_by_decile}
    scenario_deciles = {row.imd_decile: row.population for row in scenario.population_by_decile}

    decile_breakdown = [
        DecileAccessibilityDelta(
            imd_decile=decile,
            baseline_population=baseline_deciles.get(decile, 0),
            scenario_population=scenario_deciles.get(decile, 0),
            delta_population=scenario_deciles.get(decile, 0) - baseline_deciles.get(decile, 0),
        )
        for decile in range(1, 11)
    ]

    return AccessibilityComparison(
        method=PROXY_ACCESSIBILITY_METHOD,
        method_caveat=PROXY_ACCESSIBILITY_CAVEAT,
        threshold_min=threshold_min,
        selected_candidate_ids=sorted(selected_candidate_set(selected_candidate_ids)),
        baseline=baseline,
        scenario=scenario,
        delta_most_deprived_decile_population=(
            scenario.most_deprived_decile_population - baseline.most_deprived_decile_population
        ),
        delta_bottom_three_deciles_population=(
            scenario.bottom_three_deciles_population - baseline.bottom_three_deciles_population
        ),
        delta_total_population=scenario.total_population - baseline.total_population,
        decile_breakdown=decile_breakdown,
    )


def load_study_area_origins(settings: Settings | None = None) -> gpd.GeoDataFrame:
    """Load the processed study-area LSOA layer."""

    resolved_settings = settings or get_settings()
    return gpd.read_file(resolved_settings.study_area_lsoa_path)


def load_candidate_stops(settings: Settings | None = None) -> gpd.GeoDataFrame:
    """Load the processed candidate-stop layer."""

    resolved_settings = settings or get_settings()
    return gpd.read_file(resolved_settings.candidate_stops_path)


def load_proxy_matrix(path: Path | None = None, settings: Settings | None = None) -> pd.DataFrame:
    """Load the Stage 0 proxy accessibility matrix."""

    resolved_settings = settings or get_settings()
    matrix_path = path or resolved_settings.accessibility_proxy_matrix_path
    return pd.read_csv(matrix_path)


def compare_selected_candidates_from_stage0(
    selected_candidate_ids: Iterable[str],
    threshold_min: int = 10,
    settings: Settings | None = None,
) -> AccessibilityComparison:
    """Load local Stage 0 data and compare selected candidate accessibility."""

    matrix = load_proxy_matrix(settings=settings)
    return compare_accessibility(
        matrix=matrix,
        selected_candidate_ids=selected_candidate_ids,
        threshold_min=threshold_min,
    )
