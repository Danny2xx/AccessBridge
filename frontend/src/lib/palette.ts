/**
 * Colour roles. Data colours were validated with the dataviz palette checks on
 * the dark surface: blue and amber as a two-series pair, and blue, amber and
 * magenta-rose all-pairs for the map.
 */

export const COLOR = {
  amberUi: "#f0a53a",
  amberData: "#cc7f1f",
  today: "#4f8fd6",
  need: "#c9508c",
  mapNeutral: "#3b4456",
  mapLine: "#0b1019",
  ink: "#eef2f8",
  surface: "#121a27"
} as const;

export type RGBA = [number, number, number, number];

export function rgba(hex: string, alpha = 255): RGBA {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, alpha];
}
