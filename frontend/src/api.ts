import type { EvidenceResponse, OptimisationRequest, OptimisationResult, ScenarioResponse } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

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

export function fetchScenario(): Promise<ScenarioResponse> {
  return requestJson<ScenarioResponse>("/scenario");
}

export function fetchEvidence(): Promise<EvidenceResponse> {
  return requestJson<EvidenceResponse>("/evidence");
}

export function runOptimisation(
  request: OptimisationRequest,
  signal?: AbortSignal
): Promise<OptimisationResult> {
  return requestJson<OptimisationResult>("/optimise", {
    method: "POST",
    body: JSON.stringify(request),
    signal
  });
}
