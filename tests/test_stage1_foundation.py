from pathlib import Path

from fastapi.testclient import TestClient

from app.config import get_settings
from app.data import stage0_assets, stage7_assets
from app.main import app, health_payload
from app.schemas import HealthResponse


def test_settings_point_to_project_data_dirs() -> None:
    settings = get_settings()

    assert settings.project_root == Path(__file__).resolve().parents[1]
    assert settings.raw_data_dir == settings.project_root / "data" / "raw"
    assert settings.processed_data_dir == settings.project_root / "data" / "processed"


def test_stage0_asset_registry_uses_relative_paths() -> None:
    assets = stage0_assets()

    assert {asset.key for asset in assets} == {
        "study_area_lsoa",
        "candidate_stops",
        "accessibility_proxy_matrix",
    }
    assert all(not asset.path.startswith("/") for asset in assets)
    assert all(asset.required_for_stage == "stage-2-accessibility-engine" for asset in assets)


def test_stage7_asset_registry_uses_relative_paths() -> None:
    assets = stage7_assets()

    assert {asset.key for asset in assets} == {
        "travel_time_matrix",
        "stage7_routing_metadata",
    }
    assert all(not asset.path.startswith("/") for asset in assets)
    assert all(
        asset.required_for_stage == "stage-7-routing-matrix-contract" for asset in assets
    )


def test_health_payload_contract() -> None:
    payload = health_payload()

    assert isinstance(payload, HealthResponse)
    assert payload.status == "ok"
    assert payload.slug == "accessbridge-ai"
    assert payload.stage == "stage-7-routing-matrix-contract"
    assert payload.accessibility_method == "stage7_travel_time_matrix"


def test_health_endpoint() -> None:
    assert app is not None

    response = TestClient(app).get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["slug"] == "accessbridge-ai"
    assert body["stage"] == "stage-7-routing-matrix-contract"
