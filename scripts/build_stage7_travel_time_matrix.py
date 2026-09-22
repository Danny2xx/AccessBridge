"""Build the Stage 7 travel-time matrix artifact.

By default this normalises the existing Stage 0 proxy matrix into the Stage 7
`travel_time_min` contract. When a real R5/r5py output is available, pass it via
`--r5-input` and this script will merge those travel times onto the same origin
and candidate attributes.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
PROCESSED_DIR = ROOT / "data" / "processed"

PROXY_MATRIX_PATH = PROCESSED_DIR / "accessibility_proxy_matrix.csv"
TRAVEL_TIME_MATRIX_OUTPUT = PROCESSED_DIR / "travel_time_matrix.csv"
METADATA_OUTPUT = PROCESSED_DIR / "stage7_routing_metadata.json"

PAIR_COLUMNS = ["origin_id", "candidate_id"]
TRAVEL_TIME_COLUMN = "travel_time_min"
PROXY_WALK_TIME_COLUMN = "walk_time_min"
THRESHOLD_MINUTES = (5, 10, 15)
PROXY_THRESHOLD_PREFIX = "within_"


def require_file(path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError(f"Missing {display_path(path)}")


def display_path(path: Path | None) -> str | None:
    if path is None:
        return None
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return str(path)


def threshold_columns(frame: pd.DataFrame) -> list[str]:
    return [
        column
        for column in frame.columns
        if column.startswith(PROXY_THRESHOLD_PREFIX) and column.endswith("_min")
    ]


def add_threshold_columns(matrix: pd.DataFrame) -> pd.DataFrame:
    prepared = matrix.drop(columns=threshold_columns(matrix), errors="ignore").copy()
    prepared[TRAVEL_TIME_COLUMN] = pd.to_numeric(
        prepared[TRAVEL_TIME_COLUMN],
        errors="raise",
    ).round(2)
    if prepared[TRAVEL_TIME_COLUMN].isna().any():
        raise ValueError(f"{TRAVEL_TIME_COLUMN} contains missing values")
    if prepared[TRAVEL_TIME_COLUMN].lt(0).any():
        raise ValueError(f"{TRAVEL_TIME_COLUMN} must be non-negative")

    for threshold in THRESHOLD_MINUTES:
        prepared[f"within_{threshold}_min"] = prepared[TRAVEL_TIME_COLUMN].le(threshold)
    return prepared


def proxy_derived_matrix(proxy_matrix_path: Path) -> pd.DataFrame:
    require_file(proxy_matrix_path)
    proxy = pd.read_csv(proxy_matrix_path)
    if PROXY_WALK_TIME_COLUMN not in proxy.columns:
        raise ValueError(f"Proxy matrix is missing {PROXY_WALK_TIME_COLUMN!r}")

    matrix = proxy.copy()
    matrix[TRAVEL_TIME_COLUMN] = matrix[PROXY_WALK_TIME_COLUMN]
    matrix["routing_source"] = "stage0_proxy_derived"
    matrix["routing_profile"] = "walk_proxy"
    return add_threshold_columns(matrix)


def r5_merged_matrix(
    proxy_matrix_path: Path,
    r5_input_path: Path,
    routing_source: str,
    routing_profile: str,
) -> pd.DataFrame:
    require_file(proxy_matrix_path)
    require_file(r5_input_path)

    proxy_raw = pd.read_csv(proxy_matrix_path)
    proxy = proxy_raw.drop(
        columns=[TRAVEL_TIME_COLUMN, *threshold_columns(proxy_raw)],
        errors="ignore",
    )
    r5 = pd.read_csv(r5_input_path)
    missing = sorted({*PAIR_COLUMNS, TRAVEL_TIME_COLUMN}.difference(r5.columns))
    if missing:
        raise ValueError(f"R5 input is missing required columns: {missing}")
    if r5.duplicated(subset=PAIR_COLUMNS).any():
        raise ValueError("R5 input contains duplicate origin_id/candidate_id pairs")

    merged = proxy.merge(
        r5[[*PAIR_COLUMNS, TRAVEL_TIME_COLUMN]],
        on=PAIR_COLUMNS,
        how="left",
        validate="one_to_one",
    )
    missing_times = int(merged[TRAVEL_TIME_COLUMN].isna().sum())
    if missing_times:
        raise ValueError(f"R5 input is missing {missing_times} origin-candidate travel times")

    merged["routing_source"] = routing_source
    merged["routing_profile"] = routing_profile
    return add_threshold_columns(merged)


def build_metadata(
    matrix: pd.DataFrame,
    args: argparse.Namespace,
    source_mode: str,
) -> dict[str, object]:
    return {
        "built_at_utc": datetime.now(timezone.utc).isoformat(),
        "stage": "stage-7-routing-matrix-contract",
        "method": "Origin-candidate travel-time matrix with threshold reachability columns.",
        "source_mode": source_mode,
        "routing_source": str(matrix["routing_source"].iloc[0]),
        "routing_profile": str(matrix["routing_profile"].iloc[0]),
        "current_limitation": (
            "Proxy-derived builds keep the Stage 0 Euclidean walking-time limitation. "
            "Use --r5-input with pinned GTFS and OSM provenance for final R5 routing."
        ),
        "threshold_minutes": list(THRESHOLD_MINUTES),
        "inputs": {
            "proxy_matrix": PROXY_MATRIX_PATH.relative_to(ROOT).as_posix(),
            "r5_input": display_path(args.r5_input),
        },
        "routing_provenance": {
            "gtfs_feed_name": args.gtfs_feed_name,
            "gtfs_feed_path": args.gtfs_feed_path,
            "gtfs_feed_date": args.gtfs_feed_date,
            "osm_extract_name": args.osm_extract_name,
            "osm_extract_path": args.osm_extract_path,
            "osm_extract_date": args.osm_extract_date,
        },
        "outputs": {
            "matrix": TRAVEL_TIME_MATRIX_OUTPUT.relative_to(ROOT).as_posix(),
            "metadata": METADATA_OUTPUT.relative_to(ROOT).as_posix(),
        },
        "origin_count": int(matrix["origin_id"].nunique()),
        "candidate_count": int(matrix["candidate_id"].nunique()),
        "matrix_rows": int(len(matrix)),
    }


def build_outputs(args: argparse.Namespace) -> dict[str, object]:
    if args.r5_input:
        source_mode = "r5_input"
        matrix = r5_merged_matrix(
            proxy_matrix_path=PROXY_MATRIX_PATH,
            r5_input_path=args.r5_input,
            routing_source=args.routing_source,
            routing_profile=args.routing_profile,
        )
    else:
        source_mode = "proxy_derived"
        matrix = proxy_derived_matrix(PROXY_MATRIX_PATH)

    TRAVEL_TIME_MATRIX_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    matrix.to_csv(TRAVEL_TIME_MATRIX_OUTPUT, index=False)
    metadata = build_metadata(matrix, args, source_mode)
    METADATA_OUTPUT.write_text(json.dumps(metadata, indent=2) + "\n")
    return metadata


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--r5-input",
        type=Path,
        default=None,
        help=(
            "Optional CSV from R5/r5py with origin_id, candidate_id, and "
            "travel_time_min columns."
        ),
    )
    parser.add_argument("--routing-source", default="r5")
    parser.add_argument("--routing-profile", default="walk_transit")
    parser.add_argument("--gtfs-feed-name", default=None)
    parser.add_argument("--gtfs-feed-path", default=None)
    parser.add_argument("--gtfs-feed-date", default=None)
    parser.add_argument("--osm-extract-name", default=None)
    parser.add_argument("--osm-extract-path", default=None)
    parser.add_argument("--osm-extract-date", default=None)
    return parser.parse_args()


def main() -> None:
    metadata = build_outputs(parse_args())
    print("Stage 7 travel-time matrix built:")
    print(f"- source mode: {metadata['source_mode']}")
    print(f"- routing source: {metadata['routing_source']}")
    print(f"- routing profile: {metadata['routing_profile']}")
    print(f"- origin count: {metadata['origin_count']}")
    print(f"- candidate count: {metadata['candidate_count']}")
    print(f"- matrix rows: {metadata['matrix_rows']}")
    print(f"- matrix: {metadata['outputs']['matrix']}")
    print(f"- metadata: {metadata['outputs']['metadata']}")


if __name__ == "__main__":
    main()
