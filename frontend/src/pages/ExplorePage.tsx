import { Box, Map as MapIcon, RotateCcw } from "lucide-react";
import { useMemo } from "react";
import { EvidenceTag } from "../components/EvidenceTag";
import { Figure } from "../components/Figure";
import { MapLegend } from "../components/MapLegend";
import { ModeSwitch } from "../components/ModeSwitch";
import { ReachBar } from "../components/ReachBar";
import { BandComparisonChart } from "../components/charts/BandComparisonChart";
import { StopCard } from "../components/StopCard";
import type { Bounds, CameraTarget } from "../lib/camera";
import { totalsByBand } from "../lib/deprivation";
import { formatGBP, formatNumber, formatPence, formatSigned } from "../lib/format";
import type { ExploreState } from "../lib/useExplore";
import { MapCanvas } from "../map/MapCanvas";
import type { EvidenceResponse, OptimisationResult, ScenarioResponse } from "../types";

const BUDGET_MIN = 75_000;
const BUDGET_MAX = 1_500_000;
const BUDGET_STEP = 75_000;
const WALK_TIMES = [5, 10, 15, 20];
const RAIL_METRO_COST = 150_000;

type ExplorePageProps = {
  scenario: ScenarioResponse;
  evidence: EvidenceResponse;
  explore: ExploreState;
};

function headline(result: OptimisationResult): { lead: string; detail: string } {
  const comparison = result.accessibility;
  if (!result.feasible || !comparison) {
    const needsLink = result.require_interchange && result.budget_gbp < RAIL_METRO_COST;
    return {
      lead: "No set of stops fits these settings.",
      detail: needsLink
        ? `A rail or Metro link costs ${formatGBP(RAIL_METRO_COST)} in the placeholder costs. Raise the budget, or switch off the rail or Metro link.`
        : "Raise the budget or allow more stops."
    };
  }
  const count = result.selected_stops.length;
  const reached = comparison.scenario.most_deprived_decile_population;
  const gain = comparison.delta_most_deprived_decile_population;
  const noun = count === 1 ? "This stop puts" : `These ${count} stops put`;
  return {
    lead: `${noun} ${formatNumber(reached)} of the most deprived residents within a ${result.threshold_min}-minute walk of a stop.`,
    detail:
      gain >= 0
        ? `That is ${formatNumber(gain)} more than can walk to rail or Metro today.`
        : `That is ${formatNumber(-gain)} fewer than can walk to rail or Metro today. A bigger budget or more stops would close the gap.`
  };
}

export function ExplorePage({ scenario, evidence, explore }: ExplorePageProps) {
  const { request, result } = explore;
  const facts = evidence.study_area;
  const studyBounds = scenario.study_area_bounds as Bounds;
  const stops = result?.feasible ? result.stop_details : [];
  const focus = stops.find((stop) => stop.candidate_id === explore.focusStopId) ?? null;
  const comparison = result?.accessibility ?? null;
  const gain = comparison?.delta_most_deprived_decile_population ?? 0;
  const text = result ? headline(result) : null;
  const bands = comparison && result?.feasible ? totalsByBand(comparison.decile_breakdown) : [];
  const otherToday = bands.slice(1).reduce((sum, row) => sum + row.today, 0);
  const otherNew = bands.slice(1).reduce((sum, row) => sum + row.newStops, 0);
  const bandSentence = bands[0]
    ? `In the most deprived band, reach goes from ${formatNumber(bands[0].today)} by rail or Metro today to ${formatNumber(bands[0].newStops)} with these stops. In the other bands it is ${formatNumber(otherNew)} against ${formatNumber(otherToday)}.`
    : "";
  const updating = explore.status === "loading";
  // A focused stop is shown at street level with real buildings; extruded
  // neighbourhoods would fill the whole view at that zoom.
  const extrude = explore.is3d && !focus;

  const camera = useMemo<CameraTarget>(
    () =>
      focus
        ? {
            kind: "point",
            longitude: focus.longitude,
            latitude: focus.latitude,
            zoom: 14,
            pitch: explore.is3d ? 55 : 0,
            bearing: explore.is3d ? -20 : 0
          }
        : { kind: "bounds", bounds: studyBounds, pitch: explore.is3d ? 50 : 0, bearing: explore.is3d ? -18 : 0 },
    [explore.is3d, focus, studyBounds]
  );

  const mapDescription = focus
    ? `Zoomed to ${focus.name}. Outlined neighbourhoods are within a ${request.threshold_min}-minute walk of it.`
    : explore.mode === "need"
      ? "Neighbourhoods coloured by deprivation, with the chosen stops numbered along a schematic route."
      : explore.mode === "gap"
        ? "Pink areas are among the most deprived 10% and cannot walk to rail or Metro. Blue areas can."
        : "Amber areas are within walking reach of a new stop. Blue areas can walk to rail or Metro today.";

  return (
    <div className="explore">
      <aside className="explore-panel" aria-label="Scenario and results">
        <header className="explore-intro">
          <h1>Find the best places for new stops</h1>
          <p>
            Set a budget, a stop limit and a walking time. The optimiser picks the stops that reach the most
            people, counting the most deprived neighbourhoods ten times as much as the least deprived.
          </p>
        </header>

        <section className="controls" aria-label="Scenario settings">
          <label className="slider-field">
            <span className="field-label">
              Budget <output>{formatGBP(request.budget_gbp)}</output>
            </span>
            <input
              type="range"
              min={BUDGET_MIN}
              max={BUDGET_MAX}
              step={BUDGET_STEP}
              value={request.budget_gbp}
              onChange={(event) => explore.updateRequest({ budget_gbp: Number(event.target.value) })}
            />
            <span className="field-hint">
              Placeholder costs: {formatGBP(75_000)} per bus stop, {formatGBP(RAIL_METRO_COST)} per rail or Metro stop
            </span>
          </label>

          <label className="slider-field">
            <span className="field-label">
              Most stops <output>{request.max_stops}</output>
            </span>
            <input
              type="range"
              min={1}
              max={12}
              step={1}
              value={request.max_stops}
              onChange={(event) => explore.updateRequest({ max_stops: Number(event.target.value) })}
            />
          </label>

          <fieldset className="choice-field">
            <legend className="field-label">Walking time to a stop</legend>
            <div className="segmented">
              {WALK_TIMES.map((minutes) => (
                <label key={minutes} className={request.threshold_min === minutes ? "is-active" : ""}>
                  <input
                    type="radio"
                    name="walk-time"
                    value={minutes}
                    checked={request.threshold_min === minutes}
                    onChange={() => explore.updateRequest({ threshold_min: minutes })}
                  />
                  {minutes} min
                </label>
              ))}
            </div>
          </fieldset>

          <label className="switch-field">
            <input
              type="checkbox"
              role="switch"
              checked={request.require_interchange}
              onChange={(event) => explore.updateRequest({ require_interchange: event.target.checked })}
            />
            <span className="switch-track" aria-hidden="true" />
            <span>
              Include a rail or Metro link
              <small>Connects the new stops to the existing network</small>
            </span>
          </label>

          {!explore.isDefault ? (
            <button type="button" className="text-button" onClick={explore.reset}>
              <RotateCcw size={15} aria-hidden="true" />
              Back to the default plan
            </button>
          ) : null}
        </section>

        <section className={`explore-result${updating ? " is-updating" : ""}`} aria-busy={updating}>
          {updating ? <p className="updating-note">Updating…</p> : null}
          {explore.status === "error" ? (
            <p className="error-note" role="alert">
              The optimiser did not respond. Check the backend is running, then change a setting to try again.
            </p>
          ) : null}
          {text ? (
            <div aria-live="polite" className="result-text">
              <p className="result-lead">{text.lead}</p>
              <p className="result-detail">{text.detail}</p>
            </div>
          ) : null}
          {comparison ? (
            <>
              <ReachBar
                total={facts.most_deprived_population}
                today={comparison.baseline.most_deprived_decile_population}
                withStops={comparison.scenario.most_deprived_decile_population}
                threshold={comparison.threshold_min}
              />
              <div className="figure-row figure-row--compact">
                <Figure value={formatGBP(result?.total_cost_gbp ?? 0)} label="total cost" status="placeholder" />
                {gain > 0 && result ? (
                  <Figure
                    value={formatPence(result.total_cost_gbp / gain)}
                    label="per extra resident reached"
                    status="placeholder"
                  />
                ) : null}
                <Figure
                  value={formatNumber(comparison.scenario.total_population)}
                  label={`residents of every band reached (${formatSigned(comparison.delta_total_population)} vs today)`}
                  status="modelled"
                />
              </div>
            </>
          ) : null}
        </section>

        {comparison && bands.length > 0 ? (
          <section className="band-section" aria-labelledby="bands-heading">
            <div className="section-heading">
              <h2 id="bands-heading">Who gains, band by band</h2>
              <EvidenceTag status="modelled" />
            </div>
            <p className="section-hint">{bandSentence}</p>
            <BandComparisonChart rows={bands} threshold={comparison.threshold_min} compact />
          </section>
        ) : null}

        {stops.length > 0 ? (
          <section className="stop-section" aria-labelledby="stops-heading">
            <div className="section-heading">
              <h2 id="stops-heading">The {stops.length} stops, in route order</h2>
              <EvidenceTag status="modelled" />
            </div>
            <p className="section-hint">Select a stop to zoom to it and outline the neighbourhoods it reaches.</p>
            <ol className="stop-list">
              {stops.map((stop, index) => (
                <StopCard
                  key={stop.candidate_id}
                  stop={stop}
                  number={index + 1}
                  threshold={request.threshold_min}
                  focused={stop.candidate_id === explore.focusStopId}
                  expanded={explore.expanded.has(stop.candidate_id)}
                  onFocus={() => explore.focusStop(stop.candidate_id)}
                  onToggle={() => explore.toggleExpanded(stop.candidate_id)}
                />
              ))}
            </ol>
          </section>
        ) : null}

        <div className="data-note">
          <p>{evidence.routing.method_caveat}</p>
          <p>
            {scenario.attribution.public_sector} {scenario.attribution.imd_ons_naptan} {scenario.attribution.osm}
          </p>
        </div>
      </aside>

      <div className="explore-map">
        <MapCanvas
          scenario={scenario}
          result={result}
          mode={explore.mode}
          is3d={extrude}
          camera={camera}
          cameraKey={`explore:${focus?.candidate_id ?? "area"}:${explore.is3d ? "3d" : "2d"}`}
          description={mapDescription}
          focusStopId={explore.focusStopId}
          onSelectStop={(id) => explore.focusStop(id)}
          showCandidates={explore.showCandidates}
          showRailMetro={explore.showRailMetro}
          buildings3d={explore.is3d && !!focus}
        >
          <div className="map-controls">
            <ModeSwitch mode={explore.mode} onChange={explore.setMode} />
            <div className="map-control-row">
              <div className="segmented segmented--small" role="radiogroup" aria-label="Map view">
                <button type="button" role="radio" aria-checked={!explore.is3d} className={!explore.is3d ? "is-active" : ""} onClick={() => explore.setIs3d(false)}>
                  <MapIcon size={15} aria-hidden="true" /> 2D
                </button>
                <button type="button" role="radio" aria-checked={explore.is3d} className={explore.is3d ? "is-active" : ""} onClick={() => explore.setIs3d(true)}>
                  <Box size={15} aria-hidden="true" /> 3D
                </button>
              </div>
              <label className="check-chip">
                <input type="checkbox" checked={explore.showRailMetro} onChange={(e) => explore.setShowRailMetro(e.target.checked)} />
                Rail and Metro
              </label>
              <label className="check-chip">
                <input type="checkbox" checked={explore.showCandidates} onChange={(e) => explore.setShowCandidates(e.target.checked)} />
                All {formatNumber(facts.candidate_stop_count)} possible locations
              </label>
            </div>
          </div>
          <MapLegend
            mode={explore.mode}
            threshold={request.threshold_min}
            showNetwork={stops.length > 0}
            showRailMetro={explore.showRailMetro}
            showCandidates={explore.showCandidates}
          />
        </MapCanvas>
      </div>
    </div>
  );
}
