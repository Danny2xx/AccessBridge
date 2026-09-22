import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Figure } from "../components/Figure";
import { MapLegend } from "../components/MapLegend";
import { BandComparisonChart } from "../components/charts/BandComparisonChart";
import { buildStory } from "../content/story";
import type { Padding } from "../lib/camera";
import { formatNumber } from "../lib/format";
import type { Route } from "../lib/useHashRoute";
import { useMediaQuery } from "../lib/useMediaQuery";
import { MapCanvas } from "../map/MapCanvas";
import type { EvidenceResponse, ScenarioResponse } from "../types";

type StoryPageProps = {
  scenario: ScenarioResponse;
  evidence: EvidenceResponse;
  onProgress: (progress: number) => void;
  navigate: (route: Route) => void;
};

const DESKTOP_PADDING: Padding = { top: 48, right: 500, bottom: 150, left: 48 };
const MOBILE_PADDING: Padding = { top: 24, right: 24, bottom: 24, left: 24 };

function ownsArrowKeys(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  if (element.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)) return true;
  // The map uses arrow keys to pan when it has focus.
  return !!element.closest?.(".map-canvas");
}

export function StoryPage({ scenario, evidence, onProgress, navigate }: StoryPageProps) {
  const steps = useMemo(() => buildStory(evidence, scenario), [evidence, scenario]);
  const [index, setIndex] = useState(0);
  const isWide = useMediaQuery("(min-width: 960px)");
  const step = steps[index];
  const total = steps.length;

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

  const threshold = evidence.default_result.threshold_min;

  return (
    <div className="story">
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
        />
      </MapCanvas>

      <article className="story-card" aria-labelledby="story-title">
        <p className="visually-hidden" aria-live="polite">
          Step {index + 1} of {total}: {step.title}
        </p>
        <div className="story-card-scroll" key={step.id}>
          <p className="story-count">
            {index + 1} <span>/ {total}</span>
          </p>
          <h1 id="story-title">{step.title}</h1>
          {step.body.map((paragraph) => (
            <p key={paragraph} className="story-body">
              {paragraph}
            </p>
          ))}

          {step.figures.length > 0 ? (
            <div className="figure-row">
              {step.figures.map((figure) => (
                <Figure key={figure.label} {...figure} />
              ))}
            </div>
          ) : null}

          {step.stops ? (
            <ol className="story-stops">
              {step.stops.map(({ number, stop }) => (
                <li key={stop.candidate_id} className={stop.candidate_id === step.map.focusStopId ? "is-focused" : ""}>
                  <span className="stop-number" aria-hidden="true">
                    {number}
                  </span>
                  <span className="story-stop-name">
                    {stop.name}
                    <small>{stop.place_name}</small>
                  </span>
                  <span className="story-stop-value">
                    {formatNumber(stop.people_reached)}
                    <small>people</small>
                  </span>
                </li>
              ))}
            </ol>
          ) : null}

          {step.bands ? (
            <BandComparisonChart rows={step.bands} threshold={threshold} compact />
          ) : null}

          <p className="story-map-note">
            <span>On the map</span> {step.description}
          </p>

        </div>

        <div className="story-nav">
          <button
            type="button"
            className="button button--icon"
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
            disabled={index === 0}
            aria-label="Previous step"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          {step.finale ? (
            <button type="button" className="button" onClick={() => navigate("evidence")}>
              See the evidence
            </button>
          ) : null}
          <button
            type="button"
            className="button button--primary story-next"
            onClick={() => (index < total - 1 ? setIndex(index + 1) : navigate("explore"))}
          >
            {index < total - 1 ? `Next: ${steps[index + 1].short}` : "Try it yourself"}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </article>

      <nav className="story-tracker" aria-label="Story steps">
        <p className="story-tracker-title">
          <span>The Innovation Spine · Phase 2</span>
          <strong>{step.short}</strong>
        </p>
        <ol>
          {steps.map((item, itemIndex) => (
            <li key={item.id}>
              <button
                type="button"
                className={itemIndex <= index ? "is-done" : ""}
                aria-current={itemIndex === index ? "step" : undefined}
                aria-label={`Step ${itemIndex + 1}: ${item.title}`}
                onClick={() => setIndex(itemIndex)}
              />
            </li>
          ))}
        </ol>
        <p className="story-tracker-hint">Use the arrow keys to move between steps</p>
        <p className="story-attribution">
          {scenario.attribution.public_sector} {scenario.attribution.imd_ons_naptan}
        </p>
      </nav>
    </div>
  );
}
