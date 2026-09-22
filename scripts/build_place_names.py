"""Build human-readable place names for study-area neighbourhoods and stops.

LSOA names such as "Birmingham 067A" mean nothing to residents. NaPTAN already
records a locality for every stop ("Nechells Green", "Aston", "Small Heath"), so
this script reuses it rather than fetching a new dataset:

- a candidate stop takes the most common locality among its source NaPTAN stops;
- a neighbourhood takes the most common locality among the Birmingham stops inside
  it, falling back to the nearest stop when it has none.

Ties break alphabetically so the output is deterministic.
"""

from __future__ import annotations

import json
from collections import Counter
from collections.abc import Iterable
from datetime import datetime, timezone
from pathlib import Path

import geopandas as gpd
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
PROCESSED_DIR = ROOT / "data" / "processed"

BIRMINGHAM_STOPS_PATH = PROCESSED_DIR / "naptan_birmingham_stops.geojson"
CANDIDATE_STOPS_PATH = PROCESSED_DIR / "candidate_stops.geojson"
STUDY_AREA_PATH = PROCESSED_DIR / "study_area_lsoa_imd_population.geojson"
OUTPUT_PATH = PROCESSED_DIR / "place_names.json"

# NaPTAN files the central locality under the city's own name.
LOCALITY_RENAMES = {"Birmingham": "Birmingham City Centre"}


def clean_locality(value: object) -> str | None:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    text = str(value).strip()
    if not text:
        return None
    return LOCALITY_RENAMES.get(text, text)


def most_common(values: Iterable[str | None]) -> str | None:
    counts = Counter(value for value in values if value)
    if not counts:
        return None
    return sorted(counts.items(), key=lambda item: (-item[1], item[0]))[0][0]


def candidate_place_names(
    candidates: gpd.GeoDataFrame,
    locality_by_atco: dict[str, str | None],
) -> dict[str, str]:
    names: dict[str, str] = {}
    for row in candidates.itertuples(index=False):
        codes = str(row.source_atco_codes or "").split(";")
        place = most_common(locality_by_atco.get(code.strip()) for code in codes)
        names[str(row.candidate_id)] = place or str(row.lsoa_name)
    return dict(sorted(names.items()))


def neighbourhood_place_names(
    study_area: gpd.GeoDataFrame,
    stops: gpd.GeoDataFrame,
) -> tuple[dict[str, str], int]:
    by_lsoa = stops.groupby("lsoa21cd")["locality"].agg(list).to_dict()
    stop_xy = np.column_stack([stops["easting"].to_numpy(), stops["northing"].to_numpy()])
    stop_localities = stops["locality"].tolist()

    names: dict[str, str] = {}
    nearest_fallbacks = 0
    for row in study_area.itertuples(index=False):
        code = str(row.lsoa21cd)
        place = most_common(by_lsoa.get(code, []))
        if place is None:
            distances = np.hypot(
                stop_xy[:, 0] - float(row.centroid_easting),
                stop_xy[:, 1] - float(row.centroid_northing),
            )
            for index in np.argsort(distances):
                if stop_localities[index]:
                    place = stop_localities[index]
                    break
            nearest_fallbacks += 1
        names[code] = place or str(row.boundary_lsoa21nm)
    return dict(sorted(names.items())), nearest_fallbacks


def build() -> dict[str, object]:
    for path in (BIRMINGHAM_STOPS_PATH, CANDIDATE_STOPS_PATH, STUDY_AREA_PATH):
        if not path.exists():
            raise FileNotFoundError(f"Missing {path.relative_to(ROOT).as_posix()}")

    stops = gpd.read_file(BIRMINGHAM_STOPS_PATH)
    stops["ATCOCode"] = stops["ATCOCode"].astype(str)
    stops["locality"] = stops["LocalityName"].map(clean_locality)
    candidates = gpd.read_file(CANDIDATE_STOPS_PATH)
    study_area = gpd.read_file(STUDY_AREA_PATH)

    locality_by_atco = dict(zip(stops["ATCOCode"], stops["locality"]))
    candidates_named = candidate_place_names(candidates, locality_by_atco)
    neighbourhoods_named, fallbacks = neighbourhood_place_names(study_area, stops)

    payload: dict[str, object] = {
        "built_at_utc": datetime.now(timezone.utc).isoformat(),
        "method": (
            "Most common NaPTAN LocalityName among the stops belonging to each "
            "candidate or lying inside each LSOA; nearest stop when an LSOA has none."
        ),
        "inputs": [
            BIRMINGHAM_STOPS_PATH.relative_to(ROOT).as_posix(),
            CANDIDATE_STOPS_PATH.relative_to(ROOT).as_posix(),
            STUDY_AREA_PATH.relative_to(ROOT).as_posix(),
        ],
        "renames": LOCALITY_RENAMES,
        "neighbourhood_count": len(neighbourhoods_named),
        "neighbourhoods_named_by_nearest_stop": fallbacks,
        "candidate_count": len(candidates_named),
        "distinct_place_names": len(
            set(neighbourhoods_named.values()) | set(candidates_named.values())
        ),
        "neighbourhoods": neighbourhoods_named,
        "candidates": candidates_named,
    }
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    return payload


def main() -> None:
    payload = build()
    print("Place names built:")
    print(f"- neighbourhoods: {payload['neighbourhood_count']}")
    print(f"- named by nearest stop: {payload['neighbourhoods_named_by_nearest_stop']}")
    print(f"- candidate stops: {payload['candidate_count']}")
    print(f"- distinct place names: {payload['distinct_place_names']}")
    print(f"- output: {OUTPUT_PATH.relative_to(ROOT).as_posix()}")


if __name__ == "__main__":
    main()
