import { EvidenceTag, type EvidenceStatus } from "../components/EvidenceTag";
import { formatNumber } from "../lib/format";
import type { Route } from "../lib/useHashRoute";
import type { EvidenceResponse, ScenarioResponse } from "../types";

type HowItWorksPageProps = {
  scenario: ScenarioResponse;
  evidence: EvidenceResponse;
  navigate: (route: Route) => void;
};

type MethodStep = { title: string; status: EvidenceStatus; body: string; caveat?: string };

export function HowItWorksPage({ scenario, evidence, navigate }: HowItWorksPageProps) {
  const facts = evidence.study_area;
  const pairs = facts.neighbourhood_count * facts.candidate_stop_count;
  const usesR5 = evidence.routing.source_mode === "r5_input";

  const steps: MethodStep[] = [
    {
      title: "Map who lives where",
      status: "measured",
      body: `We join the 2025 Index of Multiple Deprivation to ONS population estimates for the ${facts.neighbourhood_count} neighbourhoods around the Knowledge Quarter. Each neighbourhood is a Lower Layer Super Output Area, usually home to 1,000 to 3,000 people.`
    },
    {
      title: "Measure walking reach",
      status: "modelled",
      body: usesR5
        ? `For every neighbourhood and each of the ${formatNumber(facts.candidate_stop_count)} possible stops, we use journey times from R5 routing on real timetables and streets. That is ${formatNumber(pairs)} pairs.`
        : `For every neighbourhood and each of the ${formatNumber(facts.candidate_stop_count)} possible stops, we estimate the walk from the neighbourhood's centre in a straight line at 80 metres a minute. That is ${formatNumber(pairs)} pairs.`,
      caveat: usesR5
        ? undefined
        : "Real streets make most walks longer. The next step is real journey-time routing with R5, and the tool is already built to take it."
    },
    {
      title: "Choose the stops",
      status: "modelled",
      body: "An optimiser picks the set of stops that reaches the most people within the budget and the stop limit. A resident of the most deprived neighbourhoods counts ten times as much as one in the least deprived. By default the plan must include one rail or Metro link.",
      caveat: "It is a mixed-integer linear programme solved to a proven best answer, so the same settings always give the same stops."
    },
    {
      title: "Check the result",
      status: "modelled",
      body: "We compare who the new stops reach with who can walk to rail or Metro today, band by band. Losses are shown alongside gains, and every figure is labelled as measured, modelled or a placeholder."
    }
  ];

  const limits = [
    "How often buses would run, or how reliable they would be.",
    "Real construction costs. Stop costs are placeholders.",
    "Road capacity, vehicle operations or timetables.",
    "What residents and businesses want. That needs consultation.",
    "How many people would actually use each stop."
  ];

  const sources = [
    { name: "English Indices of Deprivation 2025", use: "How deprived each neighbourhood is", licence: "Open Government Licence v3.0" },
    { name: "ONS population estimates, mid-2024", use: "How many people live in each neighbourhood", licence: "Open Government Licence v3.0" },
    { name: "ONS and Ordnance Survey LSOA 2021 boundaries", use: "Neighbourhood shapes", licence: "Open Government Licence v3.0" },
    { name: "NaPTAN national stop register", use: "Possible stop locations and place names", licence: "Open Government Licence v3.0" },
    { name: "OpenStreetMap and CARTO basemap", use: "The background map", licence: "ODbL; © CARTO" }
  ];

  return (
    <div className="page page--method">
      <header className="page-header">
        <h1>How it works</h1>
        <p className="page-lede">Four steps turn open data into a stop plan. Each one is simple enough to check.</p>
      </header>

      <ol className="method-steps">
        {steps.map((step, index) => (
          <li key={step.title}>
            <span className="method-number" aria-hidden="true">
              {index + 1}
            </span>
            <div>
              <div className="method-heading">
                <h2>{step.title}</h2>
                <EvidenceTag status={step.status} />
              </div>
              <p>{step.body}</p>
              {step.caveat ? <p className="method-caveat">{step.caveat}</p> : null}
            </div>
          </li>
        ))}
      </ol>

      <div className="method-columns">
        <section aria-labelledby="limits-heading">
          <h2 id="limits-heading">What it does not do yet</h2>
          <ul className="plain-list">
            {limits.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="sources-heading">
          <h2 id="sources-heading">Data and licences</h2>
          <ul className="source-list">
            {sources.map((source) => (
              <li key={source.name}>
                <strong>{source.name}</strong>
                <span>{source.use}</span>
                <small>{source.licence}</small>
              </li>
            ))}
          </ul>
          <p className="attribution">
            {scenario.attribution.public_sector} {scenario.attribution.imd_ons_naptan} {scenario.attribution.osm}
          </p>
        </section>
      </div>

      <section className="page-cta" aria-label="Next">
        <p>Every chart on the evidence page can be shown as a table, and the Explore map lets you test your own budget.</p>
        <div className="button-row">
          <button type="button" className="button button--primary" onClick={() => navigate("explore")}>
            Explore it yourself
          </button>
          <button type="button" className="button" onClick={() => navigate("evidence")}>
            See the evidence
          </button>
        </div>
      </section>
    </div>
  );
}
