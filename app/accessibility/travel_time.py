"""Stage 7 travel-time matrix accessibility contract.

The final Stage 7 target is an R5/r5py walk-plus-transit matrix. This module
defines the stable matrix shape the backend can consume now: one origin-candidate
row with a `travel_time_min` value and generated threshold columns.
"""

from __future__ import annotations

import json
from collections.abc import Iterable, Sequence
from pathlib import Path

import pandas as pd

from app.accessibility.proxy import (
    CANDIDATE_ID_COLUMN,
    INTERCHANGE_COLUMN,
    ORIGIN_DECILE_COLUMN,
    ORIGIN_ID_COLUMN,
    ORIGIN_NAME_COLUMN,
    ORIGIN_POPULATION_COLUMN,
    compare_accessibility,
    validate_proxy_matrix,
)
from app.config import Settings, get_settings
from app.schemas import AccessibilityComparison

TRAVEL_TIME_ACCESSIBILITY_METHOD = "stage7_travel_time_matrix"
TRAVEL_TIME_ACCESSIBILITY_CAVEAT = (
    "R5-ready travel-time matrix contract. The default local matrix is "
    "proxy-derived from Stage 0 walk times until pinned GTFS and OSM R5 outputs "
    "are supplied."
)

TRAVEL_TIME_COLUMN = "travel_time_min"
ROUTING_SOURCE_COLUMN = "routing_source"
ROUTING_PROFILE_COLUMN = "routing_profile"
DEFAULT_THRESHOLD_MINUTES = (5, 10, 15)

REQUIRED_TRAVEL_TIME_COLUMNS = {
    ORIGIN_ID_COLUMN,
    ORIGIN_NAME_COLUMN,
    ORIGIN_DECILE_COLUMN,
    ORIGIN_POPULATION_COLUMN,
    CANDIDATE_ID_COLUMN,
    INTERCHANGE_COLUMN,
    TRAVEL_TIME_COLUMN,
}


def validate_travel_time_matrix(matrix: pd.DataFrame) -> None:
    """Validate the core Stage 7 travel-time matrix contract."""

    missing = sorted(REQUIRED_TRAVEL_TIME_COLUMNS.difference(matrix.columns))
    if missing:
        raise ValueError(f"Travel-time matrix is missing required columns: {missing}")

    if matrix[ORIGIN_ID_COLUMN].isna().any():
        raise ValueError("Travel-time matrix contains rows with missing origin_id")
    if matrix[CANDIDATE_ID_COLUMN].isna().any():
        raise ValueError("Travel-time matrix contains rows with missing candidate_id")

    travel_time = pd.to_numeric(matrix[TRAVEL_TIME_COLUMN], errors="raise")
    if travel_time.isna().any():
        raise ValueError("Travel-time matrix contains missing travel_time_min values")
    if travel_time.lt(0).any():
        raise ValueError("travel_time_min must be non-negative")


def with_reachability_columns(
    matrix: pd.DataFrame,
    thresholds_min: Sequence[int] = DEFAULT_THRESHOLD_MINUTES,
) -> pd.DataFrame:
    """Return a copy with `within_N_min` columns derived from travel time."""

    validate_travel_time_matrix(matrix)
    invalid_thresholds = [threshold for threshold in thresholds_min if threshold <= 0]
    if invalid_thresholds:
        raise ValueError(f"Threshold minutes must be positive, got {invalid_thresholds}")

    prepared = matrix.copy()
    prepared[TRAVEL_TIME_COLUMN] = pd.to_numeric(
        prepared[TRAVEL_TIME_COLUMN],
        errors="raise",
    ).round(2)

    for threshold in sorted(set(thresholds_min)):
        prepared[f"within_{threshold}_min"] = prepared[TRAVEL_TIME_COLUMN].le(threshold)

    return prepared


def prepare_travel_time_matrix(
    matrix: pd.DataFrame,
    threshold_min: int,
) -> pd.DataFrame:
    """Add threshold reachability columns and validate API compatibility."""

    thresholds = tuple(sorted({*DEFAULT_THRESHOLD_MINUTES, threshold_min}))
    prepared = with_reachability_columns(matrix, thresholds)
    validate_proxy_matrix(prepared, threshold_min)
    return prepared


def compare_travel_time_accessibility(
    matrix: pd.DataFrame,
    selected_candidate_ids: Iterable[str],
    threshold_min: int,
) -> AccessibilityComparison:
    """Compare accessibility from a generic travel-time matrix."""

    prepared = prepare_travel_time_matrix(matrix, threshold_min)
    comparison = compare_accessibility(prepared, selected_candidate_ids, threshold_min)
    updated: AccessibilityComparison = comparison.model_copy(
        update={
            "method": TRAVEL_TIME_ACCESSIBILITY_METHOD,
            "method_caveat": TRAVEL_TIME_ACCESSIBILITY_CAVEAT,
        }
    )
    return updated


def load_travel_time_matrix(
    path: Path | None = None,
    settings: Settings | None = None,
) -> pd.DataFrame:
    """Load the local Stage 7 travel-time matrix artifact."""

    resolved_settings = settings or get_settings()
    matrix_path = path or resolved_settings.travel_time_matrix_path
    matrix = pd.read_csv(matrix_path)
    return with_reachability_columns(matrix)


def travel_time_caveat(settings: Settings | None = None) -> str:
    """Describe the active matrix honestly: routed on real streets, or a proxy."""

    resolved_settings = settings or get_settings()
    path = resolved_settings.stage7_routing_metadata_path
    if not path.exists():
        return TRAVEL_TIME_ACCESSIBILITY_CAVEAT
    metadata = json.loads(path.read_text())
    if metadata.get("source_mode") != "r5_input":
        return TRAVEL_TIME_ACCESSIBILITY_CAVEAT

    provenance = metadata.get("routing_provenance") or {}
    osm = provenance.get("osm_extract_name") or "OpenStreetMap"
    osm_date = provenance.get("osm_extract_date")
    gtfs = provenance.get("gtfs_feed_name") or "the GTFS feed"
    gtfs_date = provenance.get("gtfs_feed_date")
    osm_label = f"{osm} ({osm_date})" if osm_date else osm
    gtfs_label = f"{gtfs} ({gtfs_date})" if gtfs_date else gtfs

    if metadata.get("routing_profile") == "walk":
        return (
            f"Walking times are routed along real streets with R5, using {osm_label}. "
            "Bus and Metro legs are not included, so a stop counts as reached only on foot. "
            "Stop costs remain placeholders."
        )
    return (
        f"Journey times are routed with R5 as walking plus bus and Metro, using {osm_label} "
        f"and {gtfs_label}. Stop costs remain placeholders."
    )
