const numberFormatter = new Intl.NumberFormat("en-GB");
const MINUS = "−";

export function formatNumber(value: number): string {
  return numberFormatter.format(Math.round(value));
}

export function formatSigned(value: number): string {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${formatNumber(rounded)}`;
  if (rounded < 0) return `${MINUS}${formatNumber(Math.abs(rounded))}`;
  return "0";
}

export function formatGBP(value: number): string {
  return `£${formatNumber(value)}`;
}

export function formatGBPCompact(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `£${Number.isInteger(millions) ? millions : millions.toFixed(2).replace(/0$/, "")}m`;
  }
  if (value >= 1_000) return `£${Math.round(value / 1_000)}k`;
  return `£${value}`;
}

export function formatPence(value: number): string {
  return `£${value.toFixed(2)}`;
}

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

export function shareInTen(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 10) : 0;
}

export function percent(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "0%";
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : pluralForm}`;
}

const MODE_LABELS: Record<string, string> = {
  bus: "Bus stop",
  tram_metro: "Metro stop",
  rail: "Rail station",
  bus_coach_station: "Coach station"
};

export function modeLabel(mode: string | null | undefined): string {
  return (mode && MODE_LABELS[mode]) || "Stop";
}

export function listPlaces(places: string[], limit = 4): string {
  const unique = [...new Set(places)];
  if (unique.length <= 1) return unique[0] ?? "";
  if (unique.length <= limit) {
    return `${unique.slice(0, -1).join(", ")} and ${unique[unique.length - 1]}`;
  }
  return `${unique.slice(0, limit).join(", ")} and more`;
}
