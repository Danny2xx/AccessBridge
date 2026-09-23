/**
 * Deprivation bands used on the map and in charts.
 *
 * IMD deciles are national: decile 1 is the most deprived 10% of neighbourhoods
 * in England. Five bands keep the map legible (125 of the 174 study-area
 * neighbourhoods are in decile 1). The ramp is one hue ordered by lightness, so
 * it survives colour blindness; it was validated as an ordinal ramp against the
 * dark map surface.
 */

export type BandId = "d1" | "d2" | "d3" | "d4-5" | "d6-10";

export type Band = {
  id: BandId;
  label: string;
  short: string;
  deciles: number[];
  /** Index into the theme's deprivation ramp, most deprived first. */
  step: 0 | 1 | 2 | 3 | 4;
};

export const BANDS: Band[] = [
  { id: "d1", label: "Most deprived 10% in England", short: "Most deprived 10%", deciles: [1], step: 0 },
  { id: "d2", label: "10–20% most deprived", short: "10–20%", deciles: [2], step: 1 },
  { id: "d3", label: "20–30% most deprived", short: "20–30%", deciles: [3], step: 2 },
  { id: "d4-5", label: "30–50% most deprived", short: "30–50%", deciles: [4, 5], step: 3 },
  {
    id: "d6-10",
    label: "Least deprived half",
    short: "Least deprived half",
    deciles: [6, 7, 8, 9, 10],
    step: 4
  }
];

export function bandForDecile(decile: number): Band {
  return BANDS.find((band) => band.deciles.includes(decile)) ?? BANDS[BANDS.length - 1];
}

export function decileSentence(decile: number): string {
  if (decile === 1) return "Among the most deprived 10% of neighbourhoods in England";
  if (decile >= 6) return "In the less deprived half of neighbourhoods in England";
  return `Among the ${(decile - 1) * 10}–${decile * 10}% most deprived neighbourhoods in England`;
}

export type BandTotals = { band: Band; today: number; newStops: number };

export function totalsByBand(
  rows: Array<{ imd_decile: number; baseline_population: number; scenario_population: number }>
): BandTotals[] {
  return BANDS.map((band) => {
    const inBand = rows.filter((row) => band.deciles.includes(row.imd_decile));
    return {
      band,
      today: inBand.reduce((sum, row) => sum + row.baseline_population, 0),
      newStops: inBand.reduce((sum, row) => sum + row.scenario_population, 0)
    };
  });
}
