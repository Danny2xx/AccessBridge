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
  onProgress: (progress: number) => void;
  navigate: (route: Route) => void;
};

const DESKTOP_PADDING: Padding = { top: 48, right: 520, bottom: 150, left: 48 };
const MOBILE_PADDING: Padding = { top: 24, right: 24, bottom: 24, left: 24 };

function ownsArrowKeys(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  if (element.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)) return true;
  // The map uses arrow keys to pan when it has focus.
  return !!element.closest?.("[data-testid='map-canvas']");
}

export function StoryPage({ scenario, evidence, onProgress, navigate }: StoryPageProps) {
  const steps = useMemo(() => buildStory(evidence, scenario), [evidence, scenario]);
  const [index, setIndex] = useState(0);
  const isWide = useMediaQuery("(min-width: 960px)");
  const reduced = useReducedMotion();
  const step = steps[index];
  const total = steps.length;
  const threshold = evidence.default_result.threshold_min;

  useEffect(() => {
    onProgress((index + 1) / total);
  }, [index, onProgress, total]);

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
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
        transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const }
      };

  return (
    <div className="relative h-full max-lg:flex max-lg:flex-col">
      <div className="size-full max-lg:h-[52dvh]">
        <MapCanvas
          scenario={scenario}
          result={evidence.default_result}
          mode={step.map.mode}
          is3d={step.map.is3d}
          camera={step.map.camera}
          cameraKey={`story:${step.id}:${isWide ? "wide" : "narrow"}`}
          padding={isWide ? DESKTOP_PADDING : MOBILE_PADDING}
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
            className="top-5 left-5 max-lg:top-3 max-lg:left-3 max-lg:max-w-[calc(100%-1.5rem)]"
          />
        </MapCanvas>
      </div>

      <article
        data-testid="story-card"
        aria-labelledby="story-title"
        className={cn(
          "z-20 flex flex-col rounded-2xl border border-border/90 bg-card/97 backdrop-blur-xl edge-light",
          "lg:absolute lg:top-6 lg:right-6 lg:bottom-6 lg:h-fit lg:max-h-[calc(100%-3rem)] lg:w-[29rem]",
          "max-lg:mx-3 max-lg:-mt-6"
        )}
      >
        <p className="visually-hidden" aria-live="polite">
          Step {index + 1} of {total}: {step.title}
        </p>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step.id} {...fade} className="grid min-h-0 gap-4 overflow-y-auto p-6 lg:pb-4">
            <p className="text-sm font-extrabold tracking-wide text-primary tabular">
              {index + 1} <span className="text-dim">/ {total}</span>
            </p>
            <h1 id="story-title" className="text-[clamp(1.7rem,1.4rem+1.2vw,2.15rem)] font-extrabold tracking-tight">
              {step.title}
            </h1>

            {step.body.map((paragraph) => (
              <p key={paragraph} className="text-[1.0625rem] leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}

            {step.figures.length > 0 ? (
              <motion.div
                className="grid grid-cols-[repeat(auto-fit,minmax(8.75rem,1fr))] gap-5"
                initial={reduced ? false : "hidden"}
                animate="shown"
                variants={{ shown: { transition: { staggerChildren: 0.08 } } }}
              >
                {step.figures.map((figure) => (
                  <motion.div
                    key={figure.label}
                    variants={{ hidden: { opacity: 0, y: 10 }, shown: { opacity: 1, y: 0 } }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Figure {...figure} />
                  </motion.div>
                ))}
              </motion.div>
            ) : null}

            {step.stops ? (
              <ol className="grid list-none gap-1 p-0">
                {step.stops.map(({ number, stop }) => (
                  <li
                    key={stop.candidate_id}
                    className={cn(
                      "grid grid-cols-[1.75rem_1fr_auto] items-center gap-3 rounded-lg px-2 py-1.5",
                      stop.candidate_id === step.map.focusStopId && "bg-secondary ring-1 ring-primary"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-7 place-items-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground tabular"
                    >
                      {number}
                    </span>
                    <span className="grid leading-tight font-bold">
                      {stop.name}
                      <small className="text-[0.8125rem] font-normal text-dim">{stop.place_name}</small>
                    </span>
                    <span className="grid justify-items-end leading-tight font-bold tabular">
                      {formatNumber(stop.people_reached)}
                      <small className="text-[0.8125rem] font-normal text-dim">people</small>
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}

            {step.bands ? <BandComparisonChart rows={step.bands} threshold={threshold} compact /> : null}

            <p className="border-t border-border pt-3 text-sm leading-snug text-dim">
              <span className="font-bold text-muted-foreground">On the map</span> {step.description}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-2.5 border-t border-border p-5 max-lg:sticky max-lg:bottom-0 max-lg:rounded-b-2xl max-lg:bg-card/97">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
            disabled={index === 0}
            aria-label="Previous step"
          >
            <ArrowLeft aria-hidden="true" />
          </Button>
          {step.finale ? (
            <Button variant="outline" className="rounded-full" onClick={() => navigate("evidence")}>
              See the evidence
            </Button>
          ) : null}
          <Button
            className="flex-1 rounded-full font-bold"
            onClick={() => (index < total - 1 ? setIndex(index + 1) : navigate("explore"))}
          >
            {index < total - 1 ? `Next: ${steps[index + 1].short}` : "Try it yourself"}
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </article>

      <nav
        aria-label="Story steps"
        className={cn(
          "z-20 grid gap-2 rounded-2xl border border-border/90 bg-card/95 p-4 backdrop-blur-xl edge-light",
          "lg:absolute lg:bottom-6 lg:left-6 lg:w-[23rem]",
          "max-lg:mx-3 max-lg:my-4"
        )}
      >
        <p className="grid leading-tight">
          <span className="text-[0.8125rem] text-dim">The Innovation Spine · Phase 2</span>
          <strong className="text-[1.0625rem]">{step.short}</strong>
        </p>
        <ol className="flex list-none gap-1 p-0">
          {steps.map((item, itemIndex) => (
            <li key={item.id} className="flex-1">
              <button
                type="button"
                data-testid="story-step-dot"
                aria-current={itemIndex === index ? "step" : undefined}
                aria-label={`Step ${itemIndex + 1}: ${item.title}`}
                onClick={() => setIndex(itemIndex)}
                className="group relative block h-6 w-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <span
                  className={cn(
                    "absolute inset-x-0 top-2 h-1.5 rounded-full transition-colors",
                    itemIndex === index
                      ? "top-[7px] h-2 bg-primary"
                      : itemIndex < index
                        ? "bg-proposal"
                        : "bg-input group-hover:bg-dim"
                  )}
                />
              </button>
            </li>
          ))}
        </ol>
        <p className="text-[0.8125rem] text-dim max-md:hidden">Use the arrow keys to move between steps</p>
        <p data-testid="story-attribution" className="border-t border-border pt-2 text-xs leading-snug text-dim">
          {scenario.attribution.public_sector} {scenario.attribution.imd_ons_naptan}
        </p>
      </nav>
    </div>
  );
}
