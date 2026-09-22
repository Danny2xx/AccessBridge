import { formatNumber, formatSigned } from "../lib/format";
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
};

export function Figure({ value, label, status, tone = "default", count, countFormat = "number" }: FigureProps) {
  return (
    <div className={`figure figure--${tone}`}>
      <span className="figure-value">
        {count === undefined ? (
          value
        ) : (
          <AnimatedNumber value={count} startFrom={0} format={countFormat === "signed" ? formatSigned : formatNumber} />
        )}
      </span>
      <span className="figure-label">{label}</span>
      {status ? <EvidenceTag status={status} /> : null}
    </div>
  );
}
