import { ArrowLeft, ArrowRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Figure } from "@/components/Figure";
import { MapLegend } from "@/components/MapLegend";
import { BandComparisonChart } from "@/components/charts/BandComparisonChart";
import { Button } from "@/components/ui/button";
import { buildStory } from "@/content/story";
import type { Padding } from "@/lib/camera";
import { formatNumber } from "@/lib/format";
import type { Route } from "@/lib/useHashRoute";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { cn } from "@/lib/utils";
import { MapCanvas } from "@/map/MapCanvas";
import type { EvidenceResponse, ScenarioResponse } from "@/types";

type StoryPageProps = {
  scenario: ScenarioResponse;
  evidence: EvidenceResponse;
  navigate: (route: Route) => void;
};

const MAP_PADDING: Padding = { top: 72, right: 56, bottom: 56, left: 56 };

function ownsArrowKeys(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  if (element.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)) return true;
  // The map uses arrow keys to pan when it has focus.
  return !!element.closest?.("[data-testid='map-canvas']");
}

export function StoryPage({ scenario, evidence, navigate }: StoryPageProps) {
  const steps = useMemo(() => buildStory(evidence, scenario), [evidence, scenario]);
  const [index, setIndex] = useState(0);
  const isWide = useMediaQuery("(min-width: 1024px)");
  const reduced = useReducedMotion();
  const step = steps[index];
  const total = steps.length;
  const threshold = evidence.default_result.threshold_min;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (ownsArrowKeys(event.target)) return;
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        setIndex((current) => Math.min(total - 1, current + 1));
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        setIndex((current) => Math.max(0, current - 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [total]);

  const fade = reduced
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const }
      };

  return (
    <div className="grid h-full max-lg:flex max-lg:flex-col-reverse lg:grid-cols-[27rem_minmax(0,1fr)]">
      <section
        data-testid="story-panel"
        aria-labelledby="story-title"
        className="flex min-h-0 flex-col bg-background lg:border-r lg:border-border"
      >
        <div className="flex items-center gap-1.5 border-b border-border px-5 py-3.5">
          <ol className="flex items-center gap-1.5" aria-label="Story steps">
            {steps.map((item, itemIndex) => {
              const done = itemIndex < index;
              const current = itemIndex === index;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    data-testid="story-step-dot"
                    aria-current={current ? "step" : undefined}
                    aria-label={`Step ${itemIndex + 1}: ${item.title}`}
                    onClick={() => setIndex(itemIndex)}
                    className={cn(
                      "grid size-7 place-items-center rounded-md text-xs font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      current
                        ? "bg-primary text-primary-foreground"
                        : done
                          ? "bg-secondary text-foreground"
                          : "text-dim hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    {itemIndex + 1}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="ml-auto text-xs text-dim">
            Step {index + 1} of {total}
          </p>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step.id}
            {...fade}
            className="grid min-h-0 flex-1 content-start gap-4 overflow-y-auto px-5 py-6"
          >
            <p className="visually-hidden" aria-live="polite">
              Step {index + 1} of {total}: {step.title}
            </p>
            <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">{step.short}</p>
            <h1
              id="story-title"
              className="text-[clamp(1.45rem,1.25rem+0.9vw,1.8rem)] font-semibold tracking-tight"
            >
              {step.title}
            </h1>

            {step.body.map((paragraph) => (
              <p key={paragraph} className="leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}

            {step.figures.length > 0 ? (
              <motion.div
                className="grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-x-5 gap-y-4 border-t border-border pt-4"
                initial={reduced ? false : "hidden"}
                animate="shown"
                variants={{ shown: { transition: { staggerChildren: 0.07 } } }}
              >
                {step.figures.map((figure) => (
                  <motion.div
                    key={figure.label}
                    variants={{ hidden: { opacity: 0, y: 8 }, shown: { opacity: 1, y: 0 } }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Figure {...figure} />
                  </motion.div>
                ))}
              </motion.div>
            ) : null}

            {step.stops ? (
              <ol className="grid list-none gap-0 border-t border-border p-0">
                {step.stops.map(({ number, stop }) => (
                  <li
                    key={stop.candidate_id}
                    className={cn(
                      "grid grid-cols-[1.5rem_1fr_auto] items-center gap-3 border-b border-border py-2.5",
                      stop.candidate_id === step.map.focusStopId && "text-foreground"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "grid size-6 place-items-center rounded-md text-xs font-semibold",
                        stop.candidate_id === step.map.focusStopId
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {number}
                    </span>
                    <span className="grid leading-tight">
                      <span className="text-sm font-medium">{stop.name}</span>
                      <small className="text-xs text-dim">{stop.place_name}</small>
                    </span>
                    <span className="text-sm font-semibold">{formatNumber(stop.people_reached)}</span>
                  </li>
                ))}
              </ol>
            ) : null}

            {step.bands ? (
              <div className="border-t border-border pt-4">
                <BandComparisonChart rows={step.bands} threshold={threshold} compact />
              </div>
            ) : null}

            <p className="border-t border-border pt-3 text-sm leading-snug text-dim">
              <span className="font-semibold text-muted-foreground">On the map</span> {step.description}
            </p>

            <p data-testid="story-attribution" className="text-xs leading-snug text-dim">
              {scenario.attribution.public_sector} {scenario.attribution.imd_ons_naptan}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center gap-2 border-t border-border px-5 py-3.5">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
            disabled={index === 0}
            aria-label="Previous step"
          >
            <ArrowLeft aria-hidden="true" />
          </Button>
          {step.finale ? (
            <Button variant="outline" onClick={() => navigate("evidence")}>
              See the evidence
            </Button>
          ) : null}
          <Button
            className="flex-1"
            onClick={() => (index < total - 1 ? setIndex(index + 1) : navigate("explore"))}
          >
            {index < total - 1 ? `Next: ${steps[index + 1].short}` : "Try it yourself"}
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </section>

      <div className="relative min-h-0 max-lg:h-[52dvh]">
        <MapCanvas
          scenario={scenario}
          result={evidence.default_result}
          mode={step.map.mode}
          is3d={step.map.is3d}
          camera={step.map.camera}
          cameraKey={`story:${step.id}:${isWide ? "wide" : "narrow"}`}
          padding={MAP_PADDING}
          description={step.description}
          showNetwork={step.map.showNetwork}
          showRailMetro={step.map.showRailMetro}
          focusStopId={step.map.focusStopId}
          markers={step.map.markers}
          buildings3d={step.map.buildings3d}
        >
          <MapLegend
            mode={step.map.mode}
            threshold={threshold}
            showNetwork={step.map.showNetwork}
            showRailMetro={step.map.showRailMetro}
            className="top-4 left-4"
          />
        </MapCanvas>
      </div>
    </div>
  );
}
