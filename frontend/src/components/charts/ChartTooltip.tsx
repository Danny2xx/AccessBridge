import { useCallback, useState, type FocusEvent, type PointerEvent } from "react";

export type TooltipContent = { value: string; label: string; lines?: string[] };
type TooltipState = TooltipContent & { x: number; y: number };

/**
 * One tooltip per chart. Values lead and labels follow; the same content shows
 * on keyboard focus as on hover. Every value is also in the chart's table view.
 */
export function useChartTooltip() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const bind = useCallback((content: TooltipContent) => {
    const place = (target: Element, clientX?: number, clientY?: number) => {
      const frame = target.closest(".chart-body");
      if (!frame) return;
      const box = frame.getBoundingClientRect();
      const markBox = target.getBoundingClientRect();
      const x = (clientX ?? markBox.left + markBox.width / 2) - box.left;
      const y = (clientY ?? markBox.top) - box.top;
      setTooltip({ ...content, x, y });
    };
    return {
      onPointerMove: (event: PointerEvent<Element>) =>
        place(event.currentTarget, event.clientX, event.clientY),
      onPointerLeave: () => setTooltip(null),
      onFocus: (event: FocusEvent<Element>) => place(event.currentTarget),
      onBlur: () => setTooltip(null)
    };
  }, []);

  const node = tooltip ? (
    <div className="chart-tooltip" style={{ left: tooltip.x, top: tooltip.y }} aria-hidden="true">
      <strong>{tooltip.value}</strong>
      <span>{tooltip.label}</span>
      {tooltip.lines?.map((line) => (
        <span key={line} className="chart-tooltip-line">
          {line}
        </span>
      ))}
    </div>
  ) : null;

  return { bind, node };
}
