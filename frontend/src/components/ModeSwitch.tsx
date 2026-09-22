import { motion } from "motion/react";
import type { MapMode } from "@/map/layers";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{ mode: MapMode; label: string; hint: string }> = [
  { mode: "need", label: "Need", hint: "How deprived each area is" },
  { mode: "gap", label: "Gap", hint: "Who can reach rail or Metro today" },
  { mode: "gain", label: "Gain", hint: "Who the new stops reach" }
];

export function ModeSwitch({ mode, onChange }: { mode: MapMode; onChange: (mode: MapMode) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="What the map shows"
      data-testid="mode-switch"
      className="grid grid-cols-3 gap-1.5 rounded-xl border border-border/80 bg-popover/85 p-1.5 backdrop-blur-md edge-light"
    >
      {OPTIONS.map((option) => {
        const active = mode === option.mode;
        return (
          <button
            key={option.mode}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.mode)}
            className={cn(
              "relative grid gap-0.5 rounded-lg px-3 py-2 text-left transition-colors outline-none",
              "focus-visible:ring-[3px] focus-visible:ring-ring/50",
              active ? "text-foreground" : "text-muted-foreground hover:bg-accent/60"
            )}
          >
            {active ? (
              <motion.span
                layoutId="map-mode-active"
                className="absolute inset-0 rounded-lg border border-primary/70 bg-secondary"
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
              />
            ) : null}
            <strong className={cn("relative z-10 text-sm", active && "text-primary")}>{option.label}</strong>
            <span className="relative z-10 text-xs leading-tight text-dim max-sm:hidden">{option.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
