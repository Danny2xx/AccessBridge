"""Route origin-to-candidate travel times on real streets and timetables with R5.

Runs under the separate routing environment (`.venv-routing`, Python 3.12) with a
JDK 21 on `JAVA_HOME`, because r5py needs both. The main application never imports
this module; it only consumes the CSV this writes, through
`scripts/build_stage7_travel_time_matrix.py --r5-input`.

Two profiles are produced from one network build:

- `walk`: walking time along the OpenStreetMap street network. This is the
  active matrix, because every figure on the site is described as a walk.
- `walk_transit`: walking plus bus and Metro from the GTFS feed, for comparison
  and for a future "reach by public transport" view.

Unreachable pairs are written as UNREACHABLE_MINUTES so the Stage 7 builder, which
rejects missing values, treats them as beyond every threshold.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import time
from pathlib import Path

import geopandas as gpd
import pandas as pd
from shapely.geometry import Point

ROOT = Path(__file__).resolve().parents[1]
PROCESSED = ROOT / "data" / "processed"
EXTERNAL = ROOT / "data" / "external"

UNREACHABLE_MINUTES = 999
WALK_SPEED_KMH = 4.8  # 80 metres a minute, matching the Stage 0 proxy assumption


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_points() -> tuple[gpd.GeoDataFrame, gpd.GeoDataFrame]:
    lsoa = gpd.read_file(PROCESSED / "study_area_lsoa_imd_population.geojson")
    origins = gpd.GeoDataFrame(
        {"id": lsoa["lsoa21cd"].astype(str)},
        geometry=[Point(x, y) for x, y in zip(lsoa["centroid_lon"], lsoa["centroid_lat"])],
        crs="EPSG:4326",
    )
    stops = gpd.read_file(PROCESSED / "candidate_stops.geojson").to_crs("EPSG:4326")
    destinations = gpd.GeoDataFrame(
        {"id": stops["candidate_id"].astype(str)}, geometry=stops.geometry, crs="EPSG:4326"
    )
    return origins, destinations


def route(
    network,
    origins,
    destinations,
    profile: str,
    departure: dt.datetime,
    window: dt.timedelta,
    max_minutes: int,
):
    from r5py import TransportMode, TravelTimeMatrix

    modes = (
        [TransportMode.WALK] if profile == "walk" else [TransportMode.WALK, TransportMode.TRANSIT]
    )
    started = time.perf_counter()
    matrix = TravelTimeMatrix(
        network,
        origins=origins,
        destinations=destinations,
        departure=departure,
        departure_time_window=window,
        transport_modes=modes,
        max_time=dt.timedelta(minutes=max_minutes),
        speed_walking=WALK_SPEED_KMH,
        snap_to_network=True,
    )
    frame = pd.DataFrame(matrix)[["from_id", "to_id", "travel_time"]].rename(
        columns={"from_id": "origin_id", "to_id": "candidate_id", "travel_time": "travel_time_min"}
    )
    elapsed = time.perf_counter() - started
    return frame, elapsed


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gtfs", type=Path, default=EXTERNAL / "gtfs_west_midlands_bods.zip")
    parser.add_argument("--osm", type=Path, default=EXTERNAL / "west-midlands-latest.osm.pbf")
    parser.add_argument(
        "--departure", default="2026-09-29T08:00", help="Local departure time, ISO format"
    )
    parser.add_argument("--window-minutes", type=int, default=60)
    parser.add_argument(
        "--profiles", nargs="+", default=["walk", "walk_transit"], choices=["walk", "walk_transit"]
    )
    args = parser.parse_args()

    from r5py import TransportNetwork

    departure = dt.datetime.fromisoformat(args.departure)
    origins, destinations = load_points()
    print(f"origins {len(origins)} | destinations {len(destinations)}")
    print(f"departure {departure:%A %Y-%m-%d %H:%M}")

    started = time.perf_counter()
    network = TransportNetwork(str(args.osm), [str(args.gtfs)])
    print(f"network built in {time.perf_counter() - started:.0f}s")

    import r5py

    for profile in args.profiles:
        max_minutes = 60 if profile == "walk" else 120
        frame, elapsed = route(
            network,
            origins,
            destinations,
            profile,
            departure,
            dt.timedelta(minutes=args.window_minutes),
            max_minutes,
        )
        unreachable = int(frame["travel_time_min"].isna().sum())
        frame["travel_time_min"] = frame["travel_time_min"].fillna(UNREACHABLE_MINUTES).round(2)
        frame = frame.sort_values(["origin_id", "candidate_id"]).reset_index(drop=True)

        output = PROCESSED / f"r5_{profile}_matrix.csv"
        frame.to_csv(output, index=False)
        reachable = frame.loc[frame["travel_time_min"] < UNREACHABLE_MINUTES, "travel_time_min"]
        provenance = {
            "built_at_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
            "profile": profile,
            "engine": f"r5py {r5py.__version__}",
            "departure_local": departure.isoformat(),
            "departure_window_minutes": args.window_minutes,
            "max_travel_minutes": max_minutes,
            "walk_speed_kmh": WALK_SPEED_KMH,
            "unreachable_sentinel_minutes": UNREACHABLE_MINUTES,
            "pairs": int(len(frame)),
            "unreachable_pairs": unreachable,
            "median_reachable_minutes": round(float(reachable.median()), 2)
            if len(reachable)
            else None,
            "within_10_min_pairs": int((frame["travel_time_min"] <= 10).sum()),
            "routing_seconds": round(elapsed, 1),
            "inputs": {
                "gtfs": {"path": str(args.gtfs.relative_to(ROOT)), "sha256": sha256(args.gtfs)},
                "osm": {"path": str(args.osm.relative_to(ROOT)), "sha256": sha256(args.osm)},
            },
        }
        (PROCESSED / f"r5_{profile}_provenance.json").write_text(
            json.dumps(provenance, indent=2) + "\n"
        )
        print(
            f"{profile}: {len(frame)} pairs, {unreachable} unreachable, "
            f"within 10 min {provenance['within_10_min_pairs']}, "
            f"routed in {elapsed:.0f}s -> {output.name}"
        )


if __name__ == "__main__":
    main()
