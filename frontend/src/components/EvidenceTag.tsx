import { Calculator, Database, FileText, PencilRuler, type LucideIcon } from "lucide-react";

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

export function EvidenceTag({ status }: { status: EvidenceStatus }) {
  const { label, description, icon: Icon } = EVIDENCE[status];
  return (
    <span className={`evidence-tag evidence-tag--${status}`} title={description}>
      <Icon size={13} aria-hidden="true" />
      {label}
    </span>
  );
}
