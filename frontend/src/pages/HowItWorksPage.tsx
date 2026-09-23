import { EvidenceTag, type EvidenceStatus } from "@/components/EvidenceTag";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import type { Route } from "@/lib/useHashRoute";
import type { EvidenceResponse, ScenarioResponse } from "@/types";

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
      caveat:
        "It is a mixed-integer linear programme solved to a proven best answer, so the same settings always give the same stops."
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
    <div className="mx-auto grid max-w-[75rem] gap-12 px-[clamp(1rem,3vw,2rem)] pt-14 pb-20">
      <header className="grid gap-4">
        <h1 className="text-[clamp(1.9rem,1.5rem+1.6vw,2.6rem)] font-semibold tracking-tight">How it works</h1>
        <p className="max-w-[62ch] text-xl leading-snug text-muted-foreground">
          Four steps turn open data into a stop plan. Each one is simple enough to check.
        </p>
      </header>

      <ol className="grid list-none gap-0 p-0">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-5 border-b border-border py-7 first:border-t"
          >
            <span
              aria-hidden="true"className="grid size-11 place-items-center rounded-full border-[1.5px] border-primary text-xl font-semibold text-primary"
            >
              {index + 1}
            </span>
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-x-3.5 gap-y-2">
                <h2 className="text-[clamp(1.2rem,1.1rem+0.4vw,1.35rem)] font-semibold tracking-tight">{step.title}</h2>
                <EvidenceTag status={step.status} />
              </div>
              <p className="max-w-[68ch] text-[1.0625rem] text-muted-foreground">{step.body}</p>
              {step.caveat ? <p className="mt-2.5 max-w-[68ch] text-dim">{step.caveat}</p> : null}
            </div>
          </li>
        ))}
      </ol>

      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="limits-heading"className="grid content-start gap-4">
          <h2 id="limits-heading"className="text-[clamp(1.2rem,1.1rem+0.4vw,1.35rem)] font-semibold tracking-tight">
            What it does not do yet
          </h2>
          <ul className="grid list-disc gap-2.5 pl-5 text-muted-foreground marker:text-dim">
            {limits.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="sources-heading"className="grid content-start gap-4">
          <h2 id="sources-heading"className="text-[clamp(1.2rem,1.1rem+0.4vw,1.35rem)] font-semibold tracking-tight">
            Data and licences
          </h2>
          <ul className="grid list-none gap-3.5 p-0">
            {sources.map((source) => (
              <li key={source.name} className="grid gap-0.5 leading-snug">
                <strong>{source.name}</strong>
                <span className="text-muted-foreground">{source.use}</span>
                <small className="text-dim">{source.licence}</small>
              </li>
            ))}
          </ul>
          <p className="text-sm text-dim">
            {scenario.attribution.public_sector} {scenario.attribution.imd_ons_naptan} {scenario.attribution.osm}
          </p>
        </section>
      </div>

      <section aria-label="Next"className="grid gap-4 border-t border-border pt-8">
        <p className="max-w-[62ch] text-muted-foreground">
          Every chart on the evidence page can be shown as a table, and the Explore map lets you test your own budget.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button className="rounded-full font-bold"onClick={() => navigate("explore")}>
            Explore it yourself
          </Button>
          <Button variant="outline"className="rounded-full"onClick={() => navigate("evidence")}>
            See the evidence
          </Button>
        </div>
      </section>
    </div>
  );
}
