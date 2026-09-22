import { ChevronDown } from "lucide-react";
import { useId } from "react";
import { bandForDecile } from "../lib/deprivation";
import { formatGBP, formatNumber, modeLabel, plural } from "../lib/format";
import type { StopDetail } from "../types";

type StopCardProps = {
  stop: StopDetail;
  number: number;
  threshold: number;
  focused: boolean;
  expanded: boolean;
  onFocus: () => void;
  onToggle: () => void;
};

export function stopReason(stop: StopDetail): string {
  if (stop.is_interchange) {
    return stop.newly_reached === 0
      ? "Links the new stops to the rail and Metro network. Everyone near it can already reach rail or Metro."
      : "Links the new stops to the rail and Metro network.";
  }
  if (stop.newly_reached === stop.people_reached) {
    return "Nobody it reaches can walk to rail or Metro today.";
  }
  return `${formatNumber(stop.newly_reached)} of the people it reaches cannot walk to rail or Metro today.`;
}

export function StopCard({ stop, number, threshold, focused, expanded, onFocus, onToggle }: StopCardProps) {
  const listId = useId();
  return (
    <li className={`stop-card${focused ? " is-focused" : ""}`}>
      <button type="button" className="stop-card-main" onClick={onFocus} aria-pressed={focused}>
        <span className="stop-number" aria-hidden="true">
          {number}
        </span>
        <span className="stop-heading">
          <strong>{stop.name ?? "New stop"}</strong>
          <span>
            {stop.place_name} · {modeLabel(stop.mode_hint)} · {formatGBP(stop.cost_gbp)}
          </span>
        </span>
      </button>
      <dl className="stop-facts">
        <div>
          <dt>People within {threshold} min</dt>
          <dd>{formatNumber(stop.people_reached)}</dd>
        </div>
        <div>
          <dt>Most deprived 10%</dt>
          <dd>{formatNumber(stop.most_deprived_reached)}</dd>
        </div>
        <div>
          <dt>No rail or Metro today</dt>
          <dd>{formatNumber(stop.newly_reached)}</dd>
        </div>
      </dl>
      <p className="stop-reason">{stopReason(stop)}</p>
      <button
        type="button"
        className="stop-toggle"
        aria-expanded={expanded}
        aria-controls={listId}
        onClick={onToggle}
      >
        {expanded ? "Hide" : "Show"} {plural(stop.neighbourhoods.length, "neighbourhood")}
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {expanded ? (
        <ul className="neighbourhood-list" id={listId}>
          {stop.neighbourhoods.map((n) => (
            <li key={n.lsoa21cd}>
              <span className="swatch" style={{ background: bandForDecile(n.imd_decile).color }} aria-hidden="true" />
              <span className="neighbourhood-name">
                {n.place_name}
                <small>
                  {n.lsoa_name} · {bandForDecile(n.imd_decile).short}
                  {n.reached_today ? " · reaches rail or Metro today" : ""}
                </small>
              </span>
              <span className="neighbourhood-numbers">
                {formatNumber(n.population)}
                <small>{Math.max(1, Math.round(n.travel_time_min))} min walk</small>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
