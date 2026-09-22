"""Build Stage 0 distance-based accessibility proxy outputs.

This is not the final R5 travel-time matrix. It is a pre-R5 walking-distance
prototype so the notebooks can validate catchment and equity maths on real
origins and candidate stops.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
from shapely.geometry import Point

ROOT = Path(__file__).resolve().parents[1]
PROCESSED_DIR = ROOT / "data" / "processed"

ORIGINS_PATH = PROCESSED_DIR / "study_area_lsoa_imd_population.geojson"
CANDIDATES_PATH = PROCESSED_DIR / "candidate_stops.geojson"

MATRIX_OUTPUT = PROCESSED_DIR / "accessibility_proxy_matrix.csv"
ORIGIN_OUTPUT = PROCESSED_DIR / "accessibility_proxy_by_origin.geojson"
SUMMARY_OUTPUT = PROCESSED_DIR / "accessibility_proxy_summary.csv"
METADATA_OUTPUT = PROCESSED_DIR / "stage0_accessibility_metadata.json"

WALK_SPEED_METRES_PER_MINUTE = 80.0
THRESHOLD_MINUTES = (5, 10, 15)


def require_file(path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError(
            f"Missing {path.relative_to(ROOT)}. Run Notebook 2 processing first."
        )


def load_origins() -> gpd.GeoDataFrame:
    require_file(ORIGINS_PATH)
    origins = gpd.read_file(ORIGINS_PATH)
    geometry = [
        Point(float(lon), float(lat))
        for lon, lat in zip(origins["centroid_lon"], origins["centroid_lat"])
    ]
    origin_points = gpd.GeoDataFrame(
        origins.drop(columns=["geometry"]),
        geometry=geometry,
        crs="EPSG:4326",
    )
    return origin_points


def load_candidates() -> gpd.GeoDataFrame:
    require_file(CANDIDATES_PATH)
    return gpd.read_file(CANDIDATES_PATH)


def build_matrix(
    origins: gpd.GeoDataFrame,
    candidates: gpd.GeoDataFrame,
) -> pd.DataFrame:
    origins_projected = origins.to_crs("EPSG:27700")
    candidates_projected = candidates.to_crs("EPSG:27700")

    origin_xy = np.column_stack(
        [origins_projected.geometry.x.to_numpy(), origins_projected.geometry.y.to_numpy()]
    )
    candidate_xy = np.column_stack(
        [
            candidates_projected.geometry.x.to_numpy(),
            candidates_projected.geometry.y.to_numpy(),
        ]
    )

    rows: list[pd.DataFrame] = []
    candidate_base = candidates[
        [
            "candidate_id",
            "name",
            "mode_hint",
            "is_interchange",
            "cost_gbp",
        ]
    ].reset_index(drop=True)

    for origin_index, origin in origins.reset_index(drop=True).iterrows():
        distances = np.linalg.norm(candidate_xy - origin_xy[origin_index], axis=1)
        frame = candidate_base.copy()
        frame.insert(0, "origin_id", origin["lsoa21cd"])
        frame.insert(1, "origin_name", origin["boundary_lsoa21nm"])
        frame.insert(2, "origin_imd_decile", int(origin["imd_decile"]))
        frame.insert(3, "origin_population_mid_2024", int(origin["population_mid_2024"]))
        frame["distance_m"] = distances.round(1)
        frame["walk_time_min"] = (distances / WALK_SPEED_METRES_PER_MINUTE).round(2)
        for threshold in THRESHOLD_MINUTES:
            frame[f"within_{threshold}_min"] = frame["walk_time_min"].le(threshold)
        rows.append(frame)

    matrix = pd.concat(rows, ignore_index=True)
    return matrix.sort_values(["origin_id", "walk_time_min", "candidate_id"]).reset_index(drop=True)


def build_origin_accessibility(
    origins: gpd.GeoDataFrame,
    matrix: pd.DataFrame,
) -> gpd.GeoDataFrame:
    origin_rows = []
    grouped = matrix.groupby("origin_id", sort=False)

    for _, origin in origins.iterrows():
        origin_id = origin["lsoa21cd"]
        origin_matrix = grouped.get_group(origin_id)
        interchange_matrix = origin_matrix.loc[origin_matrix["is_interchange"]]
        nearest_any = origin_matrix.iloc[0]
        nearest_interchange = interchange_matrix.sort_values("walk_time_min").iloc[0]

        row = origin.drop(labels=["geometry"]).to_dict()
        row["nearest_candidate_id"] = nearest_any["candidate_id"]
        row["nearest_candidate_name"] = nearest_any["name"]
        row["nearest_candidate_mode"] = nearest_any["mode_hint"]
        row["nearest_candidate_walk_time_min"] = float(nearest_any["walk_time_min"])
        row["nearest_interchange_id"] = nearest_interchange["candidate_id"]
        row["nearest_interchange_name"] = nearest_interchange["name"]
        row["nearest_interchange_mode"] = nearest_interchange["mode_hint"]
        row["nearest_interchange_walk_time_min"] = float(
            nearest_interchange["walk_time_min"]
        )

        for threshold in THRESHOLD_MINUTES:
            row[f"covered_any_{threshold}_min"] = bool(
                origin_matrix[f"within_{threshold}_min"].any()
            )
            row[f"covered_interchange_{threshold}_min"] = bool(
                interchange_matrix[f"within_{threshold}_min"].any()
            )
            row[f"candidate_count_{threshold}_min"] = int(
                origin_matrix[f"within_{threshold}_min"].sum()
            )

        row["geometry"] = origin.geometry
        origin_rows.append(row)

    return gpd.GeoDataFrame(origin_rows, geometry="geometry", crs=origins.crs)


def build_summary(origin_accessibility: gpd.GeoDataFrame) -> pd.DataFrame:
    rows = []
    for threshold in THRESHOLD_MINUTES:
        for decile_limit in (1, 3, 10):
            subset = origin_accessibility.loc[origin_accessibility["imd_decile"].le(decile_limit)]
            baseline_population = int(
                subset.loc[
                    subset[f"covered_interchange_{threshold}_min"],
                    "population_mid_2024",
                ].sum()
            )
            scenario_population = int(
                subset.loc[
                    subset[f"covered_any_{threshold}_min"],
                    "population_mid_2024",
                ].sum()
            )
            rows.append(
                {
                    "threshold_min": threshold,
                    "decile_limit": decile_limit,
                    "population_scope": (
                        "most_deprived_decile"
                        if decile_limit == 1
                        else "bottom_three_deciles"
                        if decile_limit == 3
                        else "all_deciles"
                    ),
                    "baseline_direct_interchange_population": baseline_population,
                    "scenario_any_candidate_population": scenario_population,
                    "delta_population": scenario_population - baseline_population,
                }
            )
    return pd.DataFrame(rows)


def build_outputs() -> dict[str, object]:
    origins = load_origins()
    candidates = load_candidates()

    matrix = build_matrix(origins, candidates)
    origin_accessibility = build_origin_accessibility(origins, matrix)
    summary = build_summary(origin_accessibility)

    matrix.to_csv(MATRIX_OUTPUT, index=False)
    origin_accessibility.to_file(ORIGIN_OUTPUT, driver="GeoJSON")
    summary.to_csv(SUMMARY_OUTPUT, index=False)

    metadata = {
        "built_at_utc": datetime.now(timezone.utc).isoformat(),
        "method": "Euclidean centroid-to-candidate walking-distance proxy; not final R5 routing.",
        "walk_speed_metres_per_minute": WALK_SPEED_METRES_PER_MINUTE,
        "threshold_minutes": list(THRESHOLD_MINUTES),
        "inputs": {
            "origins": ORIGINS_PATH.relative_to(ROOT).as_posix(),
            "candidates": CANDIDATES_PATH.relative_to(ROOT).as_posix(),
        },
        "outputs": {
            "matrix": MATRIX_OUTPUT.relative_to(ROOT).as_posix(),
            "origin_accessibility": ORIGIN_OUTPUT.relative_to(ROOT).as_posix(),
            "summary": SUMMARY_OUTPUT.relative_to(ROOT).as_posix(),
        },
        "origin_count": int(len(origins)),
        "candidate_count": int(len(candidates)),
        "matrix_rows": int(len(matrix)),
    }
    METADATA_OUTPUT.write_text(json.dumps(metadata, indent=2) + "\n")
    return metadata


def main() -> None:
    metadata = build_outputs()
    print("Stage 0 accessibility proxy built:")
    print(f"- origin count: {metadata['origin_count']}")
    print(f"- candidate count: {metadata['candidate_count']}")
    print(f"- matrix rows: {metadata['matrix_rows']}")
    print(f"- matrix: {metadata['outputs']['matrix']}")
    print(f"- origin accessibility: {metadata['outputs']['origin_accessibility']}")
    print(f"- summary: {metadata['outputs']['summary']}")
    print(f"- metadata: {METADATA_OUTPUT.relative_to(ROOT).as_posix()}")


if __name__ == "__main__":
    main()
