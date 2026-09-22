# Methodology

This document explains the implemented Phase 2 methodology and the later methods
planned for the full AccessBridge AI vision.

## 1. Current Phase 2 / Stage 7 method

The implemented prototype now uses a Stage 7 travel-time matrix contract. The
local artifact is generated from the Stage 0 proxy matrix until a real R5/r5py
matrix is supplied:

- Origins are study-area LSOA centroids.
- Candidate stops are aggregated from active NaPTAN nodes inside the study area.
- `travel_time_min` is the standard field consumed by the backend and optimiser.
- In the current local artifact, `travel_time_min` is copied from Euclidean
  centroid-to-candidate walking time at 80 metres per minute.
- The same contract can ingest a future R5/r5py CSV with `origin_id`,
  `candidate_id`, and `travel_time_min`.
- Reachability is evaluated at 5, 10, and 15 minute thresholds.
- Baseline access is defined as direct reachability to a rail/Metro interchange
  candidate.
- Scenario access is defined as reachability to at least one selected feeder
  candidate stop.

The current caveat is deliberately exposed in code, API responses, the UI, and
evaluation: the matrix is R5-ready in shape but proxy-derived in content. It
validates the product architecture and equity calculations, but it should be
rebuilt from pinned GTFS and OpenStreetMap R5 outputs before making
transport-planning claims.

## 2. Equity metric

The headline Phase 2 metric is:

> residents in the most-deprived IMD decile reached by the optimised stop set,
> compared with the direct-interchange baseline.

The API also reports:

- bottom-three-decile residents reached
- total residents reached
- population reached by IMD decile
- baseline vs optimised deltas

The current optimiser objective weights population by deprivation:

```python
weight = population * (11 - imd_decile)
```

That makes IMD decile 1 ten times as valuable as decile 10 in the objective.
This is intentionally equity-first. The evaluation shows the result is strongly
D1-sensitive; later stages can tune the weighting if a smoother bottom-three
distribution is preferred.

## 3. Optimisation

The implemented solver is a single-objective mixed-integer linear programme
using PuLP/CBC.

Decision variables:

- `x_j`: candidate stop `j` is selected
- `y_i`: origin `i` is covered

Objective:

- maximise equity-weighted covered population

Constraints:

- total selected-stop cost must be within budget
- selected stop count must not exceed `max_stops`
- at least one selected stop must be a rail/Metro interchange when required
- an origin can only be counted as covered if at least one reachable selected
  stop covers it

The solver returns feasibility status, selected stops, covered origins, total
cost, objective value, baseline/scenario accessibility metrics, decile deltas,
and route GeoJSON.

## 4. API and dashboard

The FastAPI backend exposes:

- `GET /health`
- `GET /scenario`
- `POST /optimise`, including per-stop reach details in route order
- `GET /evidence`, the cached default plan plus budget and walking-time sweeps

The frontend is a five-section site framed as Phase 2 of the Innovation Spine:

- **The Story**: seven guided map steps covering the phases, who lives in the
  area, today's gap, the plan, who gains, one stop up close, and the trade-offs.
- **Explore**: live controls for budget, stop limit, walking time and the rail
  or Metro link, with a card per stop and a highlighted catchment on the map.
- **The Evidence**: charts and tables, each labelled as measured data, our
  modelling, a placeholder cost or a challenge-brief figure.
- **How it works** and **The Ask**: the method, its limits, the data licences,
  and the Phase 2 next steps.

The map has need, gap and gain modes in 2D or 3D, numbered stops, a schematic
route, and street-level 3D buildings for close-ups. It uses deck.gl layers over
MapLibre, so the visualisation stays tied to real geography rather than
becoming a detached illustration. Text on every page is built from the API
response, so the words cannot drift from the numbers.

## 5. Assumptions and caveats

- The current local travel-time matrix is proxy-derived, not final R5.
- Candidate-stop costs are placeholder scenario costs, not quantity-surveyor
  estimates.
- Route geometry is a schematic line through the selected stops, ordered by
  a nearest-neighbour tour refined with 2-opt. It shows which stops form the
  pattern, not an operable alignment along the road network.
- The baseline is direct walking reach to rail/Metro interchange candidates.
- The model does not include service frequency, reliability, vehicle operations,
  road capacity, consultation constraints, or operator timetables.
- No personal data is processed.

## 6. Planned later methodology

### R5 walk-plus-transit routing

The next methodological upgrade is to build an R5/r5py matrix from a pinned GTFS
feed and OpenStreetMap extract, then pass that CSV into
`scripts/build_stage7_travel_time_matrix.py --r5-input`. That will keep the
backend and optimiser path stable while replacing proxy-derived times with
multimodal walk-plus-transit times.

### Pareto trade-off search

A later NSGA-II or similar multi-objective optimiser can expose trade-offs
between equity, cost, and journey time instead of returning one fixed optimum.

### Demand modelling

A LightGBM demand model with SHAP explanations remains a later stage. It should
be treated as an indicative proxy unless operator ticketing or footfall data is
available.

### Natural-language control layer

The planned language layer should translate plain-English requests into a
validated Pydantic constraint object and narrate solver results. It must not
compute routes. Raw LLM output should never reach the optimiser.
