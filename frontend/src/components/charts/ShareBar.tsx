import { formatNumber, percent } from "../../lib/format";
import { useChartTooltip } from "./ChartTooltip";

export type ShareSegment = { key: string; label: string; value: number; color: string };

/** One stacked bar showing parts of a whole, with a legend that carries the numbers. */
export function ShareBar({ segments, unit = "people" }: { segments: ShareSegment[]; unit?: string }) {
  const { bind, node } = useChartTooltip();
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  return (
    <div className="chart-body share-bar">
      <div className="share-track">
        {segments
          .filter((segment) => segment.value > 0)
          .map((segment) => (
            <span
              key={segment.key}
              className="share-segment"
              style={{ flexGrow: segment.value, background: segment.color }}
              tabIndex={0}
              role="img"
              aria-label={`${segment.label}: ${formatNumber(segment.value)} ${unit}, ${percent(segment.value, total)}`}
              {...bind({
                value: `${formatNumber(segment.value)} ${unit}`,
                label: segment.label,
                lines: [`${percent(segment.value, total)} of the total`]
              })}
            />
          ))}
      </div>
      <ul className="share-legend">
        {segments.map((segment) => (
          <li key={segment.key}>
            <span className="legend-rect" style={{ background: segment.color }} aria-hidden="true" />
            <span className="share-legend-label">{segment.label}</span>
            <span className="share-legend-value">
              {formatNumber(segment.value)} <small>{percent(segment.value, total)}</small>
            </span>
          </li>
        ))}
      </ul>
      {node}
    </div>
  );
}
