import { ArrowUpRight } from "lucide-react";
import { AnimatedNumber } from "../components/AnimatedNumber";
import { EvidenceTag } from "../components/EvidenceTag";
import { PHASE_2_BUDGET_GBP, PHASES, SPINELENS_URL } from "../content/spine";
import { formatGBP, formatSigned, listPlaces, percent } from "../lib/format";
import type { Route } from "../lib/useHashRoute";
import type { EvidenceResponse } from "../types";

type AskPageProps = {
  evidence: EvidenceResponse;
  navigate: (route: Route) => void;
};

export function AskPage({ evidence, navigate }: AskPageProps) {
  const result = evidence.default_result;
  const gain = result.accessibility?.delta_most_deprived_decile_population ?? 0;
  const threshold = result.threshold_min;
  const cost = result.total_cost_gbp;
  const share = Math.min(100, (cost / PHASE_2_BUDGET_GBP) * 100);
  const places = listPlaces(
    result.stop_details.filter((stop) => !stop.is_interchange).map((stop) => stop.place_name),
    6
  );

  const asks = [
    {
      title: "Use this method to place Phase 2's redesigned stops",
      body: "It shows who each stop reaches before anything is built, and it re-runs in seconds as plans change."
    },
    {
      title: "Replace straight-line walks with real journey times",
      body: "Run R5 routing with West Midlands bus, rail and Metro timetables and OpenStreetMap streets. The tool already accepts the result."
    },
    {
      title: "Cost each stop properly",
      body: `The ${formatGBP(75_000)} and ${formatGBP(150_000)} stop costs are placeholders. A quantity surveyor should price each design.`
    },
    {
      title: "Test it with residents",
      body: `Start in ${places}, the neighbourhoods the plan reaches first.`
    }
  ];

  return (
    <div className="page page--ask">
      <header className="page-header">
        <h1>The Ask</h1>
        <p className="page-lede">
          Phase 2 of the Innovation Spine has £10m to make the route usable. AccessBridge shows where its new stops would do
          the most for the people who need them most.
        </p>
      </header>

      <section className="ask-hero" aria-label="The default plan in one line">
        <p className="ask-hero-figure">
          <AnimatedNumber value={gain} startFrom={0} duration={1400} format={formatSigned} />
        </p>
        <p className="ask-hero-text">
          more of the most deprived residents within a {threshold}-minute walk of a stop, from {result.selected_stops.length} stops
          costing {formatGBP(cost)}.
        </p>
        <div className="ask-hero-tags">
          <EvidenceTag status="modelled" />
          <EvidenceTag status="placeholder" />
        </div>
      </section>

      <section aria-labelledby="phases-heading">
        <div className="section-heading">
          <h2 id="phases-heading">Three phases, one route</h2>
          <EvidenceTag status="brief" />
        </div>
        <ol className="phase-list">
          {PHASES.map((phase) => (
            <li key={phase.id} className={phase.current ? "is-current" : ""} aria-current={phase.current ? "step" : undefined}>
              <p className="phase-budget">{phase.budget}</p>
              <h3>
                Phase {phase.number}: {phase.name}
              </h3>
              <p>{phase.summary}</p>
              {phase.current ? <p className="phase-here">This site</p> : null}
              {phase.link ? (
                <a href={phase.link.href} target="_blank" rel="noreferrer" className="phase-link">
                  {phase.link.label}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </a>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="budget-share" aria-labelledby="budget-heading">
        <div className="section-heading">
          <h2 id="budget-heading">Where the stops sit in the £10m</h2>
          <EvidenceTag status="placeholder" />
          <EvidenceTag status="brief" />
        </div>
        <div
          className="budget-track"
          role="img"
          aria-label={`The default stop plan costs ${formatGBP(cost)}, ${percent(cost, PHASE_2_BUDGET_GBP)} of the £10m Phase 2 budget.`}
        >
          <span className="budget-fill" style={{ width: `${Math.max(share, 1.5)}%` }} />
        </div>
        <p className="budget-caption">
          <strong>{formatGBP(cost)}</strong> for the stops, about {percent(cost, PHASE_2_BUDGET_GBP)} of the Phase 2 budget. The rest
          is for Jennens Road, the Mobility Loop and everything else Phase 2 includes.
        </p>
      </section>

      <section aria-labelledby="asks-heading">
        <h2 id="asks-heading">What we ask for</h2>
        <ol className="ask-list">
          {asks.map((ask) => (
            <li key={ask.title}>
              <h3>{ask.title}</h3>
              <p>{ask.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="page-cta" aria-label="Next">
        <div className="button-row">
          <button type="button" className="button button--primary" onClick={() => navigate("explore")}>
            Explore the plan yourself
          </button>
          <a className="button" href={SPINELENS_URL} target="_blank" rel="noreferrer">
            Back to Phase 1 in SpineLens AI
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </div>
      </section>
    </div>
  );
}
