import { motion, useReducedMotion } from "motion/react";
import type { BandTotals } from "@/lib/deprivation";
import { formatNumber, formatSigned } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useChartTooltip } from "./ChartTooltip";
import { niceTicks, tickLabel } from "./scale";

type BandComparisonChartProps = {
  rows: BandTotals[];
  threshold: number;
  compact?: boolean;
};

/** Paired bars per deprivation band: today's rail/Metro reach against the new stops. */
export function BandComparisonChart({ rows, threshold, compact = false }: BandComparisonChartProps) {
  const { bind, node } = useChartTooltip();
  const reduced = useReducedMotion();
  const ticks = niceTicks(Math.max(1, ...rows.flatMap((row) => [row.today, row.newStops])));
  const axisMax = ticks[ticks.length - 1] || 1;
  const pct = (value: number) => `${(value / axisMax) * 100}%`;
  const labelColumn = compact ? "7rem" : "9.375rem";

  return (
    <div data-chart-body className="relative min-w-0">
      <ul className="mb-3 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-sm text-muted-foreground">
        <li className="inline-flex items-center gap-2">
          <span className="size-3 rounded-[3px] bg-today" aria-hidden="true" />
          Rail or Metro within {threshold} min today
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="size-3 rounded-[3px] bg-proposal" aria-hidden="true" />A new stop within {threshold} min
        </li>
      </ul>

      <div className="grid gap-1">
        {rows.map((row, index) => (
          <div
            key={row.band.id}
            tabIndex={0}
            data-testid="band-row"
            aria-label={`${row.band.label}: ${formatNumber(row.today)} today, ${formatNumber(row.newStops)} with the new stops`}
            style={{ gridTemplateColumns: `${labelColumn} minmax(0,1fr)` }}
            className="grid cursor-default items-center gap-3.5 rounded-lg px-1 py-1.5 outline-none hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:ring-[3px] focus-visible:ring-ring/50"
            {...bind({
              value: `${formatNumber(row.newStops)} with the new stops`,
              label: row.band.label,
              lines: [
                `${formatNumber(row.today)} by rail or Metro today`,
                `${formatSigned(row.newStops - row.today)} difference`
              ]
            })}
          >
            <span className={cn("leading-tight text-muted-foreground", compact ? "text-xs" : "text-sm")}>
              {row.band.short}
            </span>
            <span className="relative mr-16 grid gap-0.5">
              {ticks.slice(1).map((tick) => (
                <span
                  key={tick}
                  aria-hidden="true"
                  style={{ left: pct(tick) }}
                  className="absolute -top-1.5 -bottom-1.5 w-px bg-border"
                />
              ))}
              {[
                { key: "today", value: row.today, color: "bg-today" },
                { key: "new", value: row.newStops, color: "bg-proposal" }
              ].map((bar) => (
                <motion.span
                  key={bar.key}
                  className={`block h-3 min-w-0.5 origin-left rounded-r ${bar.color}`}
                  initial={reduced ? false : { width: 0 }}
                  animate={{ width: pct(bar.value) }}
                  transition={{ duration: reduced ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
              ))}
              {index === 0 ? (
                <span
                  style={{ left: pct(Math.max(row.today, row.newStops)) }}
                  className="absolute top-1/2 ml-2 -translate-y-1/2 text-[0.8125rem] font-bold whitespace-nowrap tabular"
                >
                  {formatNumber(row.newStops)}
                </span>
              ) : null}
            </span>
          </div>
        ))}

        <div aria-hidden="true" style={{ gridTemplateColumns: `${labelColumn} minmax(0,1fr)` }} className="grid gap-3.5 px-1">
          <span />
          <span className="relative mr-16 h-5">
            {ticks.map((tick) => (
              <span
                key={tick}
                style={{ left: pct(tick) }}
                className="absolute top-1 -translate-x-1/2 text-xs text-dim tabular"
              >
                {tickLabel(tick)}
              </span>
            ))}
          </span>
        </div>
      </div>
      {node}
    </div>
  );
}
