"""Build Stage 0 Birmingham LSOA geography for notebook exploration.

Inputs live in data/raw/ and are downloaded by scripts/fetch_data.py.
Outputs live in data/processed/ and are safe to regenerate.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import geopandas as gpd
import pandas as pd
from shapely.geometry import box

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"

BOUNDARIES_PATH = RAW_DIR / "birmingham_lsoa_2021_boundaries.geojson"
IMD_PATH = RAW_DIR / "imd_2025_file_7_all_ranks_scores_deciles_population_denominators.csv"
POPULATION_PATH = RAW_DIR / "ons_lsoa_population_broad_age_mid_2022_revised_to_mid_2024.xlsx"

ALL_BIRMINGHAM_OUTPUT = PROCESSED_DIR / "lsoa_imd_population.geojson"
STUDY_AREA_OUTPUT = PROCESSED_DIR / "study_area_lsoa_imd_population.geojson"
METADATA_OUTPUT = PROCESSED_DIR / "stage0_geography_metadata.json"

STUDY_AREA_WGS84_BBOX = {
    "min_lon": -1.935,
    "min_lat": 52.465,
    "max_lon": -1.820,
    "max_lat": 52.515,
}

IMD_COLUMNS = {
    "LSOA code (2021)": "lsoa21cd",
    "LSOA name (2021)": "imd_lsoa21nm",
    "Local Authority District code (2024)": "lad24cd",
    "Local Authority District name (2024)": "lad24nm",
    "Index of Multiple Deprivation (IMD) Score": "imd_score",
    "Index of Multiple Deprivation (IMD) Rank (where 1 is most deprived)": "imd_rank",
    (
        "Index of Multiple Deprivation (IMD) Decile "
        "(where 1 is most deprived 10% of LSOAs)"
    ): "imd_decile",
    "Total population: mid 2022": "population_mid_2022_imd_denominator",
}


def require_file(path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError(
            f"Missing {path.relative_to(ROOT)}. Run scripts/fetch_data.py first."
        )


def load_boundaries() -> gpd.GeoDataFrame:
    require_file(BOUNDARIES_PATH)
    boundaries = gpd.read_file(BOUNDARIES_PATH)
    boundaries = boundaries.rename(
        columns={
            "lsoa21cd": "lsoa21cd",
            "lsoa21nm": "boundary_lsoa21nm",
            "bng_e": "bng_e",
            "bng_n": "bng_n",
            "lat": "boundary_lat",
            "long": "boundary_lon",
        }
    )
    keep_columns = [
        "lsoa21cd",
        "boundary_lsoa21nm",
        "bng_e",
        "bng_n",
        "boundary_lat",
        "boundary_lon",
        "geometry",
    ]
    return boundaries[keep_columns].to_crs("EPSG:4326")


def load_imd() -> pd.DataFrame:
    require_file(IMD_PATH)
    imd = pd.read_csv(IMD_PATH, usecols=list(IMD_COLUMNS))
    imd = imd.rename(columns=IMD_COLUMNS)
    imd["imd_decile"] = pd.to_numeric(imd["imd_decile"], errors="raise").astype("int64")
    imd["imd_rank"] = pd.to_numeric(imd["imd_rank"], errors="raise").astype("int64")
    imd["imd_score"] = pd.to_numeric(imd["imd_score"], errors="raise")
    imd["population_mid_2022_imd_denominator"] = pd.to_numeric(
        imd["population_mid_2022_imd_denominator"],
        errors="raise",
    ).astype("int64")
    return imd


def load_population() -> pd.DataFrame:
    require_file(POPULATION_PATH)
    population = pd.read_excel(
        POPULATION_PATH,
        sheet_name="Mid-2024 LSOA 2021",
        header=3,
        usecols=["LSOA 2021 Code", "Total"],
    )
    population = population.rename(
        columns={
            "LSOA 2021 Code": "lsoa21cd",
            "Total": "population_mid_2024",
        }
    )
    population["population_mid_2024"] = pd.to_numeric(
        population["population_mid_2024"],
        errors="raise",
    ).astype("int64")
    return population


def add_derived_fields(frame: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    frame = frame.copy()
    frame["is_most_deprived_decile"] = frame["imd_decile"].eq(1)
    frame["is_bottom_3_deciles"] = frame["imd_decile"].le(3)
    frame["deprivation_weight"] = 11 - frame["imd_decile"]

    projected = frame.to_crs("EPSG:27700")
    centroids = projected.geometry.centroid
    frame["centroid_easting"] = centroids.x.round(3)
    frame["centroid_northing"] = centroids.y.round(3)

    wgs84_centroids = gpd.GeoSeries(centroids, crs="EPSG:27700").to_crs("EPSG:4326")
    frame["centroid_lon"] = wgs84_centroids.x.round(7)
    frame["centroid_lat"] = wgs84_centroids.y.round(7)
    return frame


def build_outputs() -> dict[str, object]:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    boundaries = load_boundaries()
    imd = load_imd()
    population = load_population()

    joined = boundaries.merge(imd, on="lsoa21cd", how="left", validate="one_to_one")
    joined = joined.merge(population, on="lsoa21cd", how="left", validate="one_to_one")

    if joined["imd_decile"].isna().any():
        missing = joined.loc[joined["imd_decile"].isna(), "lsoa21cd"].tolist()
        raise ValueError(f"Missing IMD join for {len(missing)} LSOAs: {missing[:5]}")
    if joined["population_mid_2024"].isna().any():
        missing = joined.loc[joined["population_mid_2024"].isna(), "lsoa21cd"].tolist()
        raise ValueError(f"Missing population join for {len(missing)} LSOAs: {missing[:5]}")

    joined = add_derived_fields(joined)

    bbox_geom = box(
        STUDY_AREA_WGS84_BBOX["min_lon"],
        STUDY_AREA_WGS84_BBOX["min_lat"],
        STUDY_AREA_WGS84_BBOX["max_lon"],
        STUDY_AREA_WGS84_BBOX["max_lat"],
    )
    study_area = joined.loc[joined.intersects(bbox_geom)].copy()

    joined.to_file(ALL_BIRMINGHAM_OUTPUT, driver="GeoJSON")
    study_area.to_file(STUDY_AREA_OUTPUT, driver="GeoJSON")

    summary = {
        "built_at_utc": datetime.now(timezone.utc).isoformat(),
        "inputs": {
            "boundaries": BOUNDARIES_PATH.relative_to(ROOT).as_posix(),
            "imd": IMD_PATH.relative_to(ROOT).as_posix(),
            "population": POPULATION_PATH.relative_to(ROOT).as_posix(),
        },
        "outputs": {
            "all_birmingham": ALL_BIRMINGHAM_OUTPUT.relative_to(ROOT).as_posix(),
            "study_area": STUDY_AREA_OUTPUT.relative_to(ROOT).as_posix(),
        },
        "study_area_bbox_wgs84": STUDY_AREA_WGS84_BBOX,
        "all_birmingham_lsoa_count": int(len(joined)),
        "study_area_lsoa_count": int(len(study_area)),
        "study_area_population_mid_2024": int(study_area["population_mid_2024"].sum()),
        "study_area_most_deprived_decile_population_mid_2024": int(
            study_area.loc[study_area["imd_decile"].eq(1), "population_mid_2024"].sum()
        ),
    }
    METADATA_OUTPUT.write_text(json.dumps(summary, indent=2) + "\n")
    return summary


def main() -> None:
    summary = build_outputs()
    print("Stage 0 geography built:")
    for key, value in summary.items():
        if key in {"inputs", "outputs", "study_area_bbox_wgs84"}:
            continue
        print(f"- {key}: {value}")
    print(f"- all Birmingham: {summary['outputs']['all_birmingham']}")
    print(f"- study area: {summary['outputs']['study_area']}")
    print(f"- metadata: {METADATA_OUTPUT.relative_to(ROOT).as_posix()}")


if __name__ == "__main__":
    main()
