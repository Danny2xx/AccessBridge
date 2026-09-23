import { Box, Map as MapIcon, RotateCcw, TrainFront } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import { EvidenceTag } from "@/components/EvidenceTag";
import { Figure } from "@/components/Figure";
import { MapLegend } from "@/components/MapLegend";
import { ModeSwitch } from "@/components/ModeSwitch";
import { ReachBar } from "@/components/ReachBar";
import { StopCard } from "@/components/StopCard";
import { BandComparisonChart } from "@/components/charts/BandComparisonChart";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Bounds, CameraTarget } from "@/lib/camera";
import { totalsByBand } from "@/lib/deprivation";
import { formatGBP, formatNumber, formatPence, formatSigned } from "@/lib/format";
import type { ExploreState } from "@/lib/useExplore";
import { cn } from "@/lib/utils";
import { MapCanvas } from "@/map/MapCanvas";
import type { EvidenceResponse, OptimisationResult, ScenarioResponse } from "@/types";

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
  const reduced = useReducedMotion();
  const facts = evidence.study_area;
  const studyBounds = scenario.study_area_bounds as Bounds;
  const stops = result?.feasible ? result.stop_details : [];
  const focus = stops.find((stop) => stop.candidate_id === explore.focusStopId) ?? null;
  const comparison = result?.accessibility ?? null;
  const gain = comparison?.delta_most_deprived_decile_population ?? 0;
  const text = result ? headline(result) : null;
  const updating = explore.status === "loading";
  // A focused stop is shown at street level with real buildings; extruded
  // neighbourhoods would fill the whole view at that zoom.
  const extrude = explore.is3d && !focus;

  const bands = comparison && result?.feasible ? totalsByBand(comparison.decile_breakdown) : [];
  const otherToday = bands.slice(1).reduce((sum, row) => sum + row.today, 0);
  const otherNew = bands.slice(1).reduce((sum, row) => sum + row.newStops, 0);
  const bandSentence = bands[0]
    ? `In the most deprived band, reach goes from ${formatNumber(bands[0].today)} by rail or Metro today to ${formatNumber(bands[0].newStops)} with these stops. In the other bands it is ${formatNumber(otherNew)} against ${formatNumber(otherToday)}.`
    : "";

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
        : {
            kind: "bounds",
            bounds: studyBounds,
            pitch: explore.is3d ? 50 : 0,
            bearing: explore.is3d ? -18 : 0
          },
    [explore.is3d, focus, studyBounds]
  );

  const mapDescription = focus
    ? `Zoomed to ${focus.name}. Outlined neighbourhoods are within a ${request.threshold_min}-minute walk of it.`
    : explore.mode === "need"
      ? "Neighbourhoods coloured by deprivation, with the chosen stops numbered along a schematic route."
      : explore.mode === "gap"
        ? "Orange areas are among the most deprived 10% and cannot walk to rail or Metro. Blue areas can."
        : "Green areas are within walking reach of a new stop. Blue areas can walk to rail or Metro today.";

  return (
    <div className="grid h-full max-lg:flex max-lg:flex-col-reverse lg:grid-cols-[27rem_minmax(0,1fr)]">
      <aside
        aria-label="Scenario and results"
        className="flex min-h-0 min-w-0 flex-col gap-7 overflow-y-auto bg-background px-5 py-6 pb-10 lg:border-r lg:border-border"
      >
        <header className="grid gap-2">
          <h1 className="text-[clamp(1.2rem,1.1rem+0.4vw,1.35rem)] font-semibold tracking-tight">
            Find the best places for new stops
          </h1>
          <p className="text-sm text-muted-foreground">
            Set a budget, a stop limit and a walking time. The optimiser picks the stops that reach the most
            people, counting the most deprived neighbourhoods ten times as much as the least deprived.
          </p>
        </header>

        <section aria-label="Scenario settings" className="grid gap-5">
          <div className="grid gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="budget" className="text-sm font-medium">
                Budget
              </label>
              <output htmlFor="budget" className="font-semibold">
                {formatGBP(request.budget_gbp)}
              </output>
            </div>
            <Slider
              id="budget"
              data-testid="budget-slider"
              aria-label="Budget"
              min={BUDGET_MIN}
              max={BUDGET_MAX}
              step={BUDGET_STEP}
              value={[request.budget_gbp]}
              onValueChange={([value]) => explore.updateRequest({ budget_gbp: value })}
            />
            <p className="text-xs text-dim">
              Placeholder costs: {formatGBP(75_000)} per bus stop, {formatGBP(RAIL_METRO_COST)} per rail or
              Metro stop
            </p>
          </div>

          <div className="grid gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="stops" className="text-sm font-medium">
                Most stops
              </label>
              <output htmlFor="stops" className="font-semibold">
                {request.max_stops}
              </output>
            </div>
            <Slider
              id="stops"
              data-testid="stops-slider"
              aria-label="Most stops"
              min={1}
              max={12}
              step={1}
              value={[request.max_stops]}
              onValueChange={([value]) => explore.updateRequest({ max_stops: value })}
            />
          </div>

          <div className="grid gap-2">
            <span className="text-sm font-medium">Walking time to a stop</span>
            <ToggleGroup
              type="single"
              variant="outline"
              value={String(request.threshold_min)}
              onValueChange={(value) => value && explore.updateRequest({ threshold_min: Number(value) })}
              className="w-full"
              aria-label="Walking time to a stop"
            >
              {WALK_TIMES.map((minutes) => (
                <ToggleGroupItem key={minutes} value={String(minutes)} className="flex-1 text-sm font-medium">
                  {minutes} min
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <label className="flex cursor-pointer items-center gap-3">
            <Switch
              checked={request.require_interchange}
              onCheckedChange={(checked) => explore.updateRequest({ require_interchange: checked })}
              aria-label="Include a rail or Metro link"
            />
            <span className="grid leading-tight">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <TrainFront className="size-4 text-today" aria-hidden="true" />
                Include a rail or Metro link
              </span>
              <small className="text-xs text-dim">Connects the new stops to the existing network</small>
            </span>
          </label>

          {!explore.isDefault ? (
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 gap-1.5 justify-self-start"
              onClick={explore.reset}
            >
              <RotateCcw aria-hidden="true" />
              Back to the default plan
            </Button>
          ) : null}
        </section>

        <section
          aria-busy={updating}
          className={cn(
            "relative grid gap-4 border-t border-border pt-6",
            updating && "[&>*:not([data-updating])]:opacity-55"
          )}
        >
          {updating ? (
            <p data-updating className="absolute -top-0.5 right-0 text-xs font-semibold text-primary">
              Updating…
            </p>
          ) : null}
          {explore.status === "error" ? (
            <p role="alert" className="font-medium text-destructive">
              The optimiser did not respond. Check the backend is running, then change a setting to try again.
            </p>
          ) : null}

          {text ? (
            <div aria-live="polite" className="grid gap-2">
              <p data-testid="result-lead" className="text-lg leading-snug font-semibold">
                {text.lead}
              </p>
              <p data-testid="result-detail" className="text-sm text-muted-foreground">
                {text.detail}
              </p>
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
              <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-4 border-t border-border pt-4">
                <Figure
                  size="compact"
                  value={formatGBP(result?.total_cost_gbp ?? 0)}
                  label="total cost"
                  status="placeholder"
                />
                {gain > 0 && result ? (
                  <Figure
                    size="compact"
                    value={formatPence(result.total_cost_gbp / gain)}
                    label="per extra resident reached"
                    status="placeholder"
                  />
                ) : null}
                <Figure
                  size="compact"
                  value={formatNumber(comparison.scenario.total_population)}
                  label={`residents of every band reached (${formatSigned(comparison.delta_total_population)} vs today)`}
                  status="modelled"
                />
              </div>
            </>
          ) : null}
        </section>

        {comparison && bands.length > 0 ? (
          <section aria-labelledby="bands-heading" className="grid gap-2 border-t border-border pt-6">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h2 id="bands-heading" className="font-semibold tracking-tight">
                Who gains, band by band
              </h2>
              <EvidenceTag status="modelled" />
            </div>
            <p data-testid="band-sentence" className="text-sm text-dim">
              {bandSentence}
            </p>
            <div className="mt-2">
              <BandComparisonChart rows={bands} threshold={comparison.threshold_min} compact />
            </div>
          </section>
        ) : null}

        {stops.length > 0 ? (
          <section aria-labelledby="stops-heading" className="grid gap-2 border-t border-border pt-6">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h2 id="stops-heading" className="font-semibold tracking-tight">
                The {stops.length} stops, in route order
              </h2>
              <EvidenceTag status="modelled" />
            </div>
            <p className="text-sm text-dim">
              Select a stop to zoom to it and outline the neighbourhoods it reaches.
            </p>
            <motion.ol layout={!reduced} className="mt-2 grid list-none gap-2.5 p-0">
              <AnimatePresence initial={false}>
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
              </AnimatePresence>
            </motion.ol>
          </section>
        ) : null}

        <div
          data-testid="data-note"
          className="grid gap-2 border-t border-border pt-6 text-xs leading-relaxed text-dim"
        >
          <p>{evidence.routing.method_caveat}</p>
          <p>
            {scenario.attribution.public_sector} {scenario.attribution.imd_ons_naptan}{" "}
            {scenario.attribution.osm}
          </p>
        </div>
      </aside>

      <div data-testid="explore-map" className="flex min-h-0 min-w-0 flex-col max-lg:h-[62dvh]">
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background px-5 py-2.5">
          <ModeSwitch mode={explore.mode} onChange={explore.setMode} />
          <ToggleGroup
            type="single"
            variant="outline"
            value={explore.is3d ? "3d" : "2d"}
            onValueChange={(value) => value && explore.setIs3d(value === "3d")}
            aria-label="Map view"
          >
            <ToggleGroupItem value="2d" className="gap-1.5 px-3 text-sm font-medium">
              <MapIcon aria-hidden="true" /> 2D
            </ToggleGroupItem>
            <ToggleGroupItem value="3d" className="gap-1.5 px-3 text-sm font-medium">
              <Box aria-hidden="true" /> 3D
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="ml-auto flex flex-wrap items-center gap-2 max-md:ml-0">
            <Toggle
              variant="outline"
              size="sm"
              pressed={explore.showRailMetro}
              onPressedChange={explore.setShowRailMetro}
              className="text-sm font-medium"
            >
              Rail and Metro
            </Toggle>
            <Toggle
              variant="outline"
              size="sm"
              pressed={explore.showCandidates}
              onPressedChange={explore.setShowCandidates}
              className="text-sm font-medium"
            >
              All {formatNumber(facts.candidate_stop_count)} possible locations
            </Toggle>
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
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
            <MapLegend
              mode={explore.mode}
              threshold={request.threshold_min}
              showNetwork={stops.length > 0}
              showRailMetro={explore.showRailMetro}
              showCandidates={explore.showCandidates}
              className="bottom-6 left-4 max-lg:hidden"
            />
          </MapCanvas>
        </div>
      </div>
    </div>
  );
}
