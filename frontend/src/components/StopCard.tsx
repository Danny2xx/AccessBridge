import { ChevronDown, TrainFront } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { bandForDecile } from "@/lib/deprivation";
import { formatGBP, formatNumber, modeLabel, plural } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StopDetail } from "@/types";

type StopCardProps = {
  stop: StopDetail;
  number: number;
  threshold: number;
  focused: boolean;
  expanded: boolean;
  onFocus: () => void;
  onToggle: () => void;
};

export function stopReason(stop: StopDetail): string {
  if (stop.is_interchange) {
    return stop.newly_reached === 0
      ? "Links the new stops to the rail and Metro network. Everyone near it can already reach rail or Metro."
      : "Links the new stops to the rail and Metro network.";
  }
  if (stop.newly_reached === stop.people_reached) {
    return "Nobody it reaches can walk to rail or Metro today.";
  }
  return `${formatNumber(stop.newly_reached)} of the people it reaches cannot walk to rail or Metro today.`;
}

export function StopCard({ stop, number, threshold, focused, expanded, onFocus, onToggle }: StopCardProps) {
  const reduced = useReducedMotion();
  const facts = [
    { label: `People within ${threshold} min`, value: stop.people_reached },
    { label: "Most deprived 10%", value: stop.most_deprived_reached },
    { label: "No rail or Metro today", value: stop.newly_reached }
  ];

  return (
    <motion.li
      layout={!reduced}
      data-testid="stop-card"
      data-focused={focused}
      className={cn(
        "group relative grid gap-3 rounded-xl border bg-card/80 p-4 transition-colors",
        focused ? "border-primary/80 bg-card shadow-[0_0_0_1px_var(--primary)]" : "border-border hover:border-input"
      )}
    >
      <button
        type="button"
        onClick={onFocus}
        aria-pressed={focused}
        data-testid="stop-card-main"
        className="grid w-full grid-cols-[1.875rem_1fr] items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <span
          aria-hidden="true"
          className="grid size-7 place-items-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground tabular"
        >
          {number}
        </span>
        <span className="grid leading-tight">
          <strong className="text-[0.95rem] group-hover:underline group-hover:underline-offset-4">
            {stop.name ?? "New stop"}
          </strong>
          <span className="flex items-center gap-1.5 text-xs text-dim">
            {stop.is_interchange ? <TrainFront className="size-3" aria-hidden="true" /> : null}
            {stop.place_name} · {modeLabel(stop.mode_hint)} · {formatGBP(stop.cost_gbp)}
          </span>
        </span>
      </button>

      <dl className="m-0 grid grid-cols-3 gap-2.5">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="text-xs leading-tight text-dim">{fact.label}</dt>
            <dd className="m-0 mt-0.5 font-extrabold tabular">{formatNumber(fact.value)}</dd>
          </div>
        ))}
      </dl>

      <p className="text-sm leading-snug text-muted-foreground">{stopReason(stop)}</p>

      <Collapsible open={expanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" data-testid="stop-toggle" className="-ml-2 h-8 gap-1.5 px-2 text-muted-foreground">
            {expanded ? "Hide" : "Show"} {plural(stop.neighbourhoods.length, "neighbourhood")}
            <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} aria-hidden="true" />
          </Button>
        </CollapsibleTrigger>
        <AnimatePresence initial={false}>
          {expanded ? (
            <CollapsibleContent forceMount asChild>
              <motion.div
                initial={reduced ? false : { height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={reduced ? undefined : { height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <ul className="mt-2 grid gap-2 border-t border-border pt-3 text-sm">
                  {stop.neighbourhoods.map((neighbourhood) => (
                    <li
                      key={neighbourhood.lsoa21cd}
                      data-testid="neighbourhood-row"
                      className="grid grid-cols-[0.75rem_1fr_auto] items-start gap-2.5 leading-tight"
                    >
                      <span
                        className="mt-1 size-3 rounded-[3px]"
                        style={{ background: bandForDecile(neighbourhood.imd_decile).color }}
                        aria-hidden="true"
                      />
                      <span className="grid">
                        {neighbourhood.place_name}
                        <small className="text-xs text-dim">
                          {neighbourhood.lsoa_name} · {bandForDecile(neighbourhood.imd_decile).short}
                          {neighbourhood.reached_today ? " · reaches rail or Metro today" : ""}
                        </small>
                      </span>
                      <span className="grid justify-items-end font-bold tabular">
                        {formatNumber(neighbourhood.population)}
                        <small className="text-xs font-normal text-dim">
                          {Math.max(1, Math.round(neighbourhood.travel_time_min))} min walk
                        </small>
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </CollapsibleContent>
          ) : null}
        </AnimatePresence>
      </Collapsible>

      {stop.is_interchange ? (
        <Badge variant="outline" className="absolute top-4 right-4 border-today/60 text-today-ui">
          Rail or Metro link
        </Badge>
      ) : null}
    </motion.li>
  );
}
