import { BANDS } from "../lib/deprivation";
import { COLOR } from "../lib/palette";
import type { MapMode } from "../map/layers";

type LegendItem = { color: string; label: string; shape?: "swatch" | "dot" | "number" };

function legendItems(
  mode: MapMode,
  threshold: number,
  showNetwork: boolean,
  showRailMetro: boolean,
  showCandidates: boolean
): LegendItem[] {
  const items: LegendItem[] = [];
  if (mode === "need") {
    BANDS.forEach((band) => items.push({ color: band.color, label: band.label }));
  }
  if (mode === "gap") {
    items.push(
      { color: COLOR.need, label: `Most deprived 10%, no rail or Metro within ${threshold} min` },
      { color: COLOR.today, label: `Can walk to rail or Metro within ${threshold} min` },
      { color: COLOR.mapNeutral, label: "Other neighbourhoods" }
    );
  }
  if (mode === "gain") {
    items.push(
      { color: COLOR.amberData, label: `Within a ${threshold}-minute walk of a new stop` },
      { color: COLOR.today, label: "Can walk to rail or Metro, not a new stop" },
      { color: COLOR.mapNeutral, label: "Neither" }
    );
  }
  if (showNetwork) items.push({ color: COLOR.amberUi, label: "New stop, numbered along the route", shape: "number" });
  if (showRailMetro) items.push({ color: "#aacaf0", label: "Rail or Metro stop today", shape: "dot" });
  if (showCandidates) items.push({ color: "#cdd6e4", label: "Possible stop location", shape: "dot" });
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
};

export function MapLegend({
  mode,
  threshold,
  showNetwork = false,
  showRailMetro = false,
  showCandidates = false
}: MapLegendProps) {
  const items = legendItems(mode, threshold, showNetwork, showRailMetro, showCandidates);
  if (items.length === 0) return null;
  return (
    <div className="map-legend">
      <p className="map-legend-title">{TITLES[mode]}</p>
      <ul>
        {items.map((item) => (
          <li key={item.label}>
            <span
              className={`legend-key legend-key--${item.shape ?? "swatch"}`}
              style={{ background: item.color }}
              aria-hidden="true"
            >
              {item.shape === "number" ? "1" : null}
            </span>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
