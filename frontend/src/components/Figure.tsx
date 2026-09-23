import { formatNumber, formatSigned } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./AnimatedNumber";
import { EvidenceTag, type EvidenceStatus } from "./EvidenceTag";

export type FigureProps = {
  value: string;
  label: string;
  status?: EvidenceStatus;
  tone?: "default" | "amber";
  /** When set, the figure counts up to this number from zero. */
  count?: number;
  countFormat?: "number" | "signed";
  size?: "default" | "compact";
};

export function Figure({
  value,
  label,
  status,
  tone = "default",
  count,
  countFormat = "number",
  size = "default"
}: FigureProps) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <span
        data-testid="figure-value"className={cn(
          "font-semibold leading-none tracking-tight tabular",
          size === "compact" ? "text-xl" : "text-[clamp(1.6rem,1.3rem+1vw,2.1rem)]",
          tone === "amber" && "text-primary"
        )}
      >
        {count === undefined ? (
          value
        ) : (
          <AnimatedNumber value={count} startFrom={0} format={countFormat === "signed" ? formatSigned : formatNumber} />
        )}
      </span>
      <span className="text-sm leading-snug text-muted-foreground">{label}</span>
      {status ? <EvidenceTag status={status} className="mt-1" /> : null}
    </div>
  );
}
