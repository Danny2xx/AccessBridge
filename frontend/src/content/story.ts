import type { FigureProps } from "@/components/Figure";
import { boundsOfPoints, type Bounds, type CameraTarget } from "@/lib/camera";
import { totalsByBand, type BandTotals } from "@/lib/deprivation";
import { formatGBP, formatNumber, formatPence, formatSigned, listPlaces, shareInTen } from "@/lib/format";
import type { MapMarker, MapMode } from "@/map/layers";
import type { EvidenceResponse, ScenarioResponse, StopDetail } from "@/types";
import { BKQ_MARKER, NEIGHBOURS } from "./spine";

export type StoryStep = {
  id: string;
  short: string;
  title: string;
  body: string[];
  figures: FigureProps[];
  stops?: Array<{ number: number; stop: StopDetail }>;
  bands?: BandTotals[];
  finale?: boolean;
  description: string;
  map: {
    mode: MapMode;
    is3d: boolean;
    camera: CameraTarget;
    showNetwork: boolean;
    showRailMetro: boolean;
    focusStopId: string | null;
    markers: MapMarker[];
    buildings3d: boolean;
  };
};

const STUDY_FALLBACK: Bounds = [-1.9537, 52.4542, -1.799, 52.5329];

export function buildStory(evidence: EvidenceResponse, scenario: ScenarioResponse): StoryStep[] {
  const facts = evidence.study_area;
  const result = evidence.default_result;
  const comparison = result.accessibility;
  const stops = result.stop_details;
  const threshold = result.threshold_min;
  const studyBounds: Bounds =
    scenario.study_area_bounds.length === 4 ? (scenario.study_area_bounds as Bounds) : STUDY_FALLBACK;
  const stopBounds =
    boundsOfPoints(
      stops.map((s) => [s.longitude, s.latitude]),
      0.012
    ) ?? studyBounds;
  const reachedWithStops = comparison?.scenario.most_deprived_decile_population ?? 0;
  const gain = comparison?.delta_most_deprived_decile_population ?? 0;
  const topStop = [...stops].sort((a, b) => b.most_deprived_reached - a.most_deprived_reached)[0];
  const link = stops.find((s) => s.is_interchange);
  const bands = comparison ? totalsByBand(comparison.decile_breakdown) : [];
  const otherBands = bands.slice(1);
  const otherToday = otherBands.reduce((sum, row) => sum + row.today, 0);
  const otherNew = otherBands.reduce((sum, row) => sum + row.newStops, 0);
  const noMarkers: MapMarker[] = [];

  const areaCamera = (pitch = 0, bearing = 0): CameraTarget => ({
    kind: "bounds",
    bounds: studyBounds,
    pitch,
    bearing
  });

  const steps: StoryStep[] = [
    {
      id: "phases",
      short: "Phase 2",
      title: "From Phase 1 to Phase 2",
      body: [
        "Phase 1 of the Innovation Spine makes the walk from the city centre to the Birmingham Knowledge Quarter easy to see and follow, for £1m.",
        "Phase 2 has £10m to make it usable, including a Mobility Loop with redesigned stops. AccessBridge asks one question about those stops: where would they do the most for the people who need them most?"
      ],
      figures: [
        { value: "£1m", label: "Phase 1: make it visible", status: "brief" },
        { value: "£10m", label: "Phase 2: make it usable", status: "brief", tone: "accent" }
      ],
      description:
        "A close, tilted view of the Birmingham Knowledge Quarter, between Aston University and Millennium Point, just east of the city centre.",
      map: {
        mode: "plain",
        is3d: false,
        camera: {
          kind: "point",
          longitude: BKQ_MARKER.longitude,
          latitude: BKQ_MARKER.latitude,
          zoom: 14.8,
          pitch: 58,
          bearing: -24
        },
        showNetwork: false,
        showRailMetro: false,
        focusStopId: null,
        markers: [BKQ_MARKER],
        buildings3d: true
      }
    },
    {
      id: "need",
      short: "Who lives here",
      title: "Who lives around it",
      body: [
        `The Knowledge Quarter sits beside ${NEIGHBOURS}. ${formatNumber(facts.population)} people live in the ${facts.neighbourhood_count} neighbourhoods around it.`,
        `${formatNumber(facts.most_deprived_population)} of them live in neighbourhoods ranked among the most deprived 10% in England. That is about ${shareInTen(facts.most_deprived_population, facts.population)} in every 10 people.`
      ],
      figures: [
        {
          value: formatNumber(facts.population),
          count: facts.population,
          label: `people in ${facts.neighbourhood_count} neighbourhoods`,
          status: "measured"
        },
        {
          value: formatNumber(facts.most_deprived_population),
          count: facts.most_deprived_population,
          label: "live in the most deprived 10% of neighbourhoods in England",
          status: "measured",
          tone: "accent"
        }
      ],
      description:
        "Neighbourhoods coloured by deprivation. Brighter pink means more deprived. Most of the area is in the brightest band.",
      map: {
        mode: "need",
        is3d: false,
        camera: areaCamera(),
        showNetwork: false,
        showRailMetro: false,
        focusStopId: null,
        markers: [BKQ_MARKER],
        buildings3d: false
      }
    },
    {
      id: "gap",
      short: "The gap",
      title: "The gap",
      body: [
        `Only ${formatNumber(facts.most_deprived_reached_today)} of those residents live within a ${threshold}-minute walk of a rail or Metro stop.`,
        `${formatNumber(facts.most_deprived_not_reached_today)} do not. For them, the city's fastest links are out of easy reach.`
      ],
      figures: [
        {
          value: formatNumber(facts.most_deprived_reached_today),
          count: facts.most_deprived_reached_today,
          label: `can walk to rail or Metro within ${threshold} minutes`,
          status: "modelled"
        },
        {
          value: formatNumber(facts.most_deprived_not_reached_today),
          count: facts.most_deprived_not_reached_today,
          label: "cannot",
          status: "modelled",
          tone: "accent"
        }
      ],
      description: `Red areas are among the most deprived 10% and have no rail or Metro stop within a ${threshold}-minute walk. Blue areas can reach one, and blue dots are today's rail and Metro stops.`,
      map: {
        mode: "gap",
        is3d: false,
        camera: areaCamera(),
        showNetwork: false,
        showRailMetro: true,
        focusStopId: null,
        markers: noMarkers,
        buildings3d: false
      }
    },
    {
      id: "plan",
      short: "The plan",
      title: "The plan",
      body: [
        `We gave an optimiser ${formatNumber(facts.candidate_stop_count)} possible stop locations from the national stop register, a budget of ${formatGBP(evidence.default_request.budget_gbp)} and a limit of ${evidence.default_request.max_stops} stops. The plan must include one rail or Metro link.`,
        `It counts a resident of the most deprived neighbourhoods ten times as much as one in the least deprived. It chose ${stops.length} stops, in ${listPlaces(
          stops.map((s) => s.place_name),
          7
        )}.`
      ],
      figures: [
        { value: String(stops.length), label: "stops chosen", status: "modelled", tone: "accent" },
        { value: formatGBP(result.total_cost_gbp), label: "total cost", status: "placeholder" },
        {
          value: formatNumber(facts.candidate_stop_count),
          label: "possible locations considered",
          status: "measured"
        }
      ],
      description:
        "The chosen stops, numbered along a schematic route. The line shows the order only. It is not a planned bus route.",
      map: {
        mode: "need",
        is3d: false,
        camera: { kind: "bounds", bounds: stopBounds },
        showNetwork: true,
        showRailMetro: false,
        focusStopId: null,
        markers: noMarkers,
        buildings3d: false
      }
    },
    {
      id: "gain",
      short: "Who gains",
      title: "Who gains",
      body: [
        `Together the ${stops.length} stops put ${formatNumber(reachedWithStops)} of the most deprived residents within a ${threshold}-minute walk of a stop.`,
        `That is ${formatNumber(gain)} more than can walk to rail or Metro today${
          evidence.cost_per_most_deprived_resident_gbp
            ? `, at about ${formatPence(evidence.cost_per_most_deprived_resident_gbp)} each in placeholder costs`
            : ""
        }.`
      ],
      figures: [
        {
          value: formatNumber(reachedWithStops),
          count: reachedWithStops,
          label: `most deprived residents within ${threshold} minutes of a new stop`,
          status: "modelled",
          tone: "accent"
        },
        {
          value: formatSigned(gain),
          count: gain,
          countFormat: "signed",
          label: "compared with rail or Metro today",
          status: "modelled"
        },
        ...(evidence.cost_per_most_deprived_resident_gbp
          ? [
              {
                value: formatPence(evidence.cost_per_most_deprived_resident_gbp),
                label: "per extra resident reached",
                status: "placeholder" as const
              }
            ]
          : [])
      ],
      description: `Magenta areas are within a ${threshold}-minute walk of a new stop, raised higher where need is greater. Blue areas can already walk to rail or Metro.`,
      map: {
        mode: "gain",
        is3d: true,
        camera: areaCamera(48, -18),
        showNetwork: true,
        showRailMetro: false,
        focusStopId: null,
        markers: noMarkers,
        buildings3d: false
      }
    }
  ];

  if (topStop) {
    const topNumber = stops.indexOf(topStop) + 1;
    steps.push({
      id: "stop",
      short: "Stop by stop",
      title: "Stop by stop",
      body: [
        `Stop ${topNumber}, ${topStop.name ?? "a new stop"} in ${topStop.place_name}, does the most. It reaches ${formatNumber(topStop.people_reached)} people across ${topStop.neighbourhoods.length} neighbourhoods, and ${formatNumber(topStop.most_deprived_reached)} of them live in the most deprived 10%.`,
        link
          ? `${link.name ?? "The rail or Metro stop"} is there to link the new stops to rail and Metro.${
              link.newly_reached === 0 ? " Everyone near it can already walk to rail or Metro." : ""
            }`
          : "The plan has no rail or Metro link, so every stop is a bus stop."
      ],
      figures: [],
      stops: stops.map((stop, index) => ({ number: index + 1, stop })),
      description: `A close view of ${topStop.name ?? "the top stop"}. Outlined neighbourhoods are within a ${threshold}-minute walk of it.`,
      map: {
        mode: "gain",
        is3d: false,
        camera: {
          kind: "point",
          longitude: topStop.longitude,
          latitude: topStop.latitude,
          zoom: 14.1,
          pitch: 52,
          bearing: -20
        },
        showNetwork: true,
        showRailMetro: false,
        focusStopId: topStop.candidate_id,
        markers: noMarkers,
        buildings3d: true
      }
    });
  }

  steps.push({
    id: "trade-off",
    short: "The trade-off",
    title: "The trade-off, and how sure we are",
    body: [
      `The plan aims at the most deprived first. In the other bands, the new stops reach ${formatNumber(otherNew)} people, against ${formatNumber(otherToday)} who can walk to rail or Metro today. The new stops add to today's stations. They do not replace them.`,
      "These are early figures. Walking times are straight-line estimates, and stop costs are placeholders. Real journey times and costed designs come next."
    ],
    figures: [],
    bands,
    finale: true,
    description: `Magenta areas are within a ${threshold}-minute walk of a new stop. Blue areas can walk to rail or Metro today.`,
    map: {
      mode: "gain",
      is3d: false,
      camera: areaCamera(),
      showNetwork: true,
      showRailMetro: true,
      focusStopId: null,
      markers: noMarkers,
      buildings3d: false
    }
  });

  return steps;
}
