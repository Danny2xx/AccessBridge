"""Write the API's responses as static JSON so the site can be hosted without a server.

The Explore controls only ever produce a finite set of requests: every budget
step, stop limit, walking time and interchange setting. Solving each once and
saving the result lets GitHub Pages or any static host serve the whole site.
`frontend/src/api.ts` reads these files when built with VITE_STATIC_API=true.
"""

from __future__ import annotations

import argparse
import itertools
import json
import shutil
import time
from pathlib import Path

from app.accessibility import (
    compare_travel_time_accessibility,
    load_candidate_stops,
    load_travel_time_matrix,
    prepare_travel_time_matrix,
)
from app.api.routes import build_scenario_response
from app.config import get_settings
from app.evidence import get_evidence
from app.insights import enrich_result
from app.main import health_payload
from app.optimisation import optimise_stop_selection
from app.places import load_place_names
from app.schemas import OptimisationRequest

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "frontend" / "public" / "api"

# Mirrors the Explore controls in frontend/src/pages/ExplorePage.tsx.
BUDGETS = range(75_000, 1_500_001, 75_000)
MAX_STOPS = range(1, 13)
THRESHOLDS = (5, 10, 15, 20)
INTERCHANGE = (True, False)


def request_key(request: OptimisationRequest) -> str:
    flag = 1 if request.require_interchange else 0
    return f"b{request.budget_gbp}_s{request.max_stops}_t{request.threshold_min}_i{flag}"


def dump(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, separators=(",", ":")))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    output: Path = args.output

    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)

    settings = get_settings()
    dump(output / "health.json", health_payload(settings).model_dump())
    dump(output / "scenario.json", build_scenario_response(settings).model_dump())
    dump(output / "evidence.json", get_evidence(settings).model_dump())

    matrix = load_travel_time_matrix(settings=settings)
    candidate_stops = load_candidate_stops(settings)
    places = load_place_names(settings)
    prepared = {
        threshold: prepare_travel_time_matrix(matrix, threshold) for threshold in THRESHOLDS
    }

    started = time.perf_counter()
    count = 0
    for budget, stops, threshold, interchange in itertools.product(
        BUDGETS, MAX_STOPS, THRESHOLDS, INTERCHANGE
    ):
        request = OptimisationRequest(
            budget_gbp=budget,
            max_stops=stops,
            threshold_min=threshold,
            require_interchange=interchange,
        )
        result = optimise_stop_selection(
            prepared[threshold], request, comparison_builder=compare_travel_time_accessibility
        )
        result = enrich_result(result, prepared[threshold], candidate_stops, places)
        dump(output / "optimise" / f"{request_key(request)}.json", result.model_dump())
        count += 1
        if count % 200 == 0:
            print(f"  {count} scenarios in {time.perf_counter() - started:.0f}s")

    size_mb = sum(p.stat().st_size for p in output.rglob("*.json")) / 1e6
    print(f"wrote {count} scenarios plus scenario, evidence and health")
    print(f"to {output.relative_to(ROOT)} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
