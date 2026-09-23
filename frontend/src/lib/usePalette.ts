import { useEffect, useState } from "react";
import { useTheme } from "./theme";

export type Palette = {
  proposal: string;
  today: string;
  need: string;
  needRamp: [string, string, string, string, string];
  mapNeutral: string;
  mapLine: string;
  ink: string;
  primaryForeground: string;
};

const FALLBACK: Palette = {
  proposal: "#007b5a",
  today: "#0073cf",
  need: "#c6481c",
  needRamp: ["#a22d00", "#ba451c", "#c76445", "#d2826a", "#da9f8d"],
  mapNeutral: "#c9cad2",
  mapLine: "#ffffff",
  ink: "#101114",
  primaryForeground: "#ffffff"
};

function readPalette(): Palette {
  if (typeof window === "undefined") return FALLBACK;
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
  return {
    proposal: read("--proposal", FALLBACK.proposal),
    today: read("--today", FALLBACK.today),
    need: read("--need", FALLBACK.need),
    needRamp: [
      read("--need-1", FALLBACK.needRamp[0]),
      read("--need-2", FALLBACK.needRamp[1]),
      read("--need-3", FALLBACK.needRamp[2]),
      read("--need-4", FALLBACK.needRamp[3]),
      read("--need-5", FALLBACK.needRamp[4])
    ],
    mapNeutral: read("--map-neutral", FALLBACK.mapNeutral),
    mapLine: read("--map-line", FALLBACK.mapLine),
    ink: read("--foreground", FALLBACK.ink),
    primaryForeground: read("--primary-foreground", FALLBACK.primaryForeground)
  };
}

/** The data colours for the current theme, read from the CSS tokens. */
export function usePalette(): Palette {
  const { resolved } = useTheme();
  const [palette, setPalette] = useState<Palette>(readPalette);

  useEffect(() => {
    setPalette(readPalette());
  }, [resolved]);

  return palette;
}
