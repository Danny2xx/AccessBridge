import { BANDS } from "@/lib/deprivation";
import { usePalette } from "@/lib/usePalette";
import type { MapMode } from "@/map/layers";

type LegendItem = { color: string; label: string; shape?: "swatch" | "dot" | "number" };

function legendItems(
  palette: ReturnType<typeof usePalette>,
  mode: MapMode,
  threshold: number,
  showNetwork: boolean,
  showRailMetro: boolean,
  showCandidates: boolean
): LegendItem[] {
  const items: LegendItem[] = [];
  if (mode === "need") BANDS.forEach((band) => items.push({ color: palette.needRamp[band.step], label: band.label }));
  if (mode === "gap") {
    items.push(
      { color: palette.need, label: `Most deprived 10%, no rail or Metro within ${threshold} min` },
      { color: palette.today, label: `Can walk to rail or Metro within ${threshold} min` },
      { color: palette.mapNeutral, label: "Other neighbourhoods" }
    );
  }
  if (mode === "gain") {
    items.push(
      { color: palette.proposal, label: `Within a ${threshold}-minute walk of a new stop` },
      { color: palette.today, label: "Can walk to rail or Metro, not a new stop" },
      { color: palette.mapNeutral, label: "Neither" }
    );
  }
  if (showNetwork) items.push({ color: palette.proposal, label: "New stop, numbered along the route", shape: "number" });
  if (showRailMetro) items.push({ color: palette.today, label: "Rail or Metro stop today", shape: "dot" });
  if (showCandidates) items.push({ color: palette.mapNeutral, label: "Possible stop location", shape: "dot" });
  return items;
}

const TITLES: Record<MapMode, string> = {
  plain: "The study area",
  need: "How deprived each neighbourhood is",
  gap: "Who can walk to rail or Metro today",
  gain: "Who the new stops reach"
};

type MapLegendProps = {
  mode: MapMode;
  threshold: number;
  showNetwork?: boolean;
  showRailMetro?: boolean;
  showCandidates?: boolean;
  className?: string;
};

export function MapLegend({
  mode,
  threshold,
  showNetwork = false,
  showRailMetro = false,
  showCandidates = false,
  className = ""
}: MapLegendProps) {
  const palette = usePalette();
  const items = legendItems(palette, mode, threshold, showNetwork, showRailMetro, showCandidates);
  if (items.length === 0) return null;

  return (
    <div
      data-testid="map-legend"className={`pointer-events-none absolute z-10 max-w-[19rem] rounded-xl border border-border bg-popover/85 p-3.5 text-[0.8125rem] leading-snug  ${className}`}
    >
      <p className="mb-2 font-bold">{TITLES[mode]}</p>
      <ul className="grid gap-1.5 text-muted-foreground">
        {items.map((item) => (
          <li key={item.label} className="grid grid-cols-[1.125rem_1fr] items-center gap-2">
            {item.shape === "number" ? (
              <span
                className="grid size-[1.125rem] place-items-center rounded-full text-[0.6875rem] font-semibold text-primary-foreground"style={{ background: item.color }}
                aria-hidden="true"
              >
                1
              </span>
            ) : item.shape === "dot" ? (
              <span
                className="ml-0.5 size-2.5 rounded-full ring-2 ring-background"style={{ background: item.color }}
                aria-hidden="true"
              />
            ) : (
              <span className="size-3.5 rounded-[3px]"style={{ background: item.color }} aria-hidden="true" />
            )}
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
