import { WebMercatorViewport } from "@deck.gl/core";

export type Bounds = [number, number, number, number];

export type Padding = { top: number; right: number; bottom: number; left: number };

export type CameraTarget =
  | { kind: "bounds"; bounds: Bounds; pitch?: number; bearing?: number; maxZoom?: number }
  | {
      kind: "point";
      longitude: number;
      latitude: number;
      zoom: number;
      pitch?: number;
      bearing?: number;
    };

export type MapViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
};

export const BKQ_CENTRE = { longitude: -1.8868, latitude: 52.4849 };

export const FALLBACK_VIEW: MapViewState = {
  longitude: -1.876,
  latitude: 52.491,
  zoom: 12,
  pitch: 0,
  bearing: 0
};

export function boundsOfPoints(points: Array<[number, number]>, marginDeg = 0.004): Bounds | null {
  if (points.length === 0) return null;
  const lons = points.map(([lon]) => lon);
  const lats = points.map(([, lat]) => lat);
  return [
    Math.min(...lons) - marginDeg,
    Math.min(...lats) - marginDeg,
    Math.max(...lons) + marginDeg,
    Math.max(...lats) + marginDeg
  ];
}

/** Resolve a camera target to a concrete view for a canvas of the given size. */
export function resolveCamera(
  target: CameraTarget,
  width: number,
  height: number,
  padding: Padding
): MapViewState {
  const safeWidth = Math.max(width, 320);
  const safeHeight = Math.max(height, 320);

  if (target.kind === "bounds") {
    const horizontal = padding.left + padding.right;
    const vertical = padding.top + padding.bottom;
    const usable = {
      top: padding.top,
      bottom: padding.bottom,
      left: horizontal < safeWidth - 160 ? padding.left : 16,
      right: horizontal < safeWidth - 160 ? padding.right : 16
    };
    if (vertical >= safeHeight - 160) {
      usable.top = 16;
      usable.bottom = 16;
    }
    const viewport = new WebMercatorViewport({ width: safeWidth, height: safeHeight });
    const [west, south, east, north] = target.bounds;
    const fitted = viewport.fitBounds(
      [
        [west, south],
        [east, north]
      ],
      { padding: usable }
    );
    return {
      longitude: fitted.longitude,
      latitude: fitted.latitude,
      zoom: Math.min(fitted.zoom, target.maxZoom ?? 16),
      pitch: target.pitch ?? 0,
      bearing: target.bearing ?? 0
    };
  }

  // Shift the centre so the point sits in the middle of the unobstructed area.
  const viewport = new WebMercatorViewport({
    width: safeWidth,
    height: safeHeight,
    longitude: target.longitude,
    latitude: target.latitude,
    zoom: target.zoom
  });
  const offsetX = (padding.right - padding.left) / 2;
  const offsetY = (padding.bottom - padding.top) / 2;
  const [longitude, latitude] = viewport.unproject([
    safeWidth / 2 + (offsetX < safeWidth / 3 ? offsetX : 0),
    safeHeight / 2 + (offsetY < safeHeight / 3 ? offsetY : 0)
  ]);
  return {
    longitude,
    latitude,
    zoom: target.zoom,
    pitch: target.pitch ?? 0,
    bearing: target.bearing ?? 0
  };
}
