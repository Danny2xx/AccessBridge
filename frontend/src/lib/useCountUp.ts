import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";

/**
 * Count from the previous value (or `startFrom` on first render) to `target`.
 * A safety timer always lands on the final value, so a paused animation frame
 * (a background tab, a headless renderer) can never leave a wrong number shown.
 */
export function useCountUp(target: number, { duration = 900, startFrom }: { duration?: number; startFrom?: number } = {}) {
  const reducedMotion = useReducedMotion();
  const initial = reducedMotion ? target : startFrom ?? target;
  const [display, setDisplay] = useState(initial);
  const current = useRef(initial);

  useEffect(() => {
    const from = current.current;
    if (reducedMotion || from === target) {
      current.current = target;
      setDisplay(target);
      return;
    }
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 4);
      const next = Math.round(from + (target - from) * eased);
      current.current = next;
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const safety = window.setTimeout(() => {
      current.current = target;
      setDisplay(target);
    }, duration + 250);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(safety);
    };
  }, [target, duration, reducedMotion]);

  return display;
}
