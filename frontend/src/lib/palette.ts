export type RGBA = [number, number, number, number];

/** Convert a CSS hex colour to the RGBA array deck.gl expects. */
export function rgba(hex: string, alpha = 255): RGBA {
  const value = Number.parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, alpha];
}
