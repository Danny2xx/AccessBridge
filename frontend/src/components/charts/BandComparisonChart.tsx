import type { BandTotals } from "../../lib/deprivation";
import { formatNumber, formatSigned } from "../../lib/format";
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
  const ticks = niceTicks(Math.max(1, ...rows.flatMap((row) => [row.today, row.newStops])));
  const axisMax = ticks[ticks.length - 1] || 1;
  const pct = (value: number) => `${(value / axisMax) * 100}%`;

  return (
    <div className={`chart-body band-chart${compact ? " is-compact" : ""}`}>
      <ul className="chart-legend" aria-label="Legend">
        <li>
          <span className="legend-rect legend-rect--today" aria-hidden="true" />
          Rail or Metro within {threshold} min today
        </li>
        <li>
          <span className="legend-rect legend-rect--new" aria-hidden="true" />
          A new stop within {threshold} min
        </li>
      </ul>
      <div className="band-grid">
        {rows.map((row, index) => (
          <div
            key={row.band.id}
            className="band-row"
            tabIndex={0}
            aria-label={`${row.band.label}: ${formatNumber(row.today)} today, ${formatNumber(row.newStops)} with the new stops`}
            {...bind({
              value: `${formatNumber(row.newStops)} with the new stops`,
              label: row.band.label,
              lines: [
                `${formatNumber(row.today)} by rail or Metro today`,
                `${formatSigned(row.newStops - row.today)} difference`
              ]
            })}
          >
            <span className="band-label">{row.band.short}</span>
            <span className="band-bars">
              {ticks.slice(1).map((tick) => (
                <span key={tick} className="gridline" style={{ left: pct(tick) }} aria-hidden="true" />
              ))}
              <span className="hbar hbar--today" style={{ width: pct(row.today) }} />
              <span className="hbar hbar--new" style={{ width: pct(row.newStops) }} />
              {index === 0 ? (
                <span className="hbar-label" style={{ left: pct(Math.max(row.today, row.newStops)) }}>
                  {formatNumber(row.newStops)}
                </span>
              ) : null}
            </span>
          </div>
        ))}
        <div className="band-axis" aria-hidden="true">
          <span />
          <span className="band-axis-ticks">
            {ticks.map((tick) => (
              <span key={tick} style={{ left: pct(tick) }}>
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
