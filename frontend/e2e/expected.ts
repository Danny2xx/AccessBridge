import type { APIRequestContext } from "@playwright/test";
import type { EvidenceResponse } from "../src/types";

export type Expected = {
  mostDeprivedReached: string;
  mostDeprivedGain: string;
  reachedToday: string;
  population: string;
  stopCount: number;
  secondStopNeighbourhoods: number;
  budgetPoints: number;
  costPerResident: string;
  busStops: number;
  railMetroStops: number;
  totalCost: string;
};

const gbp = (value: number) => `£${new Intl.NumberFormat("en-GB").format(value)}`;
const num = (value: number) => new Intl.NumberFormat("en-GB").format(value);

/** Read the figures the site should show from the API, so tests never pin a matrix. */
export async function loadExpected(request: APIRequestContext): Promise<Expected> {
  const evidence = (await (await request.get("http://127.0.0.1:8000/evidence")).json()) as EvidenceResponse;
  const result = evidence.default_result;
  const comparison = result.accessibility!;
  const gain = comparison.delta_most_deprived_decile_population;
  const byMode = (mode: string, cost: number) =>
    result.stop_details.filter((s) => s.mode_hint === mode && s.cost_gbp === cost).length;
  return {
    mostDeprivedReached: num(comparison.scenario.most_deprived_decile_population),
    mostDeprivedGain: (gain >= 0 ? "+" : "−") + num(Math.abs(gain)),
    reachedToday: num(comparison.baseline.most_deprived_decile_population),
    population: num(evidence.study_area.population),
    stopCount: result.stop_details.length,
    secondStopNeighbourhoods: result.stop_details[1]?.neighbourhoods.length ?? 0,
    budgetPoints: evidence.budget_sensitivity.length,
    costPerResident: `£${(evidence.cost_per_most_deprived_resident_gbp ?? 0).toFixed(2)}`,
    busStops: byMode("bus", 75_000),
    railMetroStops: result.stop_details.filter((s) => s.is_interchange).length,
    totalCost: gbp(result.total_cost_gbp)
  };
}
