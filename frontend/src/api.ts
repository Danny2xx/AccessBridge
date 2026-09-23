import type { EvidenceResponse, OptimisationRequest, OptimisationResult, ScenarioResponse } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

/**
 * Static mode serves the API's responses as JSON files written by
 * scripts/export_static_api.py, so the site can be hosted with no server.
 */
const STATIC_API = import.meta.env.VITE_STATIC_API === "true";
const STATIC_ROOT = `${import.meta.env.BASE_URL}api/`;

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

async function staticJson<T>(file: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${STATIC_ROOT}${file}`, { signal });
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "No precomputed result exists for these settings."
        : `Request failed with ${response.status}`
    );
  }
  return (await response.json()) as T;
}

/** Mirrors the key format in scripts/export_static_api.py. */
export function staticRequestKey(request: OptimisationRequest): string {
  const flag = request.require_interchange ? 1 : 0;
  return `b${request.budget_gbp}_s${request.max_stops}_t${request.threshold_min}_i${flag}`;
}

export function fetchScenario(): Promise<ScenarioResponse> {
  return STATIC_API ? staticJson("scenario.json") : requestJson<ScenarioResponse>("/scenario");
}

export function fetchEvidence(): Promise<EvidenceResponse> {
  return STATIC_API ? staticJson("evidence.json") : requestJson<EvidenceResponse>("/evidence");
}

export function runOptimisation(
  request: OptimisationRequest,
  signal?: AbortSignal
): Promise<OptimisationResult> {
  if (STATIC_API) return staticJson(`optimise/${staticRequestKey(request)}.json`, signal);
  return requestJson<OptimisationResult>("/optimise", {
    method: "POST",
    body: JSON.stringify(request),
    signal
  });
}
