import { EVIDENCE, EvidenceTag, type EvidenceStatus } from "@/components/EvidenceTag";
import { Figure } from "@/components/Figure";
import { BandComparisonChart } from "@/components/charts/BandComparisonChart";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { ColumnChart, type ColumnPoint } from "@/components/charts/ColumnChart";
import { ShareBar } from "@/components/charts/ShareBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BANDS, totalsByBand } from "@/lib/deprivation";
import {
  formatGBP,
  formatGBPCompact,
  formatNumber,
  formatPence,
  formatSigned,
  modeLabel,
  percent,
  shareInTen
} from "@/lib/format";
import { COLOR } from "@/lib/palette";
import type { Route } from "@/lib/useHashRoute";
import type { EvidenceResponse } from "@/types";

type EvidencePageProps = {
  evidence: EvidenceResponse;
  navigate: (route: Route) => void;
};

const STATUS_ORDER: EvidenceStatus[] = ["measured", "modelled", "placeholder", "brief"];

export function EvidencePage({ evidence, navigate }: EvidencePageProps) {
  const facts = evidence.study_area;
  const result = evidence.default_result;
  const comparison = result.accessibility;
  const threshold = result.threshold_min;
  const bands = comparison ? totalsByBand(comparison.decile_breakdown) : [];
  const today = facts.most_deprived_reached_today;
  const maxStops = evidence.default_request.max_stops;

  const budget = evidence.budget_sensitivity;
  const firstAboveToday = budget.find((point) => point.most_deprived_reached >= today);
  const plateauIndex = budget.findIndex((point) => point.stop_count >= maxStops);
  const plateau = plateauIndex >= 0 ? budget[plateauIndex] : null;

  const budgetPoints: ColumnPoint[] = budget.map((point, index) => ({
    key: String(point.value),
    axisLabel: formatGBPCompact(point.value),
    value: point.most_deprived_reached,
    labelled: point.value === evidence.default_request.budget_gbp || index === budget.length - 1,
    ariaLabel: `${formatGBP(point.value)} budget: ${point.stop_count} stops reach ${formatNumber(point.most_deprived_reached)} of the most deprived residents`,
    tooltip: {
      value: `${formatNumber(point.most_deprived_reached)} most deprived residents`,
      label: `${formatGBP(point.value)} budget · ${point.stop_count} stops`,
      lines: [`${formatSigned(point.most_deprived_gain)} vs rail or Metro today`]
    }
  }));

  const walkPoints: ColumnPoint[] = evidence.walk_time_sensitivity.map((point) => ({
    key: String(point.value),
    axisLabel: `${point.value} min`,
    value: Math.max(0, point.most_deprived_gain),
    labelled: true,
    ariaLabel: `${point.value}-minute walk: ${formatSigned(point.most_deprived_gain)} most deprived residents compared with rail or Metro today`,
    tooltip: {
      value: `${formatSigned(point.most_deprived_gain)} most deprived residents`,
      label: `${point.value}-minute walk, compared with rail or Metro at the same walk`,
      lines: [`${point.stop_count} stops chosen`]
    }
  }));
  const bestWalk = [...evidence.walk_time_sensitivity].sort((a, b) => b.most_deprived_gain - a.most_deprived_gain)[0];
  const defaultWalk = evidence.walk_time_sensitivity.find((point) => point.value === threshold);

  const otherToday = bands.slice(1).reduce((sum, row) => sum + row.today, 0);
  const otherNew = bands.slice(1).reduce((sum, row) => sum + row.newStops, 0);
  const modeCounts = Object.entries(facts.candidate_counts_by_mode).sort((a, b) => b[1] - a[1]);
  const middlePopulation = facts.bottom_three_population - facts.most_deprived_population;
  const restPopulation = facts.population - facts.bottom_three_population;

  const costLines = Object.values(
    result.stop_details.reduce<Record<string, { label: string; count: number; each: number }>>((groups, stop) => {
      const key = `${stop.mode_hint}:${stop.cost_gbp}`;
      groups[key] ??= { label: modeLabel(stop.mode_hint), count: 0, each: stop.cost_gbp };
      groups[key].count += 1;
      return groups;
    }, {})
  );

  return (
    <div className="mx-auto grid max-w-[75rem] gap-12 px-[clamp(1rem,3vw,2rem)] pt-14 pb-20">
      <header className="grid gap-4">
        <h1 className="text-[clamp(2.2rem,1.6rem+2.4vw,3.25rem)] font-extrabold tracking-tight">The evidence</h1>
        <p className="max-w-[62ch] text-xl leading-snug text-muted-foreground">
          What the data shows, and how sure we are. Every figure carries a label that says where it comes from.
        </p>
        <dl className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(13.75rem,1fr))] gap-x-7 gap-y-3">
          {STATUS_ORDER.map((status) => (
            <div key={status} className="grid content-start gap-1.5">
              <dt className="m-0">
                <EvidenceTag status={status} />
              </dt>
              <dd className="m-0 text-sm leading-snug text-dim">{EVIDENCE[status].description}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="grid min-w-0 gap-5 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
        <ChartFrame
          title="Who lives here"
          tags={["measured"]}
          intro={`${formatNumber(facts.population)} people live in the ${facts.neighbourhood_count} neighbourhoods around the Knowledge Quarter.`}
          takeaway={`About ${shareInTen(facts.most_deprived_population, facts.population)} in 10 live in the most deprived 10% of neighbourhoods in England.`}
          table={{
            caption: "Study-area population by deprivation band",
            columns: ["Deprivation band", "People", "Share"],
            rows: [
              [BANDS[0].label, formatNumber(facts.most_deprived_population), percent(facts.most_deprived_population, facts.population)],
              ["10–30% most deprived", formatNumber(middlePopulation), percent(middlePopulation, facts.population)],
              ["Less deprived", formatNumber(restPopulation), percent(restPopulation, facts.population)]
            ]
          }}
        >
          <ShareBar
            segments={[
              { key: "d1", label: BANDS[0].label, value: facts.most_deprived_population, color: BANDS[0].color },
              { key: "d2-3", label: "10–30% most deprived", value: middlePopulation, color: BANDS[2].color },
              { key: "rest", label: "Less deprived", value: restPopulation, color: BANDS[4].color }
            ]}
          />
        </ChartFrame>

        <ChartFrame
          title="Today's gap"
          tags={["modelled"]}
          intro={`The most deprived residents, split by whether they can walk to a rail or Metro stop within ${threshold} minutes today.`}
          takeaway={`${formatNumber(facts.most_deprived_not_reached_today)} of them cannot. That is the gap the new stops aim at.`}
          table={{
            caption: "Most deprived residents by rail or Metro access today",
            columns: ["Group", "People", "Share"],
            rows: [
              ["Can walk to rail or Metro", formatNumber(today), percent(today, facts.most_deprived_population)],
              [
                "Cannot",
                formatNumber(facts.most_deprived_not_reached_today),
                percent(facts.most_deprived_not_reached_today, facts.most_deprived_population)
              ]
            ]
          }}
        >
          <ShareBar
            segments={[
              { key: "reached", label: `Can walk to rail or Metro within ${threshold} min`, value: today, color: COLOR.today },
              { key: "gap", label: "Cannot", value: facts.most_deprived_not_reached_today, color: COLOR.need }
            ]}
          />
        </ChartFrame>

        <ChartFrame
          wide
          title="Who gains, band by band"
          tags={["modelled"]}
          intro={`People within a ${threshold}-minute walk: of a rail or Metro stop today, and of one of the ${result.selected_stops.length} new stops.`}
          takeaway={`In the most deprived band, reach rises from ${formatNumber(bands[0]?.today ?? 0)} to ${formatNumber(bands[0]?.newStops ?? 0)}. In the other bands the new stops reach ${formatNumber(otherNew)} people against ${formatNumber(otherToday)} for rail and Metro, because the plan aims at the most deprived first. Today's stations stay, so the new stops add to what people have now.`}
          table={{
            caption: "People reached by deprivation band",
            columns: ["Deprivation band", "Rail or Metro today", "New stops", "Difference"],
            rows: bands.map((row) => [
              row.band.label,
              formatNumber(row.today),
              formatNumber(row.newStops),
              formatSigned(row.newStops - row.today)
            ])
          }}
        >
          <BandComparisonChart rows={bands} threshold={threshold} />
        </ChartFrame>

        <ChartFrame
          wide
          title="What more budget buys"
          tags={["modelled", "placeholder"]}
          intro={`Most deprived residents within a ${threshold}-minute walk of a new stop, for budgets from ${formatGBPCompact(budget[0]?.value ?? 0)} to ${formatGBPCompact(budget[budget.length - 1]?.value ?? 0)}, with at most ${maxStops} stops.`}
          takeaway={
            <>
              {firstAboveToday ? `The new stops overtake today's rail and Metro reach at ${formatGBP(firstAboveToday.value)}. ` : ""}
              {plateau
                ? `Reach keeps climbing until the ${maxStops}-stop limit at ${formatGBP(plateau.total_cost_gbp)}. After that, more money buys nothing unless the limit rises.`
                : ""}
            </>
          }
          table={{
            caption: "Budget sensitivity",
            columns: ["Budget", "Stops", "Cost", "Most deprived reached", "Change vs today"],
            rows: budget.map((point) => [
              formatGBP(point.value),
              point.stop_count,
              formatGBP(point.total_cost_gbp),
              formatNumber(point.most_deprived_reached),
              formatSigned(point.most_deprived_gain)
            ])
          }}
        >
          <ul className="mb-3 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-sm text-muted-foreground">
            <li className="inline-flex items-center gap-2">
              <span className="size-3 rounded-[3px] bg-proposal" aria-hidden="true" />
              Within {threshold} min of a new stop
            </li>
            <li className="inline-flex items-center gap-2">
              <span className="inline-block h-0 w-4 border-t-2 border-today" aria-hidden="true" />
              Rail or Metro today
            </li>
          </ul>
          <ColumnChart
            points={budgetPoints}
            reference={{ value: today, label: `Rail or Metro today: ${formatNumber(today)}` }}
            annotation={plateauIndex >= 0 ? { fromIndex: plateauIndex, text: `${maxStops}-stop limit reached` } : undefined}
          />
        </ChartFrame>

        <ChartFrame
          title="How walking time changes it"
          tags={["modelled"]}
          intro="Extra most deprived residents reached, compared with rail or Metro at the same walking time."
          takeaway={
            bestWalk && defaultWalk
              ? `The gain peaks at ${bestWalk.value} minutes and is ${formatNumber(defaultWalk.most_deprived_gain)} at ${threshold} minutes, which we use as the default.`
              : undefined
          }
          table={{
            caption: "Walking-time sensitivity",
            columns: ["Walking time", "Stops", "Most deprived reached", "Change vs today"],
            rows: evidence.walk_time_sensitivity.map((point) => [
              `${point.value} min`,
              point.stop_count,
              formatNumber(point.most_deprived_reached),
              formatSigned(point.most_deprived_gain)
            ])
          }}
        >
          <ColumnChart points={walkPoints} height={230} />
        </ChartFrame>

        <ChartFrame
          title="Value for money"
          tags={["placeholder"]}
          intro="What the default plan costs for each extra resident it reaches."
          takeaway="Stop costs are placeholders for testing the method. A quantity surveyor should price real designs."
        >
          <div className="grid gap-5">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(8.75rem,1fr))] gap-5">
              {evidence.cost_per_most_deprived_resident_gbp ? (
                <Figure
                  value={formatPence(evidence.cost_per_most_deprived_resident_gbp)}
                  label="per extra most deprived resident reached"
                  tone="amber"
                />
              ) : null}
              <Figure value={formatGBP(result.total_cost_gbp)} label={`for ${result.selected_stops.length} stops`} />
            </div>
            <ul className="grid list-none gap-0 p-0 text-sm" aria-label="How the cost adds up">
              {costLines.map((line) => (
                <li
                  key={`${line.label}-${line.each}`}
                  className="flex justify-between gap-3 border-b border-border py-2.5 last:border-0"
                >
                  <span className="text-muted-foreground">
                    {line.count} × {line.label.toLowerCase()} at {formatGBP(line.each)}
                  </span>
                  <strong className="tabular">{formatGBP(line.count * line.each)}</strong>
                </li>
              ))}
              <li className="flex justify-between gap-3 py-2.5">
                <span className="text-muted-foreground">Extra most deprived residents reached</span>
                <strong className="tabular">
                  {formatNumber(comparison?.delta_most_deprived_decile_population ?? 0)}
                </strong>
              </li>
            </ul>
          </div>
        </ChartFrame>

        <ChartFrame
          wide
          title="Stop by stop"
          tags={["modelled"]}
          intro={`The ${result.stop_details.length} stops in the default plan, in route order. Each column counts people within a ${threshold}-minute walk.`}
        >
          <div className="overflow-x-auto">
            <Table>
              <caption className="visually-hidden">Stops in the default plan</caption>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-dim">Stop</TableHead>
                  <TableHead className="text-dim">Area</TableHead>
                  <TableHead className="text-right text-dim">People</TableHead>
                  <TableHead className="text-right text-dim">Most deprived 10%</TableHead>
                  <TableHead className="text-right text-dim">No rail or Metro today</TableHead>
                  <TableHead className="text-right text-dim">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.stop_details.map((stop, index) => (
                  <TableRow key={stop.candidate_id}>
                    <TableCell className="font-semibold">
                      <span
                        aria-hidden="true"
                        className="mr-2.5 inline-grid size-[1.375rem] place-items-center rounded-full bg-primary align-middle text-xs font-extrabold text-primary-foreground tabular"
                      >
                        {index + 1}
                      </span>
                      {stop.name}
                      <small className="ml-2 font-normal text-dim">{modeLabel(stop.mode_hint)}</small>
                    </TableCell>
                    <TableCell>{stop.place_name}</TableCell>
                    <TableCell className="text-right tabular">{formatNumber(stop.people_reached)}</TableCell>
                    <TableCell className="text-right tabular">{formatNumber(stop.most_deprived_reached)}</TableCell>
                    <TableCell className="text-right tabular">{formatNumber(stop.newly_reached)}</TableCell>
                    <TableCell className="text-right tabular">{formatGBP(stop.cost_gbp)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ChartFrame>

        <ChartFrame
          title="Where the stops could go"
          tags={["measured"]}
          intro={`${formatNumber(facts.candidate_stop_count)} possible locations, taken from active stops in the national stop register (NaPTAN).`}
          takeaway={`${facts.rail_metro_stop_count} of them are rail or Metro stops, which count as today's network.`}
        >
          <ul className="grid list-none gap-0 p-0">
            {modeCounts.map(([mode, count]) => (
              <li key={mode} className="flex justify-between gap-3 border-b border-border py-2.5 last:border-0">
                <span className="text-muted-foreground">{modeLabel(mode)}</span>
                <strong className="tabular">{formatNumber(count)}</strong>
              </li>
            ))}
          </ul>
        </ChartFrame>

        <Card
          aria-labelledby="how-sure-heading"
          className="gap-4 rounded-2xl border-border/80 bg-card/70 p-6 backdrop-blur"
        >
          <h3 id="how-sure-heading" className="text-xl font-extrabold tracking-tight">
            How sure are we?
          </h3>
          <p className="text-muted-foreground">
            {evidence.routing.source_mode === "r5_input"
              ? "These figures use journey times from R5 routing on real timetables and streets."
              : "These figures use straight-line walking estimates at 80 metres a minute. Real streets make most walks longer, so treat the reach figures as upper estimates."}{" "}
            Deprivation and population are official statistics. Stop costs are placeholders.
          </p>
          <Button variant="outline" className="mt-auto self-start rounded-full" onClick={() => navigate("how-it-works")}>
            How it works
          </Button>
        </Card>
      </div>
    </div>
  );
}
