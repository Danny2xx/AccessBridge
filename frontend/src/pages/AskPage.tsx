import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { EvidenceTag } from "@/components/EvidenceTag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PHASE_2_BUDGET_GBP, PHASES, SPINELENS_URL } from "@/content/spine";
import { formatGBP, formatSigned, listPlaces, percent } from "@/lib/format";
import type { Route } from "@/lib/useHashRoute";
import { cn } from "@/lib/utils";
import type { EvidenceResponse } from "@/types";

type AskPageProps = {
  evidence: EvidenceResponse;
  navigate: (route: Route) => void;
};

export function AskPage({ evidence, navigate }: AskPageProps) {
  const reduced = useReducedMotion();
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
    <div className="mx-auto grid max-w-[75rem] gap-12 px-[clamp(1rem,3vw,2rem)] pt-14 pb-20">
      <header className="grid gap-4">
        <h1 className="text-[clamp(2.2rem,1.6rem+2.4vw,3.25rem)] font-extrabold tracking-tight">The Ask</h1>
        <p className="max-w-[62ch] text-xl leading-snug text-muted-foreground">
          Phase 2 of the Innovation Spine has £10m to make the route usable. AccessBridge shows where its new stops would
          do the most for the people who need them most.
        </p>
      </header>

      <Card
        aria-label="The default plan in one line"
        className="grid items-center gap-x-8 gap-y-3 rounded-3xl border-border/80 bg-card/70 p-[clamp(1.5rem,4vw,2.75rem)] backdrop-blur sm:grid-cols-[auto_minmax(0,1fr)]"
      >
        <p
          data-testid="ask-hero"
          className="text-[clamp(3rem,2rem+4vw,5.5rem)] leading-none font-extrabold tracking-tighter text-primary tabular"
        >
          <AnimatedNumber value={gain} startFrom={0} duration={1400} format={formatSigned} />
        </p>
        <p className="max-w-[34ch] text-[clamp(1.4rem,1.25rem+0.6vw,1.6rem)] leading-snug font-bold">
          more of the most deprived residents within a {threshold}-minute walk of a stop, from{" "}
          {result.selected_stops.length} stops costing {formatGBP(cost)}.
        </p>
        <div className="flex flex-wrap gap-1.5 sm:col-span-2">
          <EvidenceTag status="modelled" />
          <EvidenceTag status="placeholder" />
        </div>
      </Card>

      <section aria-labelledby="phases-heading" className="grid gap-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 id="phases-heading" className="text-[clamp(1.4rem,1.25rem+0.6vw,1.6rem)] font-extrabold tracking-tight">
            Three phases, one route
          </h2>
          <EvidenceTag status="brief" />
        </div>
        <ol className="grid list-none gap-4 p-0 lg:grid-cols-3">
          {PHASES.map((phase, index) => (
            <motion.li
              key={phase.id}
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
              aria-current={phase.current ? "step" : undefined}
              className={cn(
                "flex flex-col gap-2.5 rounded-2xl border p-6",
                phase.current ? "border-primary bg-card" : "border-border/80 bg-card/60"
              )}
            >
              <p className={cn("text-[clamp(1.7rem,1.4rem+1.2vw,2.15rem)] leading-none font-extrabold", phase.current && "text-primary")}>
                {phase.budget}
              </p>
              <h3 className="text-xl font-extrabold tracking-tight">
                Phase {phase.number}: {phase.name}
              </h3>
              <p className="text-muted-foreground">{phase.summary}</p>
              {phase.current ? (
                <Badge className="mt-auto self-start rounded-full font-extrabold">This site</Badge>
              ) : null}
              {phase.link ? (
                <a
                  href={phase.link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-auto inline-flex items-center gap-1 font-bold text-primary"
                >
                  {phase.link.label}
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </a>
              ) : null}
            </motion.li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="budget-heading" className="grid gap-3.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 id="budget-heading" className="text-[clamp(1.4rem,1.25rem+0.6vw,1.6rem)] font-extrabold tracking-tight">
            Where the stops sit in the £10m
          </h2>
          <EvidenceTag status="placeholder" />
          <EvidenceTag status="brief" />
        </div>
        <div
          role="img"
          aria-label={`The default stop plan costs ${formatGBP(cost)}, ${percent(cost, PHASE_2_BUDGET_GBP)} of the £10m Phase 2 budget.`}
          className="h-4 overflow-hidden rounded-lg bg-secondary"
        >
          <motion.span
            className="block h-full rounded-lg bg-primary"
            initial={reduced ? false : { width: 0 }}
            animate={{ width: `${Math.max(share, 1.5)}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <p className="max-w-[70ch] text-[1.0625rem] text-muted-foreground">
          <strong className="text-foreground">{formatGBP(cost)}</strong> for the stops, about{" "}
          {percent(cost, PHASE_2_BUDGET_GBP)} of the Phase 2 budget. The rest is for Jennens Road, the Mobility Loop and
          everything else Phase 2 includes.
        </p>
      </section>

      <section aria-labelledby="asks-heading" className="grid gap-5">
        <h2 id="asks-heading" className="text-[clamp(1.4rem,1.25rem+0.6vw,1.6rem)] font-extrabold tracking-tight">
          What we ask for
        </h2>
        <ol className="grid list-none gap-4 p-0 lg:grid-cols-2">
          {asks.map((ask, index) => (
            <motion.li
              key={ask.title}
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="grid content-start gap-2 rounded-2xl border border-border/80 bg-card/60 p-6 pl-[4.5rem] relative"
            >
              <span
                aria-hidden="true"
                className="absolute top-5 left-5 grid size-9 place-items-center rounded-full bg-primary font-extrabold text-primary-foreground"
              >
                {index + 1}
              </span>
              <h3 className="text-xl font-extrabold tracking-tight">{ask.title}</h3>
              <p className="text-muted-foreground">{ask.body}</p>
            </motion.li>
          ))}
        </ol>
      </section>

      <section aria-label="Next" className="flex flex-wrap gap-3 border-t border-border pt-8">
        <Button className="rounded-full font-bold" onClick={() => navigate("explore")}>
          Explore the plan yourself
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <a href={SPINELENS_URL} target="_blank" rel="noreferrer">
            Back to Phase 1 in SpineLens AI
            <ArrowUpRight aria-hidden="true" />
          </a>
        </Button>
      </section>
    </div>
  );
}
