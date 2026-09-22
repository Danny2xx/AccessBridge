import { formatNumber } from "../../lib/format";
import { useChartTooltip, type TooltipContent } from "./ChartTooltip";
import { niceTicks, tickLabel } from "./scale";
import { useElementWidth } from "./useElementWidth";

export type ColumnPoint = {
  key: string;
  axisLabel: string;
  value: number;
  tooltip: TooltipContent;
  ariaLabel: string;
  labelled?: boolean;
};

type ColumnChartProps = {
  points: ColumnPoint[];
  reference?: { value: number; label: string };
  annotation?: { fromIndex: number; text: string };
  height?: number;
};

const MARGIN = { top: 34, right: 12, bottom: 34, left: 44 };
const RADIUS = 4;

function columnPath(x: number, y: number, width: number, height: number): string {
  const r = Math.min(RADIUS, height, width / 2);
  const bottom = y + height;
  return [
    `M${x},${bottom}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + width - r}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `V${bottom}`,
    "Z"
  ].join(" ");
}

/** Single-series columns from one baseline, with an optional reference line. */
export function ColumnChart({ points, reference, annotation, height = 260 }: ColumnChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const { bind, node } = useChartTooltip();
  const plotWidth = width - MARGIN.left - MARGIN.right;
  const plotHeight = height - MARGIN.top - MARGIN.bottom;
  const ticks = niceTicks(Math.max(1, reference?.value ?? 0, ...points.map((p) => p.value)));
  const axisMax = ticks[ticks.length - 1] || 1;
  const band = plotWidth / Math.max(1, points.length);
  const columnWidth = Math.min(24, band * 0.62);
  const y = (value: number) => MARGIN.top + plotHeight - (value / axisMax) * plotHeight;
  const labelEvery = band < 34 ? 2 : 1;

  return (
    <div className="chart-body" ref={ref}>
      <svg width={width} height={height} role="presentation" className="column-chart">
        {ticks.map((tick) => (
          <g key={tick} aria-hidden="true">
            <line className="gridline-svg" x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} />
            <text className="axis-text" x={MARGIN.left - 8} y={y(tick)} dy="0.32em" textAnchor="end">
              {tickLabel(tick)}
            </text>
          </g>
        ))}
        {points.map((point, index) => {
          const cx = MARGIN.left + band * index + band / 2;
          const top = y(point.value);
          return (
            <g key={point.key}>
              <path
                className="column"
                d={columnPath(cx - columnWidth / 2, top, columnWidth, MARGIN.top + plotHeight - top)}
              />
              {point.labelled ? (
                <text className="value-text" x={cx} y={top - 8} textAnchor="middle">
                  {formatNumber(point.value)}
                </text>
              ) : null}
              {index % labelEvery === 0 ? (
                <text className="axis-text" x={cx} y={height - MARGIN.bottom + 20} textAnchor="middle" aria-hidden="true">
                  {point.axisLabel}
                </text>
              ) : null}
              <rect
                className="column-hit"
                x={cx - band / 2}
                y={MARGIN.top}
                width={band}
                height={plotHeight}
                tabIndex={0}
                role="img"
                aria-label={point.ariaLabel}
                {...bind(point.tooltip)}
              />
            </g>
          );
        })}
        {reference ? (
          <g aria-hidden="true">
            <line
              className="reference-line"
              x1={MARGIN.left}
              x2={width - MARGIN.right}
              y1={y(reference.value)}
              y2={y(reference.value)}
            />
            <text className="reference-text" x={MARGIN.left + 6} y={y(reference.value) - 8}>
              {reference.label}
            </text>
          </g>
        ) : null}
        {annotation && annotation.fromIndex < points.length ? (
          <g aria-hidden="true" className="annotation">
            <line
              x1={MARGIN.left + band * annotation.fromIndex + 6}
              x2={width - MARGIN.right - 6}
              y1={14}
              y2={14}
            />
            <text x={(MARGIN.left + band * annotation.fromIndex + width - MARGIN.right) / 2} y={8} textAnchor="middle">
              {annotation.text}
            </text>
          </g>
        ) : null}
        <line
          className="baseline-svg"
          x1={MARGIN.left}
          x2={width - MARGIN.right}
          y1={MARGIN.top + plotHeight}
          y2={MARGIN.top + plotHeight}
        />
      </svg>
      {node}
    </div>
  );
}
