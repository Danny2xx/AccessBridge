"""Application settings and project paths."""

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Settings:
    """Runtime settings shared by API, data, and solver modules."""

    app_name: str = "AccessBridge AI"
    app_slug: str = "accessbridge-ai"
    app_version: str = "0.1.0"
    current_stage: str = "stage-7-routing-matrix-contract"
    accessibility_method: str = "stage7_travel_time_matrix"
    project_root: Path = PROJECT_ROOT
    raw_data_dir: Path = PROJECT_ROOT / "data" / "raw"
    processed_data_dir: Path = PROJECT_ROOT / "data" / "processed"

    @property
    def stage0_geography_metadata_path(self) -> Path:
        return self.processed_data_dir / "stage0_geography_metadata.json"

    @property
    def stage0_stops_metadata_path(self) -> Path:
        return self.processed_data_dir / "stage0_stops_metadata.json"

    @property
    def stage0_accessibility_metadata_path(self) -> Path:
        return self.processed_data_dir / "stage0_accessibility_metadata.json"

    @property
    def stage7_routing_metadata_path(self) -> Path:
        return self.processed_data_dir / "stage7_routing_metadata.json"

    @property
    def study_area_lsoa_path(self) -> Path:
        return self.processed_data_dir / "study_area_lsoa_imd_population.geojson"

    @property
    def candidate_stops_path(self) -> Path:
        return self.processed_data_dir / "candidate_stops.geojson"

    @property
    def accessibility_proxy_matrix_path(self) -> Path:
        return self.processed_data_dir / "accessibility_proxy_matrix.csv"

    @property
    def travel_time_matrix_path(self) -> Path:
        return self.processed_data_dir / "travel_time_matrix.csv"

    @property
    def place_names_path(self) -> Path:
        return self.processed_data_dir / "place_names.json"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings."""

    return Settings()
