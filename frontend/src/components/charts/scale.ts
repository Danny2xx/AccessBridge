/** Round a maximum up to a clean axis end and return evenly spaced ticks. */
export function niceTicks(maxValue: number, targetCount = 4): number[] {
  if (maxValue <= 0) return [0];
  const rough = maxValue / targetCount;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? rough;
  const ticks: number[] = [];
  for (let value = 0; value <= maxValue + step * 0.999; value += step) {
    ticks.push(Math.round(value));
    if (value >= maxValue) break;
  }
  return ticks;
}

export function tickLabel(value: number): string {
  if (value >= 1_000_000) return `${value / 1_000_000}m`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}
