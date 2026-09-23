import { FlyToInterpolator, type PickingInfo } from "@deck.gl/core";
import DeckGL from "@deck.gl/react";
import type { Map as MaplibreMap } from "maplibre-gl";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import Map, { AttributionControl } from "react-map-gl/maplibre";
import {
  FALLBACK_VIEW,
  resolveCamera,
  type CameraTarget,
  type MapViewState,
  type Padding
} from "@/lib/camera";
import { decileSentence } from "@/lib/deprivation";
import { formatNumber, modeLabel } from "@/lib/format";
import { usePalette } from "@/lib/usePalette";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { useTheme } from "@/lib/theme";
import type { GeoJsonFeature, OptimisationResult, ScenarioResponse, StopDetail } from "@/types";
import { buildLayers, deriveMapState, type MapDerived, type MapMarker, type MapMode } from "./layers";

const MAP_STYLES = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
} as const;
const BUILDINGS_LAYER_ID = "accessbridge-buildings-3d";
const NO_PADDING: Padding = { top: 24, right: 24, bottom: 24, left: 24 };
const NO_MARKERS: MapMarker[] = [];

type ViewState = MapViewState & {
  transitionDuration?: number | "auto";
  transitionInterpolator?: FlyToInterpolator;
};

type Tooltip = { x: number; y: number; title: string; subtitle?: string; lines: string[] };

export type MapCanvasProps = {
  scenario: ScenarioResponse;
  result: OptimisationResult | null;
  mode: MapMode;
  is3d: boolean;
  camera: CameraTarget;
  cameraKey: string;
  description: string;
  padding?: Padding;
  focusStopId?: string | null;
  onSelectStop?: (candidateId: string) => void;
  showCandidates?: boolean;
  showRailMetro?: boolean;
  showNetwork?: boolean;
  markers?: MapMarker[];
  buildings3d?: boolean;
  children?: ReactNode;
};

function describeNeighbourhood(
  feature: GeoJsonFeature,
  mode: MapMode,
  derived: MapDerived
): Omit<Tooltip, "x" | "y"> {
  const props = feature.properties;
  const id = String(props.lsoa21cd ?? "");
  const decile = Number(props.imd_decile ?? 10);
  const lines = [
    decileSentence(decile),
    `${formatNumber(Number(props.population_mid_2024 ?? 0))} residents`
  ];

  if (mode === "gap") {
    lines.push(
      derived.baselineIds.has(id)
        ? `Can walk to a rail or Metro stop within ${derived.threshold} minutes`
        : `No rail or Metro stop within a ${derived.threshold}-minute walk`
    );
  }
  if (mode === "gain") {
    const reach = derived.reachByOrigin.get(id);
    lines.push(
      reach
        ? `${Math.max(1, Math.round(reach.minutes))} min walk to stop ${reach.number}, ${reach.stop.name ?? "new stop"}`
        : "Not within walking reach of a new stop"
    );
  }

  return {
    title: String(props.place_name ?? props.boundary_lsoa21nm ?? "Neighbourhood"),
    subtitle: String(props.boundary_lsoa21nm ?? ""),
    lines
  };
}

function describeStop(object: unknown, derived: MapDerived): Omit<Tooltip, "x" | "y"> {
  const maybeDetail = object as Partial<StopDetail>;
  if (typeof maybeDetail.people_reached === "number") {
    const stop = object as StopDetail;
    const number = derived.stopNumbers.get(stop.candidate_id);
    return {
      title: `${number}. ${stop.name ?? "New stop"}`,
      subtitle: `${stop.place_name} · ${modeLabel(stop.mode_hint)}`,
      lines: [
        `Reaches ${formatNumber(stop.people_reached)} people`,
        `${formatNumber(stop.most_deprived_reached)} in the most deprived 10%`
      ]
    };
  }
  const feature = object as GeoJsonFeature;
  const props = feature.properties ?? {};
  return {
    title: String(props.name ?? "Stop"),
    subtitle: `${String(props.place_name ?? "")} · ${modeLabel(String(props.mode_hint ?? ""))}`,
    lines: props.is_interchange ? ["Part of today's rail and Metro network"] : ["Possible stop location"]
  };
}

export function MapCanvas({
  scenario,
  result,
  mode,
  is3d,
  camera,
  cameraKey,
  description,
  padding = NO_PADDING,
  focusStopId = null,
  onSelectStop,
  showCandidates = false,
  showRailMetro = false,
  showNetwork = true,
  markers = NO_MARKERS,
  buildings3d = false,
  children
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const appliedKey = useRef<string | null>(null);
  const reducedMotion = useReducedMotion();
  const palette = usePalette();
  const { resolved: theme } = useTheme();
  const descriptionId = useId();
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [viewState, setViewState] = useState<ViewState>(FALLBACK_VIEW);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [routeProgress, setRouteProgress] = useState(1);
  const routeKey =
    showNetwork && result?.feasible ? result.selected_stops.map((stop) => stop.candidate_id).join("|") : "";

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((current) =>
        current && Math.abs(current.width - width) < 1 && Math.abs(current.height - height) < 1
          ? current
          : { width, height }
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!size || appliedKey.current === cameraKey) return;
    const target = resolveCamera(camera, size.width, size.height, padding);
    const animate = appliedKey.current !== null && !reducedMotion;
    appliedKey.current = cameraKey;
    setViewState(
      animate
        ? {
            ...target,
            transitionDuration: "auto",
            transitionInterpolator: new FlyToInterpolator({ speed: 1.5, maxDuration: 2600 })
          }
        : target
    );
  }, [camera, cameraKey, padding, reducedMotion, size]);

  // Draw the route stop by stop whenever a new set of stops appears.
  useEffect(() => {
    if (!routeKey || reducedMotion) {
      setRouteProgress(1);
      return;
    }
    const delay = 350;
    const duration = 1500;
    let frame = 0;
    setRouteProgress(0);
    const started = performance.now() + delay;
    const tick = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - started) / duration));
      setRouteProgress(1 - Math.pow(1 - progress, 3));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const safety = window.setTimeout(() => setRouteProgress(1), delay + duration + 400);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(safety);
    };
  }, [routeKey, reducedMotion]);

  const derived = useMemo(
    () => deriveMapState(scenario, result, focusStopId),
    [scenario, result, focusStopId]
  );

  const layers = useMemo(
    () =>
      buildLayers(
        {
          scenario,
          result,
          mode,
          is3d,
          focusStopId,
          showCandidates,
          showRailMetro,
          showNetwork,
          markers,
          routeProgress,
          palette
        },
        derived
      ),
    [scenario, result, mode, is3d, focusStopId, showCandidates, showRailMetro, showNetwork, markers, derived, routeProgress, palette]
  );

  const syncBuildings = useCallback(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer(BUILDINGS_LAYER_ID)) return;
    map.setLayoutProperty(BUILDINGS_LAYER_ID, "visibility", buildings3d ? "visible" : "none");
  }, [buildings3d]);

  useEffect(syncBuildings, [syncBuildings]);

  const onMapLoad = useCallback(
    (event: { target: MaplibreMap }) => {
      const map = event.target;
      mapRef.current = map;
      if (!map.getLayer(BUILDINGS_LAYER_ID) && map.getSource("carto")) {
        map.addLayer({
          id: BUILDINGS_LAYER_ID,
          type: "fill-extrusion",
          source: "carto",
          "source-layer": "building",
          minzoom: 13.5,
          layout: { visibility: buildings3d ? "visible" : "none" },
          paint: {
            "fill-extrusion-color": theme === "dark" ? "#2b3446" : "#d7d9e0",
            "fill-extrusion-height": ["coalesce", ["get", "render_height"], 9],
            "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
            "fill-extrusion-opacity": 0.9
          }
        });
      }
      syncBuildings();
    },
    [buildings3d, syncBuildings, theme]
  );

  const onHover = useCallback(
    (info: PickingInfo) => {
      if (!info.object || !info.layer) {
        setTooltip(null);
        return;
      }
      const content =
        info.layer.id === "neighbourhoods"
          ? describeNeighbourhood(info.object as GeoJsonFeature, mode, derived)
          : describeStop(info.object, derived);
      setTooltip({ ...content, x: info.x, y: info.y });
    },
    [derived, mode]
  );

  const onClick = useCallback(
    (info: PickingInfo) => {
      if (info.layer?.id === "selected-stops" && info.object && onSelectStop) {
        onSelectStop((info.object as StopDetail).candidate_id);
      }
    },
    [onSelectStop]
  );

  const tooltipStyle = useMemo(() => {
    if (!tooltip || !size) return undefined;
    const flipX = tooltip.x > size.width - 300;
    const flipY = tooltip.y > size.height - 160;
    return {
      left: flipX ? undefined : tooltip.x + 14,
      right: flipX ? size.width - tooltip.x + 14 : undefined,
      top: flipY ? undefined : tooltip.y + 14,
      bottom: flipY ? size.height - tooltip.y + 14 : undefined
    };
  }, [size, tooltip]);

  return (
    <div
      data-testid="map-canvas"className="relative size-full min-h-80 overflow-hidden bg-secondary"ref={containerRef}
      role="region"aria-label="Map"aria-describedby={descriptionId}
      onMouseLeave={() => setTooltip(null)}
    >
      <p id={descriptionId} className="visually-hidden">
        {description}
      </p>
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: next }) => setViewState(next as ViewState)}
        controller={{ dragRotate: true, touchRotate: true, keyboard: true }}
        layers={layers}
        onHover={onHover}
        onClick={onClick}
        getCursor={({ isDragging, isHovering }) =>
          isDragging ? "grabbing" : isHovering ? "pointer" : "grab"
        }
      >
        <Map key={theme} mapStyle={MAP_STYLES[theme]} reuseMaps attributionControl={false} onLoad={onMapLoad}>
          <AttributionControl compact position="bottom-right" />
        </Map>
      </DeckGL>
      {tooltip ? (
        <div
          style={tooltipStyle}
          aria-hidden="true"data-testid="map-tooltip"className="pointer-events-none absolute z-50 grid max-w-72 gap-0.5 rounded-md border border-border px-3 py-2.5 text-sm leading-snug text-muted-foreground floating"
        >
          <strong className="text-base text-foreground">{tooltip.title}</strong>
          {tooltip.subtitle ? <span className="mb-1 text-xs text-dim">{tooltip.subtitle}</span> : null}
          {tooltip.lines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      ) : null}
      {children}
    </div>
  );
}
