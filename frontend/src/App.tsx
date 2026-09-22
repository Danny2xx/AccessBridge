import { useCallback, useEffect, useRef, useState } from "react";
import { fetchEvidence, fetchScenario } from "./api";
import { SiteHeader } from "./components/SiteHeader";
import { useExplore } from "./lib/useExplore";
import { useHashRoute, type Route } from "./lib/useHashRoute";
import { AskPage } from "./pages/AskPage";
import { EvidencePage } from "./pages/EvidencePage";
import { ExplorePage } from "./pages/ExplorePage";
import { HowItWorksPage } from "./pages/HowItWorksPage";
import { StoryPage } from "./pages/StoryPage";
import type { EvidenceResponse, ScenarioResponse } from "./types";

type Attribution = ScenarioResponse["attribution"];

const TITLES: Record<Route, string> = {
  story: "The Story",
  explore: "Explore",
  evidence: "The Evidence",
  "how-it-works": "How it works",
  ask: "The Ask"
};

function Loading() {
  return (
    <div className="app-status" role="status">
      <p className="app-status-title">Loading the Knowledge Quarter</p>
      <p>Fetching neighbourhoods, stops and the default plan.</p>
      <span className="loading-bar" aria-hidden="true" />
    </div>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="app-status" role="alert">
      <p className="app-status-title">The data did not load</p>
      <p>
        The AccessBridge API did not respond. Start it with the command below, then try again.
      </p>
      <pre>.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000</pre>
      <p className="app-status-detail">{message}</p>
      <button type="button" className="button button--primary" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

function SiteFooter({ attribution }: { attribution?: Attribution }) {
  return (
    <footer className="site-footer">
      <p>
        AccessBridge AI is a concept to start the conversation. It is not an official output of the Birmingham Knowledge
        Quarter or its partners. Figures are early estimates, and costs and details would be checked before anything is
        built.
      </p>
      {attribution ? (
        <p className="site-footer-attribution">
          {attribution.public_sector} {attribution.imd_ons_naptan} {attribution.osm}
        </p>
      ) : null}
    </footer>
  );
}

export function App() {
  const [route, navigate] = useHashRoute();
  const [scenario, setScenario] = useState<ScenarioResponse | null>(null);
  const [evidence, setEvidence] = useState<EvidenceResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [storyProgress, setStoryProgress] = useState<number>(0);
  const explore = useExplore(evidence);
  const mainRef = useRef<HTMLElement>(null);
  const previousRoute = useRef(route);

  useEffect(() => {
    let alive = true;
    setLoadError(null);
    Promise.all([fetchScenario(), fetchEvidence()])
      .then(([nextScenario, nextEvidence]) => {
        if (!alive) return;
        setScenario(nextScenario);
        setEvidence(nextEvidence);
      })
      .catch((reason: unknown) => {
        if (!alive) return;
        setLoadError(reason instanceof Error ? reason.message : "Unknown error");
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  useEffect(() => {
    document.title = `${TITLES[route]} · AccessBridge AI`;
    // Only move focus on a real route change, so a fresh load keeps the skip link first.
    if (previousRoute.current === route) return;
    previousRoute.current = route;
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [route]);

  const onStoryProgress = useCallback((progress: number) => setStoryProgress(progress), []);
  const isMapRoute = route === "story" || route === "explore";
  const ready = scenario && evidence;

  let page = null;
  if (ready) {
    if (route === "story") {
      page = <StoryPage scenario={scenario} evidence={evidence} onProgress={onStoryProgress} navigate={navigate} />;
    } else if (route === "explore") {
      page = <ExplorePage scenario={scenario} evidence={evidence} explore={explore} />;
    } else if (route === "evidence") {
      page = <EvidencePage evidence={evidence} navigate={navigate} />;
    } else if (route === "how-it-works") {
      page = <HowItWorksPage scenario={scenario} evidence={evidence} navigate={navigate} />;
    } else {
      page = <AskPage evidence={evidence} navigate={navigate} />;
    }
  }

  return (
    <div className={`app app--${isMapRoute ? "map" : "document"}`}>
      <SiteHeader route={route} progress={route === "story" && ready ? storyProgress : null} />
      <main id="main" ref={mainRef} tabIndex={-1} className="main">
        {loadError ? (
          <LoadError message={loadError} onRetry={() => setAttempt((value) => value + 1)} />
        ) : ready ? (
          page
        ) : (
          <Loading />
        )}
      </main>
      {!isMapRoute ? <SiteFooter attribution={scenario?.attribution} /> : null}
    </div>
  );
}
