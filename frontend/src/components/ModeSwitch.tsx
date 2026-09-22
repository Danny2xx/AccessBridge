import type { MapMode } from "../map/layers";

const OPTIONS: Array<{ mode: MapMode; label: string; hint: string }> = [
  { mode: "need", label: "Need", hint: "How deprived each area is" },
  { mode: "gap", label: "Gap", hint: "Who can reach rail or Metro today" },
  { mode: "gain", label: "Gain", hint: "Who the new stops reach" }
];

type ModeSwitchProps = {
  mode: MapMode;
  onChange: (mode: MapMode) => void;
};

export function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  return (
    <div className="mode-switch" role="radiogroup" aria-label="What the map shows">
      {OPTIONS.map((option) => (
        <button
          key={option.mode}
          type="button"
          role="radio"
          aria-checked={mode === option.mode}
          className={mode === option.mode ? "is-active" : ""}
          onClick={() => onChange(option.mode)}
        >
          <strong>{option.label}</strong>
          <span>{option.hint}</span>
        </button>
      ))}
    </div>
  );
}
