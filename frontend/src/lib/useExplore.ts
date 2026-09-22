import { useCallback, useEffect, useRef, useState } from "react";
import { runOptimisation } from "../api";
import type { MapMode } from "../map/layers";
import type { EvidenceResponse, OptimisationRequest, OptimisationResult } from "../types";

const FALLBACK_REQUEST: OptimisationRequest = {
  budget_gbp: 600_000,
  max_stops: 8,
  threshold_min: 10,
  require_interchange: true
};
const DEBOUNCE_MS = 350;

export type ExploreState = ReturnType<typeof useExplore>;

export function useExplore(evidence: EvidenceResponse | null) {
  const [request, setRequestState] = useState<OptimisationRequest>(FALLBACK_REQUEST);
  const [result, setResult] = useState<OptimisationResult | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [focusStopId, setFocusStopId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<MapMode>("gain");
  const [is3d, setIs3d] = useState(false);
  const [showCandidates, setShowCandidates] = useState(false);
  const [showRailMetro, setShowRailMetro] = useState(true);
  const dirty = useRef(false);
  const seeded = useRef(false);

  useEffect(() => {
    if (!evidence || seeded.current) return;
    seeded.current = true;
    setRequestState(evidence.default_request);
    setResult(evidence.default_result);
  }, [evidence]);

  useEffect(() => {
    if (!dirty.current) return;
    const controller = new AbortController();
    setStatus("loading");
    const timer = window.setTimeout(() => {
      runOptimisation(request, controller.signal)
        .then((next) => {
          setResult(next);
          setStatus("idle");
          setError(null);
          setFocusStopId(null);
          setExpanded(new Set());
        })
        .catch((reason: unknown) => {
          if (controller.signal.aborted) return;
          setStatus("error");
          setError(reason instanceof Error ? reason.message : "The optimiser did not respond.");
        });
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [request]);

  const updateRequest = useCallback((patch: Partial<OptimisationRequest>) => {
    dirty.current = true;
    setRequestState((current) => ({ ...current, ...patch }));
  }, []);

  const reset = useCallback(() => {
    if (!evidence) return;
    dirty.current = false;
    setRequestState(evidence.default_request);
    setResult(evidence.default_result);
    setStatus("idle");
    setError(null);
    setFocusStopId(null);
    setExpanded(new Set());
  }, [evidence]);

  const toggleExpanded = useCallback((candidateId: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(candidateId)) next.delete(candidateId);
      else next.add(candidateId);
      return next;
    });
  }, []);

  const focusStop = useCallback((candidateId: string | null) => {
    setFocusStopId((current) => (current === candidateId ? null : candidateId));
  }, []);

  const isDefault =
    !!evidence && JSON.stringify(request) === JSON.stringify(evidence.default_request);

  return {
    request,
    updateRequest,
    reset,
    isDefault,
    result,
    status,
    error,
    focusStopId,
    focusStop,
    expanded,
    toggleExpanded,
    mode,
    setMode,
    is3d,
    setIs3d,
    showCandidates,
    setShowCandidates,
    showRailMetro,
    setShowRailMetro
  };
}
