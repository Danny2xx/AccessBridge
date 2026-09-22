/**
 * Colour roles for the map and charts, mirroring the tokens in index.css.
 *
 * Validated with the dataviz palette checks on the dark map surface: coral,
 * periwinkle and fuchsia clear the all-pairs colour-blind floor (worst 12.4),
 * and the deprivation ramp passes the ordinal checks.
 */

export const COLOR = {
  proposal: "#e0703f",
  proposalUi: "#ff8a5c",
  today: "#6478e8",
  todayUi: "#93a4ff",
  need: "#b94f9e",
  mapNeutral: "#3a3a46",
  mapLine: "#0a0a0b",
  ink: "#fafafa"
} as const;

export type RGBA = [number, number, number, number];

export function rgba(hex: string, alpha = 255): RGBA {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, alpha];
}
