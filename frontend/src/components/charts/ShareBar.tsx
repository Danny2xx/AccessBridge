import { motion, useReducedMotion } from "motion/react";
import { formatNumber, percent } from "@/lib/format";
import { useChartTooltip } from "./ChartTooltip";

export type ShareSegment = { key: string; label: string; value: number; color: string };

/** One stacked bar showing parts of a whole, with a legend that carries the numbers. */
export function ShareBar({ segments, unit = "people" }: { segments: ShareSegment[]; unit?: string }) {
  const { bind, node } = useChartTooltip();
  const reduced = useReducedMotion();
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div data-chart-body className="relative min-w-0">
      <motion.div
        className="flex h-6 gap-0.5 overflow-hidden rounded-md"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {segments
          .filter((segment) => segment.value > 0)
          .map((segment) => (
            <motion.span
              key={segment.key}
              tabIndex={0}
              role="img"
              aria-label={`${segment.label}: ${formatNumber(segment.value)} ${unit}, ${percent(segment.value, total)}`}
              style={{ flexGrow: segment.value, background: segment.color }}
              className="min-w-1 basis-0 transition-[filter] outline-none hover:brightness-115 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:brightness-115 focus-visible:ring-inset"
              initial={reduced ? false : { scaleY: 0.3 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: reduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
              {...bind({
                value: `${formatNumber(segment.value)} ${unit}`,
                label: segment.label,
                lines: [`${percent(segment.value, total)} of the total`]
              })}
            />
          ))}
      </motion.div>

      <ul className="mt-3.5 grid list-none gap-2 p-0 text-sm">
        {segments.map((segment) => (
          <li key={segment.key} className="grid grid-cols-[0.75rem_1fr_auto] items-center gap-2.5">
            <span className="size-3 rounded-[3px]" style={{ background: segment.color }} aria-hidden="true" />
            <span className="text-muted-foreground">{segment.label}</span>
            <span className="font-bold">
              {formatNumber(segment.value)}{" "}
              <small className="ml-1.5 font-normal text-dim">{percent(segment.value, total)}</small>
            </span>
          </li>
        ))}
      </ul>
      {node}
    </div>
  );
}
