import { motion, useReducedMotion } from "motion/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { MapMode } from "@/map/layers";

const OPTIONS: Array<{ mode: MapMode; label: string; hint: string }> = [
  { mode: "need", label: "Need", hint: "How deprived each neighbourhood is" },
  { mode: "gap", label: "Gap", hint: "Who can reach rail or Metro today" },
  { mode: "gain", label: "Gain", hint: "Who the new stops reach" }
];

export function ModeSwitch({ mode, onChange }: { mode: MapMode; onChange: (mode: MapMode) => void }) {
  const reduced = useReducedMotion();

  return (
    <div
      role="radiogroup"
      aria-label="What the map shows"
      data-testid="mode-switch"
      className="flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5"
    >
      {OPTIONS.map((option) => {
        const active = mode === option.mode;
        return (
          <Tooltip key={option.mode}>
            <TooltipTrigger asChild>
              <button
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange(option.mode)}
                className={cn(
                  "relative rounded-[0.3rem] px-3 py-1.5 text-sm font-medium transition-colors outline-none",
                  "focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {active ? (
                  <motion.span
                    layoutId={reduced ? undefined : "map-mode-active"}
                    className="absolute inset-0 rounded-[0.3rem] bg-primary"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                ) : null}
                <span className="relative z-10">{option.label}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{option.hint}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
