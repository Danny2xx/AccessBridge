import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { fetchEvidence, fetchScenario } from "@/api";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBar } from "@/components/MobileBar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { useExplore } from "@/lib/useExplore";
import { useHashRoute, type Route } from "@/lib/useHashRoute";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { cn } from "@/lib/utils";
import { AskPage } from "@/pages/AskPage";
import { EvidencePage } from "@/pages/EvidencePage";
import { ExplorePage } from "@/pages/ExplorePage";
import { HowItWorksPage } from "@/pages/HowItWorksPage";
import { StoryPage } from "@/pages/StoryPage";
import type { EvidenceResponse, ScenarioResponse } from "@/types";

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
    <div role="status" className="mx-auto grid max-w-[34rem] gap-4 px-[clamp(1rem,3vw,2rem)] py-[14vh]">
      <p className="text-[clamp(1.2rem,1.1rem+0.4vw,1.35rem)] font-semibold tracking-tight">
        Loading the Knowledge Quarter
      </p>
      <p className="text-muted-foreground">Fetching neighbourhoods, stops and the default plan.</p>
      <div className="grid gap-2.5 pt-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="mx-auto grid max-w-[34rem] gap-4 px-[clamp(1rem,3vw,2rem)] py-[14vh]">
      <p className="text-[clamp(1.2rem,1.1rem+0.4vw,1.35rem)] font-semibold tracking-tight">
        The data did not load
      </p>
      <p className="text-muted-foreground">
        The AccessBridge API did not respond. Start it with the command below, then try again.
      </p>
      <pre className="overflow-x-auto rounded-md border border-border bg-card p-3.5 text-sm">
        .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
      </pre>
      <p className="text-sm break-words text-dim">{message}</p>
      <Button className="justify-self-start" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function SiteFooter({ attribution }: { attribution?: Attribution }) {
  return (
    <footer className="mt-auto border-t border-border px-[clamp(1rem,3vw,2.5rem)] py-8 text-sm text-dim">
      <div className="mx-auto grid max-w-[68rem] gap-2">
        <p>
          AccessBridge AI is a concept to start the conversation. It is not an official output of the Birmingham
          Knowledge Quarter or its partners. Figures are early estimates, and costs and details would be checked
          before anything is built.
        </p>
        {attribution ? (
          <p data-testid="footer-attribution">
            {attribution.public_sector} {attribution.imd_ons_naptan} {attribution.osm}
          </p>
        ) : null}
      </div>
    </footer>
  );
}

export function App() {
  const [route, navigate] = useHashRoute();
  const [scenario, setScenario] = useState<ScenarioResponse | null>(null);
  const [evidence, setEvidence] = useState<EvidenceResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const explore = useExplore(evidence);
  const mainRef = useRef<HTMLElement>(null);
  const previousRoute = useRef(route);
  const reduced = useReducedMotion();
  const isPhone = !useMediaQuery("(min-width: 768px)");

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

  const isMapRoute = route === "story" || route === "explore";
  const ready = scenario && evidence;

  let page = null;
  if (ready) {
    if (route === "story") {
      page = <StoryPage scenario={scenario} evidence={evidence} navigate={navigate} />;
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
    <ThemeProvider>
      <TooltipProvider delayDuration={200}>
        <a
          href="#main"
          className="absolute top-3 left-3 z-50 -translate-y-24 rounded-md bg-primary px-4 py-2.5 font-semibold text-primary-foreground transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>

        <div className="md:grid md:grid-cols-[var(--sidebar-width-compact)_minmax(0,1fr)] lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]">
          <AppSidebar route={route} />

          <div
            className={cn("flex min-w-0 flex-col", isMapRoute ? "md:h-dvh md:overflow-hidden" : "min-h-dvh")}
          >
            {isPhone ? <MobileBar route={route} /> : null}

            <main
              id="main"
              ref={mainRef}
              tabIndex={-1}
              className={cn("outline-none", isMapRoute && "min-h-0 flex-1")}
            >
              {loadError ? (
                <LoadError message={loadError} onRetry={() => setAttempt((value) => value + 1)} />
              ) : ready ? (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={route}
                    className={cn(isMapRoute && "h-full")}
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {page}
                  </motion.div>
                </AnimatePresence>
              ) : (
                <Loading />
              )}
            </main>

            {!isMapRoute ? <SiteFooter attribution={scenario?.attribution} /> : null}
          </div>
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
}
