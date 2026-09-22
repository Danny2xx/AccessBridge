import { motion, useReducedMotion } from "motion/react";
import { formatNumber } from "@/lib/format";
import { AnimatedNumber } from "./AnimatedNumber";

type ReachBarProps = {
  total: number;
  today: number;
  withStops: number;
  threshold: number;
};

export function ReachBar({ total, today, withStops, threshold }: ReachBarProps) {
  const reduced = useReducedMotion();
  const rows = [
    { key: "today", label: "Rail or Metro today", value: today, bar: "bg-today" },
    { key: "new", label: "The new stops", value: withStops, bar: "bg-proposal" }
  ];

  return (
    <figure className="m-0 grid gap-2" data-testid="reach-bar">
      <figcaption className="text-xs text-dim">
        Most deprived residents within a {threshold}-minute walk, out of {formatNumber(total)}
      </figcaption>
      {rows.map((row) => (
        <div key={row.key} className="grid grid-cols-[7.5rem_minmax(0,1fr)_auto] items-center gap-2.5 text-sm">
          <span className="text-muted-foreground">{row.label}</span>
          <span className="h-3 overflow-hidden rounded-r bg-secondary">
            <motion.span
              className={`block h-full origin-left rounded-r ${row.bar}`}
              initial={reduced ? false : { scaleX: 0 }}
              animate={{ scaleX: total > 0 ? Math.min(1, row.value / total) : 0 }}
              transition={{ duration: reduced ? 0 : 0.75, ease: [0.22, 1, 0.36, 1] }}
            />
          </span>
          <span className="min-w-16 text-right font-bold tabular">
            <AnimatedNumber value={row.value} startFrom={0} format={formatNumber} />
          </span>
        </div>
      ))}
    </figure>
  );
}
