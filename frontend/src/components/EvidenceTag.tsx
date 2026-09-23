import { Calculator, Database, FileText, PencilRuler, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type EvidenceStatus = "measured" | "modelled" | "placeholder" | "brief";

export const EVIDENCE: Record<EvidenceStatus, { label: string; description: string; icon: LucideIcon }> = {
  measured: {
    label: "Measured data",
    description:
      "Official statistics and registers: IMD 2025 deprivation, ONS population estimates and the NaPTAN national stop register.",
    icon: Database
  },
  modelled: {
    label: "Our modelling",
    description:
      "Calculated by AccessBridge from measured data. Walking times are straight-line estimates until real journey times are added.",
    icon: Calculator
  },
  placeholder: {
    label: "Placeholder cost",
    description:
      "An assumed figure used to test the method: £75,000 per bus stop and £150,000 per rail or Metro stop. Not a quote.",
    icon: PencilRuler
  },
  brief: {
    label: "Challenge brief",
    description:
      "Budget levels set by the UKREiiF challenge brief and used by the Innovation Spine phases: £1m, £10m and unlimited.",
    icon: FileText
  }
};

export function EvidenceTag({ status, className }: { status: EvidenceStatus; className?: string }) {
  const { label, description, icon: Icon } = EVIDENCE[status];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="secondary"
          data-testid="evidence-tag"
          className={cn(
            "cursor-help gap-1.5 rounded-full border-border bg-secondary/70 py-1 pr-2.5 pl-2 font-semibold text-muted-foreground backdrop-blur",
            className
          )}
        >
          <Icon className="size-3 text-dim" aria-hidden="true" />
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-pretty">{description}</TooltipContent>
    </Tooltip>
  );
}
