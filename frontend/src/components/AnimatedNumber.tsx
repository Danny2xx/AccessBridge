import { useCountUp } from "../lib/useCountUp";

type AnimatedNumberProps = {
  value: number;
  format: (value: number) => string;
  startFrom?: number;
  duration?: number;
};

/** Counts visually; screen readers and copy-paste get the final value. */
export function AnimatedNumber({ value, format, startFrom, duration }: AnimatedNumberProps) {
  const display = useCountUp(value, { startFrom, duration });
  return (
    <>
      <span aria-hidden="true">{format(display)}</span>
      <span className="visually-hidden">{format(value)}</span>
    </>
  );
}
