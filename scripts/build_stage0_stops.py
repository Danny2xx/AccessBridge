"""Build Stage 0 NaPTAN stop and candidate-stop layers.

This script keeps the repeatable geospatial processing outside notebooks while
leaving Notebook 2 as the visual audit trail.
"""

from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import geopandas as gpd
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"

NAPTAN_PATH = RAW_DIR / "naptan_atco_430_west_midlands.csv"
ALL_LSOA_PATH = PROCESSED_DIR / "lsoa_imd_population.geojson"
STUDY_AREA_LSOA_PATH = PROCESSED_DIR / "study_area_lsoa_imd_population.geojson"

BIRMINGHAM_STOPS_OUTPUT = PROCESSED_DIR / "naptan_birmingham_stops.geojson"
CANDIDATE_STOPS_OUTPUT = PROCESSED_DIR / "candidate_stops.geojson"
METADATA_OUTPUT = PROCESSED_DIR / "stage0_stops_metadata.json"

STOP_TYPE_TO_MODE = {
    "BCT": "bus",
    "BCS": "bus_coach_station",
    "RSE": "rail",
    "TMU": "tram_metro",
}

COST_BY_MODE_GBP = {
    # Placeholder capital costs for Milestone 1 optimisation. These are relative
    # scenario costs, not quantity-surveyor estimates.
    "bus": 75_000,
    "bus_coach_station": 100_000,
    "rail": 150_000,
    "tram_metro": 150_000,
}

INTERCHANGE_MODES = {"rail", "tram_metro"}


def require_file(path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError(
            f"Missing {path.relative_to(ROOT)}. Run the Stage 0 fetch/build scripts first."
        )


def normalise_text(value: object) -> str:
    text = "" if pd.isna(value) else str(value)
    text = text.strip().lower()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    return text.strip("_") or "unnamed"


def stable_candidate_id(candidate_key: str) -> str:
    digest = hashlib.sha1(candidate_key.encode("utf-8")).hexdigest()[:12]
    return f"cand_{digest}"


def load_naptan() -> gpd.GeoDataFrame:
    require_file(NAPTAN_PATH)
    stops = pd.read_csv(NAPTAN_PATH, dtype="string", keep_default_na=False)

    text_columns = stops.select_dtypes(include="string").columns
    for column in text_columns:
        stops[column] = stops[column].str.strip()

    stops["longitude"] = pd.to_numeric(stops["Longitude"], errors="coerce")
    stops["latitude"] = pd.to_numeric(stops["Latitude"], errors="coerce")
    stops["easting"] = pd.to_numeric(stops["Easting"], errors="coerce")
    stops["northing"] = pd.to_numeric(stops["Northing"], errors="coerce")
    stops["status_normalised"] = stops["Status"].str.lower()
    stops["mode_hint"] = stops["StopType"].map(STOP_TYPE_TO_MODE).fillna("other")
    stops["is_interchange"] = stops["mode_hint"].isin(INTERCHANGE_MODES)

    stops = stops.loc[
        stops["status_normalised"].eq("active")
        & stops["longitude"].notna()
        & stops["latitude"].notna()
    ].copy()

    return gpd.GeoDataFrame(
        stops,
        geometry=gpd.points_from_xy(stops["longitude"], stops["latitude"]),
        crs="EPSG:4326",
    )


def stop_join_columns(stops: gpd.GeoDataFrame) -> list[str]:
    preferred = [
        "ATCOCode",
        "NaptanCode",
        "CommonName",
        "Landmark",
        "Street",
        "Indicator",
        "Bearing",
        "LocalityName",
        "ParentLocalityName",
        "Town",
        "Suburb",
        "StopType",
        "BusStopType",
        "TimingStatus",
        "AdministrativeAreaCode",
        "CreationDateTime",
        "ModificationDateTime",
        "Status",
        "longitude",
        "latitude",
        "easting",
        "northing",
        "mode_hint",
        "is_interchange",
        "geometry",
    ]
    return [column for column in preferred if column in stops.columns]


def build_birmingham_stops(stops: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    require_file(ALL_LSOA_PATH)
    lsoa = gpd.read_file(ALL_LSOA_PATH)[
        [
            "lsoa21cd",
            "boundary_lsoa21nm",
            "imd_decile",
            "population_mid_2024",
            "geometry",
        ]
    ]
    joined = stops[stop_join_columns(stops)].sjoin(
        lsoa,
        predicate="within",
        how="inner",
    )
    joined = joined.drop(columns=["index_right"])
    joined = joined.sort_values(["mode_hint", "CommonName", "ATCOCode"]).reset_index(drop=True)
    return joined


def build_candidate_stops(birmingham_stops: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    require_file(STUDY_AREA_LSOA_PATH)
    study_lsoa = gpd.read_file(STUDY_AREA_LSOA_PATH)[["lsoa21cd", "geometry"]]

    study_stops = birmingham_stops.sjoin(
        study_lsoa,
        predicate="within",
        how="inner",
        rsuffix="study",
    )
    study_stops = study_stops.drop(columns=["index_study"])
    if "lsoa21cd_left" in study_stops.columns:
        study_stops = study_stops.rename(columns={"lsoa21cd_left": "lsoa21cd"})
    if "lsoa21cd_study" in study_stops.columns:
        study_stops = study_stops.drop(columns=["lsoa21cd_study"])

    study_stops["normalised_name"] = study_stops["CommonName"].map(normalise_text)
    study_stops["candidate_key"] = (
        study_stops["lsoa21cd"]
        + "|"
        + study_stops["mode_hint"]
        + "|"
        + study_stops["normalised_name"]
    )

    projected = study_stops.to_crs("EPSG:27700")
    projected["candidate_x"] = projected.geometry.x
    projected["candidate_y"] = projected.geometry.y

    rows: list[dict[str, object]] = []
    for candidate_key, group in projected.groupby("candidate_key", sort=True):
        mode_hint = str(group["mode_hint"].iloc[0])
        source_codes = sorted(group["ATCOCode"].astype(str).unique().tolist())
        candidate_x = float(group["candidate_x"].mean())
        candidate_y = float(group["candidate_y"].mean())
        candidate_point = gpd.GeoSeries.from_xy(
            [candidate_x],
            [candidate_y],
            crs="EPSG:27700",
        ).to_crs("EPSG:4326").iloc[0]

        rows.append(
            {
                "candidate_id": stable_candidate_id(candidate_key),
                "candidate_key": candidate_key,
                "name": str(group["CommonName"].iloc[0]).strip() or "Unnamed stop",
                "mode_hint": mode_hint,
                "stop_type": str(group["StopType"].iloc[0]),
                "lsoa21cd": str(group["lsoa21cd"].iloc[0]),
                "lsoa_name": str(group["boundary_lsoa21nm"].iloc[0]),
                "imd_decile": int(group["imd_decile"].iloc[0]),
                "population_mid_2024": int(group["population_mid_2024"].iloc[0]),
                "is_interchange": bool(group["is_interchange"].any()),
                "cost_gbp": int(COST_BY_MODE_GBP.get(mode_hint, 75_000)),
                "source_stop_count": int(len(group)),
                "source_atco_codes": ";".join(source_codes),
                "source_common_names": ";".join(sorted(group["CommonName"].astype(str).unique())),
                "geometry": candidate_point,
            }
        )

    candidates = gpd.GeoDataFrame(rows, geometry="geometry", crs="EPSG:4326")
    candidates = candidates.sort_values(
        ["mode_hint", "name", "candidate_id"]
    ).reset_index(drop=True)
    return candidates


def build_outputs() -> dict[str, object]:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    naptan = load_naptan()
    birmingham_stops = build_birmingham_stops(naptan)
    candidate_stops = build_candidate_stops(birmingham_stops)

    birmingham_stops.to_file(BIRMINGHAM_STOPS_OUTPUT, driver="GeoJSON")
    candidate_stops.to_file(CANDIDATE_STOPS_OUTPUT, driver="GeoJSON")

    summary = {
        "built_at_utc": datetime.now(timezone.utc).isoformat(),
        "inputs": {
            "naptan": NAPTAN_PATH.relative_to(ROOT).as_posix(),
            "all_lsoa": ALL_LSOA_PATH.relative_to(ROOT).as_posix(),
            "study_area_lsoa": STUDY_AREA_LSOA_PATH.relative_to(ROOT).as_posix(),
        },
        "outputs": {
            "birmingham_stops": BIRMINGHAM_STOPS_OUTPUT.relative_to(ROOT).as_posix(),
            "candidate_stops": CANDIDATE_STOPS_OUTPUT.relative_to(ROOT).as_posix(),
        },
        "active_naptan_430_stops": int(len(naptan)),
        "birmingham_active_stops": int(len(birmingham_stops)),
        "study_area_candidate_stops": int(len(candidate_stops)),
        "study_area_source_stop_nodes": int(candidate_stops["source_stop_count"].sum()),
        "candidate_counts_by_mode": {
            str(key): int(value)
            for key, value in candidate_stops["mode_hint"].value_counts().sort_index().items()
        },
        "interchange_candidate_count": int(candidate_stops["is_interchange"].sum()),
        "cost_assumptions_gbp": COST_BY_MODE_GBP,
    }
    METADATA_OUTPUT.write_text(json.dumps(summary, indent=2) + "\n")
    return summary


def main() -> None:
    summary = build_outputs()
    print("Stage 0 stops built:")
    for key, value in summary.items():
        if key in {"inputs", "outputs", "candidate_counts_by_mode", "cost_assumptions_gbp"}:
            continue
        print(f"- {key}: {value}")
    print(f"- candidate counts by mode: {summary['candidate_counts_by_mode']}")
    print(f"- Birmingham stops: {summary['outputs']['birmingham_stops']}")
    print(f"- candidate stops: {summary['outputs']['candidate_stops']}")
    print(f"- metadata: {METADATA_OUTPUT.relative_to(ROOT).as_posix()}")


if __name__ == "__main__":
    main()
