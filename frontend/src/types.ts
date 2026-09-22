export type GeoJsonFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: unknown;
  };
};

export type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

export type AccessibilityMetric = {
  threshold_min: number;
  covered_origin_ids: string[];
  population_by_decile: Array<{
    imd_decile: number;
    population: number;
  }>;
  most_deprived_decile_population: number;
  bottom_three_deciles_population: number;
  total_population: number;
};

export type DecileDelta = {
  imd_decile: number;
  baseline_population: number;
  scenario_population: number;
  delta_population: number;
};

export type OptimisationRequest = {
  budget_gbp: number;
  max_stops: number;
  threshold_min: number;
  require_interchange: boolean;
};

export type ScenarioResponse = {
  lsoa_geojson: GeoJsonFeatureCollection;
  candidate_stops_geojson: GeoJsonFeatureCollection;
  baseline: AccessibilityMetric;
  attribution: {
    public_sector: string;
    imd_ons_naptan: string;
    osm: string;
    transit: string;
  };
  method: string;
  method_caveat: string;
  default_request: OptimisationRequest;
  study_area_bounds: [number, number, number, number] | [];
};

export type NeighbourhoodReach = {
  lsoa21cd: string;
  lsoa_name: string;
  place_name: string;
  imd_decile: number;
  population: number;
  travel_time_min: number;
  reached_today: boolean;
};

export type StopDetail = {
  candidate_id: string;
  name: string | null;
  place_name: string;
  mode_hint: string | null;
  cost_gbp: number;
  is_interchange: boolean;
  longitude: number;
  latitude: number;
  people_reached: number;
  most_deprived_reached: number;
  newly_reached: number;
  only_this_stop: number;
  neighbourhoods: NeighbourhoodReach[];
};

export type AccessibilityComparison = {
  method: string;
  method_caveat: string;
  threshold_min: number;
  selected_candidate_ids: string[];
  baseline: AccessibilityMetric;
  scenario: AccessibilityMetric;
  delta_most_deprived_decile_population: number;
  delta_bottom_three_deciles_population: number;
  delta_total_population: number;
  decile_breakdown: DecileDelta[];
};

export type OptimisationResult = {
  status: "optimal" | "infeasible" | "solver_error";
  feasible: boolean;
  solver_status: string;
  budget_gbp: number;
  max_stops: number;
  threshold_min: number;
  require_interchange: boolean;
  objective_value: number;
  total_cost_gbp: number;
  selected_stops: Array<{
    candidate_id: string;
    name: string | null;
    mode_hint: string | null;
    cost_gbp: number;
    is_interchange: boolean;
  }>;
  covered_origin_ids: string[];
  accessibility: AccessibilityComparison | null;
  route_geojson: GeoJsonFeatureCollection | null;
  stop_details: StopDetail[];
  explanation: string;
};

export type SensitivityPoint = {
  value: number;
  feasible: boolean;
  stop_count: number;
  total_cost_gbp: number;
  most_deprived_reached: number;
  most_deprived_gain: number;
  bottom_three_gain: number;
  total_gain: number;
};

export type StudyAreaFacts = {
  neighbourhood_count: number;
  population: number;
  most_deprived_population: number;
  most_deprived_neighbourhood_count: number;
  bottom_three_population: number;
  candidate_stop_count: number;
  rail_metro_stop_count: number;
  candidate_counts_by_mode: Record<string, number>;
  threshold_min: number;
  most_deprived_reached_today: number;
  most_deprived_not_reached_today: number;
};

export type EvidenceResponse = {
  routing: {
    method: string;
    method_caveat: string;
    source_mode: string;
    routing_source: string;
    routing_profile: string;
  };
  study_area: StudyAreaFacts;
  default_request: OptimisationRequest;
  default_result: OptimisationResult;
  cost_per_most_deprived_resident_gbp: number | null;
  budget_sensitivity: SensitivityPoint[];
  walk_time_sensitivity: SensitivityPoint[];
};
