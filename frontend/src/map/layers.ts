import type { Layer } from "@deck.gl/core";
import { ColumnLayer, GeoJsonLayer, PathLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import { bandForDecile } from "@/lib/deprivation";
import { rgba, type RGBA } from "@/lib/palette";
import type { Palette } from "@/lib/usePalette";
import type { GeoJsonFeature, OptimisationResult, ScenarioResponse, StopDetail } from "@/types";

export type MapMode = "plain" | "need" | "gap" | "gain";

export type MapMarker = {
  id: string;
  longitude: number;
  latitude: number;
  label: string;
};

export type MapLayerOptions = {
  scenario: ScenarioResponse;
  result: OptimisationResult | null;
  mode: MapMode;
  is3d: boolean;
  focusStopId: string | null;
  showCandidates: boolean;
  showRailMetro: boolean;
  showNetwork: boolean;
  markers: MapMarker[];
  /** 0 to 1: how much of the route has been drawn. */
  routeProgress: number;
  /** Data colours for the active theme. */
  palette: Palette;
};

export type MapDerived = {
  threshold: number;
  baselineIds: Set<string>;
  coveredIds: Set<string>;
  focusIds: Set<string>;
  stopNumbers: Map<string, number>;
  reachByOrigin: Map<string, { stop: StopDetail; minutes: number; number: number }>;
};

/** Selected stops and the route float above the tallest extrusion in 3D. */
export const NETWORK_ELEVATION = 1700;
const FONT_FAMILY = '"Schibsted Grotesk", system-ui, sans-serif';
const ON_TOP = { depthCompare: "always" as const, depthWriteEnabled: false };

type Colors = {
  need: RGBA;
  today: RGBA;
  proposal: RGBA;
  neutral: RGBA;
  ring: RGBA;
  inkOnProposal: RGBA;
  ramp: RGBA[];
  label: RGBA;
};

function themeColors(palette: Palette): Colors {
  return {
    need: rgba(palette.need),
    today: rgba(palette.today),
    proposal: rgba(palette.proposal),
    neutral: rgba(palette.mapNeutral),
    ring: rgba(palette.mapLine),
    inkOnProposal: rgba(palette.primaryForeground),
    ramp: palette.needRamp.map((step) => rgba(step)),
    label: rgba(palette.ink)
  };
}

export function deriveMapState(
  scenario: ScenarioResponse,
  result: OptimisationResult | null,
  focusStopId: string | null
): MapDerived {
  const feasible = result?.feasible ? result : null;
  const baseline = result?.accessibility?.baseline ?? scenario.baseline;
  const stopNumbers = new Map<string, number>();
  const reachByOrigin: MapDerived["reachByOrigin"] = new Map();

  feasible?.stop_details.forEach((stop, index) => {
    stopNumbers.set(stop.candidate_id, index + 1);
    stop.neighbourhoods.forEach((neighbourhood) => {
      const existing = reachByOrigin.get(neighbourhood.lsoa21cd);
      if (!existing || neighbourhood.travel_time_min < existing.minutes) {
        reachByOrigin.set(neighbourhood.lsoa21cd, {
          stop,
          minutes: neighbourhood.travel_time_min,
          number: index + 1
        });
      }
    });
  });

  const focus = feasible?.stop_details.find((stop) => stop.candidate_id === focusStopId);
  return {
    threshold: result?.threshold_min ?? baseline.threshold_min,
    baselineIds: new Set(baseline.covered_origin_ids),
    coveredIds: new Set(feasible?.covered_origin_ids ?? []),
    focusIds: new Set(focus?.neighbourhoods.map((n) => n.lsoa21cd) ?? []),
    stopNumbers,
    reachByOrigin
  };
}

function lsoaId(feature: GeoJsonFeature): string {
  return String(feature.properties?.lsoa21cd ?? "");
}

function lsoaDecile(feature: GeoJsonFeature): number {
  return Number(feature.properties?.imd_decile ?? 10);
}

function withAlpha(color: RGBA, alpha: number): RGBA {
  return [color[0], color[1], color[2], Math.round(alpha)];
}

/** Extrusion lighting brightens every face, so 3D fills start darker. */
function shade(color: RGBA, factor: number): RGBA {
  return [
    Math.round(color[0] * factor),
    Math.round(color[1] * factor),
    Math.round(color[2] * factor),
    color[3]
  ];
}

function baseFill(feature: GeoJsonFeature, mode: MapMode, derived: MapDerived, colors: Colors): RGBA {
  const id = lsoaId(feature);
  const decile = lsoaDecile(feature);

  switch (mode) {
    case "plain":
      return withAlpha(colors.proposal, 16);
    case "need":
      return withAlpha(colors.ramp[bandForDecile(decile).step], 190);
    case "gap":
      if (derived.baselineIds.has(id)) return withAlpha(colors.today, 150);
      if (decile === 1) return withAlpha(colors.need, 225);
      return withAlpha(colors.neutral, 90);
    case "gain":
      if (derived.coveredIds.has(id)) return withAlpha(colors.proposal, 210);
      if (derived.baselineIds.has(id)) return withAlpha(colors.today, 125);
      return withAlpha(colors.neutral, 70);
  }
}

function fillColor(
  feature: GeoJsonFeature,
  mode: MapMode,
  derived: MapDerived,
  is3d: boolean,
  colors: Colors
): RGBA {
  const color = baseFill(feature, mode, derived, colors);
  const focused = derived.focusIds.has(lsoaId(feature));
  // Translucent extrusions blend into each other, so 3D uses opaque fills.
  if (is3d && mode !== "plain") {
    const solid =
      derived.focusIds.size > 0 && !focused ? withAlpha(colors.neutral, 255) : withAlpha(color, 255);
    return shade(solid, 0.72);
  }
  if (derived.focusIds.size === 0) return color;
  // Keep the catchment readable while letting the 3D buildings show through.
  return focused ? withAlpha(color, 150) : withAlpha(color, color[3] * 0.35);
}

function elevation(feature: GeoJsonFeature, mode: MapMode, derived: MapDerived): number {
  const id = lsoaId(feature);
  const decile = lsoaDecile(feature);
  const population = Number(feature.properties?.population_mid_2024 ?? 0);
  const need = 11 - decile;
  const boost = Math.min(300, population / 15);

  switch (mode) {
    case "plain":
      return 0;
    case "need":
      return 60 + need * 70 + boost;
    case "gap":
      return !derived.baselineIds.has(id) && decile === 1 ? 500 + need * 60 + boost : 30;
    case "gain":
      if (derived.coveredIds.has(id)) return 450 + need * 70 + boost;
      return derived.baselineIds.has(id) ? 80 : 20;
  }
}

function routeCoordinates(result: OptimisationResult | null): number[][] {
  const geometry = result?.route_geojson?.features?.[0]?.geometry;
  if (!geometry || geometry.type !== "LineString" || !Array.isArray(geometry.coordinates)) {
    return [];
  }
  return geometry.coordinates as number[][];
}

/** Cumulative share of the route's length at each vertex, from 0 to 1. */
function vertexFractions(coordinates: number[][]): number[] {
  const lengths = [0];
  for (let index = 1; index < coordinates.length; index += 1) {
    const [lon1, lat1] = coordinates[index - 1];
    const [lon2, lat2] = coordinates[index];
    const dx = (lon2 - lon1) * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
    lengths.push(lengths[index - 1] + Math.hypot(dx, lat2 - lat1));
  }
  const total = lengths[lengths.length - 1] || 1;
  return lengths.map((length) => length / total);
}

/** The part of the route drawn so far, ending partway along a segment. */
function revealedPath(coordinates: number[][], fractions: number[], progress: number, z: number): number[][] {
  if (coordinates.length < 2) return [];
  const path: number[][] = [];
  for (let index = 0; index < coordinates.length; index += 1) {
    const [longitude, latitude] = coordinates[index];
    if (fractions[index] <= progress) {
      path.push([longitude, latitude, z]);
      continue;
    }
    const [prevLon, prevLat] = coordinates[index - 1];
    const span = fractions[index] - fractions[index - 1] || 1;
    const t = (progress - fractions[index - 1]) / span;
    path.push([prevLon + (longitude - prevLon) * t, prevLat + (latitude - prevLat) * t, z]);
    break;
  }
  return path.length >= 2 ? path : [];
}

export function buildLayers(options: MapLayerOptions, derived: MapDerived): Layer[] {
  const {
    scenario,
    result,
    mode,
    is3d,
    focusStopId,
    showCandidates,
    showRailMetro,
    showNetwork,
    routeProgress
  } = options;
  const colors = themeColors(options.palette);
  const layers: Layer[] = [];
  const focusKey = focusStopId ?? "";
  const resultKey = result
    ? `${result.selected_stops.map((s) => s.candidate_id).join("|")}:${result.threshold_min}`
    : "none";

  layers.push(
    new GeoJsonLayer({
      id: "neighbourhoods",
      data: scenario.lsoa_geojson as never,
      pickable: mode !== "plain",
      stroked: true,
      filled: true,
      extruded: is3d && mode !== "plain",
      wireframe: false,
      lineWidthUnits: "pixels",
      getLineWidth: (feature: unknown) =>
        derived.focusIds.has(lsoaId(feature as GeoJsonFeature)) ? 2.5 : mode === "plain" ? 0.8 : 0.7,
      getLineColor: (feature: unknown): RGBA => {
        if (derived.focusIds.has(lsoaId(feature as GeoJsonFeature))) return colors.proposal;
        if (mode === "plain") return withAlpha(colors.proposal, 70);
        return is3d ? withAlpha(colors.ring, 60) : withAlpha(colors.ring, 150);
      },
      getFillColor: (feature: unknown) => fillColor(feature as GeoJsonFeature, mode, derived, is3d, colors),
      getElevation: (feature: unknown) => elevation(feature as GeoJsonFeature, mode, derived),
      updateTriggers: {
        getFillColor: [mode, resultKey, focusKey, is3d, options.palette],
        getElevation: [mode, resultKey, is3d],
        getLineColor: [mode, focusKey, is3d, options.palette],
        getLineWidth: [mode, focusKey]
      },
      material: { ambient: 0.72, diffuse: 0.45, shininess: 8, specularColor: [40, 40, 44] }
    })
  );

  const stopFeatures = scenario.candidate_stops_geojson.features;

  const candidates = stopFeatures.filter((f) => !f.properties?.is_interchange);
  const railMetro = stopFeatures.filter((f) => f.properties?.is_interchange);

  if (showCandidates) {
    layers.push(
      is3d
        ? new ColumnLayer({
            // Distinct ids: deck.gl cannot turn one layer type into another under the same id.
            id: "candidate-stops-3d",
            data: candidates as never,
            pickable: true,
            diskResolution: 8,
            radius: 16,
            getPosition: (f: GeoJsonFeature) => f.geometry.coordinates as [number, number],
            getElevation: 260,
            getFillColor: withAlpha(colors.neutral, 240)
          })
        : new ScatterplotLayer({
            id: "candidate-stops",
            data: candidates as never,
            pickable: true,
            radiusUnits: "pixels",
            getRadius: 2.4,
            getPosition: (f: GeoJsonFeature) => f.geometry.coordinates as [number, number],
            getFillColor: withAlpha(colors.neutral, 200),
            parameters: ON_TOP
          })
    );
  }

  if (showRailMetro && is3d) {
    layers.push(
      new ColumnLayer({
        id: "rail-metro-stops-3d",
        data: railMetro as never,
        pickable: true,
        diskResolution: 12,
        radius: 38,
        getPosition: (f: GeoJsonFeature) => f.geometry.coordinates as [number, number],
        getElevation: 700,
        getFillColor: colors.today,
        material: { ambient: 0.6, diffuse: 0.6, shininess: 20, specularColor: [255, 255, 255] }
      })
    );
  }

  if (showRailMetro && !is3d) {
    layers.push(
      new ScatterplotLayer({
        id: "rail-metro-stops",
        data: railMetro as never,
        pickable: true,
        radiusUnits: "pixels",
        getRadius: 4.5,
        stroked: true,
        lineWidthUnits: "pixels",
        getLineWidth: 2,
        getLineColor: colors.ring,
        getPosition: (f: GeoJsonFeature) => f.geometry.coordinates as [number, number],
        getFillColor: colors.today,
        parameters: ON_TOP
      })
    );
  }

  const allDetails = result?.feasible && showNetwork ? result.stop_details : [];
  const coordinates = routeCoordinates(result);
  const fractions = vertexFractions(coordinates);
  const revealedCount =
    coordinates.length === allDetails.length
      ? fractions.filter((fraction) => fraction <= routeProgress + 1e-6).length
      : allDetails.length;
  const details = allDetails.slice(0, Math.max(allDetails.length ? 1 : 0, revealedCount));
  if (details.length > 0) {
    const z = is3d ? NETWORK_ELEVATION : 0;
    const path = revealedPath(coordinates, fractions, routeProgress, z);
    if (path.length >= 2) {
      layers.push(
        new PathLayer({
          id: "route-casing",
          data: [{ path }],
          widthUnits: "pixels",
          getPath: (d: { path: number[][] }) => d.path as never,
          getWidth: is3d ? 9 : 8,
          getColor: withAlpha(colors.ring, 210),
          jointRounded: true,
          capRounded: true,
          parameters: ON_TOP
        }),
        new PathLayer({
          id: "route",
          data: [{ path }],
          widthUnits: "pixels",
          getPath: (d: { path: number[][] }) => d.path as never,
          getWidth: is3d ? 5 : 4,
          getColor: colors.proposal,
          jointRounded: true,
          capRounded: true,
          parameters: ON_TOP
        })
      );
    }

    if (is3d) {
      layers.push(
        new ColumnLayer({
          id: "selected-columns",
          data: details as never,
          diskResolution: 20,
          radius: 55,
          getPosition: (d: StopDetail) => [d.longitude, d.latitude],
          getElevation: NETWORK_ELEVATION,
          getFillColor: (d: StopDetail) =>
            d.candidate_id === focusStopId ? colors.proposal : withAlpha(colors.proposal, 235),
          updateTriggers: { getFillColor: [focusKey] },
          material: { ambient: 0.5, diffuse: 0.7, shininess: 24, specularColor: [255, 255, 255] }
        })
      );
    }

    layers.push(
      new ScatterplotLayer({
        id: "selected-stops",
        data: details as never,
        pickable: true,
        billboard: true,
        radiusUnits: "pixels",
        getRadius: (d: StopDetail) => (d.candidate_id === focusStopId ? 15 : 12),
        stroked: true,
        lineWidthUnits: "pixels",
        getLineWidth: 2,
        getLineColor: colors.ring,
        getPosition: (d: StopDetail) => [d.longitude, d.latitude, z],
        getFillColor: colors.proposal,
        updateTriggers: { getRadius: [focusKey], getPosition: [z] },
        parameters: ON_TOP
      }),
      new TextLayer({
        id: "selected-stop-numbers",
        data: details as never,
        billboard: true,
        getPosition: (d: StopDetail) => [d.longitude, d.latitude, z],
        getText: (d: StopDetail) => String(derived.stopNumbers.get(d.candidate_id) ?? ""),
        getSize: 13,
        getColor: colors.inkOnProposal,
        fontFamily: FONT_FAMILY,
        fontWeight: 800,
        getTextAnchor: "middle",
        getAlignmentBaseline: "center",
        updateTriggers: { getText: [resultKey], getPosition: [z] },
        parameters: ON_TOP
      })
    );
  }

  if (options.markers.length > 0) {
    layers.push(
      new ScatterplotLayer({
        id: "markers",
        data: options.markers,
        billboard: true,
        radiusUnits: "pixels",
        getRadius: 7,
        stroked: true,
        lineWidthUnits: "pixels",
        getLineWidth: 3,
        getLineColor: colors.proposal,
        getFillColor: colors.ring,
        getPosition: (d: MapMarker) => [d.longitude, d.latitude],
        parameters: ON_TOP
      }),
      new TextLayer({
        id: "marker-labels",
        data: options.markers,
        getPosition: (d: MapMarker) => [d.longitude, d.latitude],
        getText: (d: MapMarker) => d.label,
        getSize: 15,
        getColor: colors.label,
        fontFamily: FONT_FAMILY,
        fontWeight: 700,
        getTextAnchor: "middle",
        getAlignmentBaseline: "bottom",
        getPixelOffset: [0, -18],
        background: true,
        getBackgroundColor: withAlpha(colors.ring, 235),
        backgroundPadding: [8, 5],
        parameters: ON_TOP
      })
    );
  }

  return layers;
}
