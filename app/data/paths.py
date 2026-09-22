"""Local data artifact registry."""

from __future__ import annotations

from app.config import Settings, get_settings
from app.schemas import DataAsset


def stage0_assets(settings: Settings | None = None) -> list[DataAsset]:
    """Return the Stage 0 data artifacts the backend expects to find locally."""

    resolved_settings = settings or get_settings()
    return [
        DataAsset(
            key="study_area_lsoa",
            path=resolved_settings.study_area_lsoa_path.relative_to(
                resolved_settings.project_root
            ).as_posix(),
            required_for_stage="stage-2-accessibility-engine",
        ),
        DataAsset(
            key="candidate_stops",
            path=resolved_settings.candidate_stops_path.relative_to(
                resolved_settings.project_root
            ).as_posix(),
            required_for_stage="stage-2-accessibility-engine",
        ),
        DataAsset(
            key="accessibility_proxy_matrix",
            path=resolved_settings.accessibility_proxy_matrix_path.relative_to(
                resolved_settings.project_root
            ).as_posix(),
            required_for_stage="stage-2-accessibility-engine",
        ),
    ]


def stage7_assets(settings: Settings | None = None) -> list[DataAsset]:
    """Return the Stage 7 routing-matrix artifacts the backend expects locally."""

    resolved_settings = settings or get_settings()
    return [
        DataAsset(
            key="travel_time_matrix",
            path=resolved_settings.travel_time_matrix_path.relative_to(
                resolved_settings.project_root
            ).as_posix(),
            required_for_stage="stage-7-routing-matrix-contract",
        ),
        DataAsset(
            key="stage7_routing_metadata",
            path=resolved_settings.stage7_routing_metadata_path.relative_to(
                resolved_settings.project_root
            ).as_posix(),
            required_for_stage="stage-7-routing-matrix-contract",
        ),
    ]
