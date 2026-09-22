"""Regenerate the Phase 2 / Stage 7 evaluation summary.

This script evaluates the active travel-time matrix contract. The current local
matrix is proxy-derived unless `scripts/build_stage7_travel_time_matrix.py` has
been run with a real R5/r5py input.
"""

from __future__ import annotations

import argparse
import json
from typing import Any

from app.optimisation import optimise_from_travel_time
from app.schemas import OptimisationRequest

DEFAULT_REQUEST = OptimisationRequest(
    budget_gbp=600_000,
    max_stops=8,
    threshold_min=10,
    require_interchange=True,
)


def run_request(label: str, request: OptimisationRequest) -> dict[str, Any]:
    result = optimise_from_travel_time(request)
    if result.accessibility is None:
        return {
            "label": label,
            "request": request.model_dump(),
            "status": result.status,
            "feasible": False,
            "explanation": result.explanation,
        }

    comparison = result.accessibility
    d1_delta = comparison.delta_most_deprived_decile_population
    cost_per_d1_gain = (
        round(result.total_cost_gbp / d1_delta, 2) if d1_delta > 0 else None
    )

    return {
        "label": label,
        "request": request.model_dump(),
        "status": result.status,
        "feasible": result.feasible,
        "selected_stop_count": len(result.selected_stops),
        "selected_stops": [
            {
                "name": stop.name,
                "mode_hint": stop.mode_hint,
                "cost_gbp": stop.cost_gbp,
                "is_interchange": stop.is_interchange,
            }
            for stop in result.selected_stops
        ],
        "total_cost_gbp": result.total_cost_gbp,
        "objective_value": result.objective_value,
        "baseline": comparison.baseline.model_dump(),
        "scenario": comparison.scenario.model_dump(),
        "method": comparison.method,
        "method_caveat": comparison.method_caveat,
        "delta_most_deprived_decile_population": d1_delta,
        "delta_bottom_three_deciles_population": (
            comparison.delta_bottom_three_deciles_population
        ),
        "delta_total_population": comparison.delta_total_population,
        "cost_per_d1_resident_gained_gbp": cost_per_d1_gain,
        "decile_breakdown": [
            row.model_dump() for row in comparison.decile_breakdown
        ],
    }


def evaluation_payload() -> dict[str, Any]:
    return {
        "method": (
            "Stage 7 travel-time matrix contract. The current local matrix is "
            "proxy-derived from Stage 0 walk times until a real R5/r5py input "
            "is supplied."
        ),
        "default": run_request("default", DEFAULT_REQUEST),
        "threshold_sensitivity": [
            run_request(
                f"threshold_{threshold}_min",
                OptimisationRequest(
                    budget_gbp=600_000,
                    max_stops=8,
                    threshold_min=threshold,
                    require_interchange=True,
                ),
            )
            for threshold in (5, 10, 15)
        ],
        "budget_sensitivity": [
            run_request(
                f"budget_{budget}",
                OptimisationRequest(
                    budget_gbp=budget,
                    max_stops=8,
                    threshold_min=10,
                    require_interchange=True,
                ),
            )
            for budget in (450_000, 600_000, 750_000, 900_000)
        ],
    }


def print_markdown(payload: dict[str, Any]) -> None:
    default = payload["default"]
    print("# Phase 2 evaluation summary")
    print()
    print(payload["method"])
    print()
    print("## Default request")
    print()
    print(f"- Budget: GBP {default['request']['budget_gbp']:,}")
    print(f"- Max stops: {default['request']['max_stops']}")
    print(f"- Threshold: {default['request']['threshold_min']} minutes")
    print(f"- Selected stops: {default['selected_stop_count']}")
    print(f"- Cost: GBP {default['total_cost_gbp']:,}")
    print(
        "- Most-deprived-decile resident gain: "
        f"{default['delta_most_deprived_decile_population']:,}"
    )
    print(
        "- Cost per D1 resident gained: "
        f"GBP {default['cost_per_d1_resident_gained_gbp']}"
    )
    print()
    print("## Budget sensitivity")
    print()
    print("| Budget | Stops | Cost | D1 gain | Total population delta |")
    print("|---:|---:|---:|---:|---:|")
    for row in payload["budget_sensitivity"]:
        print(
            f"| GBP {row['request']['budget_gbp']:,} "
            f"| {row['selected_stop_count']} "
            f"| GBP {row['total_cost_gbp']:,} "
            f"| {row['delta_most_deprived_decile_population']:,} "
            f"| {row['delta_total_population']:,} |"
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print full evaluation payload as JSON instead of Markdown.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    payload = evaluation_payload()
    if args.json:
        print(json.dumps(payload, indent=2))
        return
    print_markdown(payload)


if __name__ == "__main__":
    main()
