import { formatNumber } from "../lib/format";
import { AnimatedNumber } from "./AnimatedNumber";

type ReachBarProps = {
  total: number;
  today: number;
  withStops: number;
  threshold: number;
};

function share(value: number, total: number): number {
  return total > 0 ? Math.min(1, value / total) : 0;
}

export function ReachBar({ total, today, withStops, threshold }: ReachBarProps) {
  const rows = [
    { key: "today", label: "Rail or Metro today", value: today },
    { key: "new", label: "The new stops", value: withStops }
  ];
  return (
    <figure className="reach-bar">
      <figcaption>
        Most deprived residents within a {threshold}-minute walk, out of {formatNumber(total)}
      </figcaption>
      {rows.map((row) => (
        <div className="reach-row" key={row.key}>
          <span className="reach-label">{row.label}</span>
          <span className="reach-track">
            <span
              className={`reach-fill reach-fill--${row.key}`}
              style={{ transform: `scaleX(${share(row.value, total)})` }}
            />
          </span>
          <span className="reach-value">
            <AnimatedNumber value={row.value} startFrom={0} format={formatNumber} />
          </span>
        </div>
      ))}
    </figure>
  );
}
