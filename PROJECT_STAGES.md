# AccessBridge AI project stages

This file is the implementation map for AccessBridge AI from the current Phase 2
workspace to a polished portfolio demo.

The core rule stays the same throughout the project:

> The language layer translates and narrates. The optimiser computes. No LLM
> should decide the route or bypass validated solver constraints.

## Current status

Phase 2 is complete: Stages 0 to 6 all meet their exit criteria. Stage 7 has
started, with a travel-time matrix contract and adapter ready for future R5/r5py
output.

The dashboard is now a five-section site framed as Phase 2 of the Innovation
Spine: The Story, Explore, The Evidence, How it works and The Ask. It is
checked by 51 backend tests and 21 Playwright browser tests.

Already present:

- Stage 0 data-fetching script for IMD 2025, ONS population, Birmingham LSOA
  boundaries, and NaPTAN stops.
- Processed Birmingham LSOA geography with IMD and mid-2024 population.
- Processed study-area LSOA layer.
- NaPTAN-derived Birmingham stops and study-area candidate stops.
- Distance-based accessibility proxy matrix and summary outputs.
- Stage 7 `travel_time_min` matrix contract and proxy-derived local artifact.
- Notebook discovery structure for data audit, study-area checks, accessibility
  prototyping, optimiser prototyping, and demo checks.
- Architecture, methodology, data, evaluation, roadmap, and milestone docs.
- Place names for every neighbourhood and candidate stop, derived from NaPTAN
  localities by `scripts/build_place_names.py`.
- `GET /evidence`: cached study-area facts, the default plan with per-stop
  details, and budget and walking-time sensitivity sweeps.
- Portfolio screenshots in `docs/screenshots/` and a timed pitch script in
  `docs/WALKTHROUGH.md`.
- `PRODUCT.md` recording users, purpose and design principles.

Important current limitation:

- The active Stage 7 matrix is currently proxy-derived from Euclidean walking
  distance. It is useful for validating catchment, equity maths, and the product
  path, but it is not the final R5 walk-plus-transit routing model.

## Phase 2 goal

Phase 2 should produce the first real product version:

> Real Birmingham data -> tested backend accessibility logic -> optimiser ->
> FastAPI endpoints -> frontend map dashboard -> 3D geospatial decision-support
> demo -> evaluation evidence.

Phase 2 should not try to build every future feature. The priority is to make
the core defensible, visible, and demoable.

## Phase 2 stages

### Stage 0 - Data foundation

Status: complete. The pipeline rebuilds every processed file byte-for-byte from
raw data, and all 659 Birmingham LSOAs have IMD and population values. The GTFS
and OpenStreetMap audit belongs to Stage 7.

Purpose:

- Establish the real Birmingham data foundation before production code is built.

Inputs:

- IMD 2025 / English Indices of Deprivation 2025.
- ONS LSOA mid-year population estimates.
- Birmingham LSOA 2021 boundaries.
- NaPTAN West Midlands access nodes.

Implemented outputs:

- `data/raw/provenance_stage0.json`
- `data/processed/lsoa_imd_population.geojson`
- `data/processed/study_area_lsoa_imd_population.geojson`
- `data/processed/naptan_birmingham_stops.geojson`
- `data/processed/candidate_stops.geojson`
- `data/processed/accessibility_proxy_matrix.csv`
- `data/processed/accessibility_proxy_by_origin.geojson`
- `data/processed/accessibility_proxy_summary.csv`
- `data/processed/stage0_*_metadata.json`

Known metrics from current processed data:

- 659 Birmingham LSOAs.
- 174 study-area LSOAs.
- 349,787 study-area residents.
- 250,646 study-area residents in IMD decile 1.
- 828 study-area candidate stops.
- 33 interchange candidates.
- 144,072 origin-candidate matrix rows.

Exit criteria:

- Raw data is reproducible from scripts.
- Processed outputs are reproducible from scripts.
- Join quality is checked: every processed LSOA has IMD and population values.
- Data licences and attribution obligations are documented.
- Notebook evidence can be refreshed later without becoming production logic.

### Stage 1 - Backend project structure

Status: complete.

Purpose:

- Turn the project from notebooks/scripts into a real backend application.

Deliverables:

- `app/`
- `app/main.py`
- `app/config.py`
- `app/schemas.py`
- `app/data/`
- `app/accessibility/`
- `app/optimisation/`
- `tests/`
- `pyproject.toml` or a production-ready dependency file.
- Development tooling for formatting, linting, and testing.

Responsibilities:

- Keep data loading separate from business logic.
- Keep API schemas separate from internal calculation functions.
- Keep notebooks as evidence only. Production modules must not import from
  notebooks.

Exit criteria:

- Backend package imports cleanly.
- `pytest` is available.
- A basic health endpoint or import smoke test passes.
- Dependencies are documented in one reliable place.

### Stage 2 - Accessibility engine

Status: complete.

Purpose:

- Extract the current proxy catchment and equity calculations into reusable,
  tested backend code.

Initial implementation:

- Use the existing Stage 0 proxy matrix.
- Keep method naming honest: this is proxy accessibility, not final R5 routing.

Core functions:

- Load study-area origins.
- Load candidate stops.
- Load origin-candidate accessibility matrix.
- Compute baseline coverage.
- Compute scenario coverage.
- Compute population reached by IMD decile.
- Compute most-deprived-decile resident gain.
- Compute bottom-three-decile resident gain.
- Compute total population reached.
- Return metric objects suitable for API responses and frontend charts.

Baseline definition for Phase 2:

- Residents whose origin is within the selected threshold of a direct rail/Metro
  interchange candidate.

Scenario definition for Phase 2:

- Residents whose origin is within the selected threshold of at least one
  selected feeder candidate stop.

Key caveat:

- This is a defensible proxy for the Phase 2 demo, but final accessibility
  should later use R5 walk-plus-transit travel times.

Tests:

- Coverage is true when at least one selected stop is reachable.
- Population aggregation by IMD decile is correct.
- Baseline and scenario metrics produce expected deltas.
- Empty selections return zero scenario coverage.
- Invalid thresholds or missing matrix fields fail clearly.

Exit criteria:

- Accessibility logic is no longer trapped inside notebooks.
- Tests validate the metric definitions.
- API-ready response objects can be generated from local processed data.

### Stage 3 - Single-objective optimiser

Status: complete.

Purpose:

- Choose candidate stops that maximise equity-weighted access under constraints.

Initial solver:

- Start with a simple reliable implementation.
- Use OR-Tools or PuLP for the production MILP.
- A brute-force solver may exist only for tiny tests and fixtures.

Decision variables:

- `x_j`: whether candidate stop `j` is selected.
- `y_i`: whether origin `i` is covered by at least one selected stop.

Objective:

- Maximise equity-weighted covered population.
- Higher deprivation need receives higher weight, for example `11 - imd_decile`.

Constraints:

- Total selected-stop cost must be within budget.
- Number of selected stops must be at or below `max_stops`.
- At least one selected stop must be a rail/Metro interchange when required.
- An origin can be counted as covered only if at least one reachable selected
  stop covers it.

Inputs:

- Budget.
- Maximum stop count.
- Catchment threshold.
- Interchange requirement.
- Candidate stop costs.
- Origin-candidate reachability matrix.

Outputs:

- Feasibility status.
- Selected candidate stops.
- Covered origins.
- Total selected-stop cost.
- Objective value.
- Baseline metric.
- Optimised metric.
- Delta metric.
- Equity-by-decile summary.
- Human-readable explanation text generated deterministically for now.

Tests:

- Optimiser respects budget.
- Optimiser respects maximum stop count.
- Optimiser includes an interchange when required.
- Optimiser reports infeasible cases cleanly.
- Optimiser does not count uncovered origins.
- Optimiser prefers higher equity value when constraints allow.

Exit criteria:

- Backend can compute a stable optimised stop set from real processed Stage 0
  data.
- The result is deterministic for the same inputs.
- Infeasible requests fail safely with a useful message.

### Stage 4 - API and 2D frontend dashboard

Status: complete. Beyond the original scope, the frontend became a five-section
site. Explore re-runs the optimiser as settings change, rather than on an
Optimise button. It shows a card per stop, the band-by-band chart for the
current result, and the data attribution. `GET /evidence` was added for the
story and evidence pages.

Purpose:

- Make the backend usable from a real interface.

Backend endpoints:

- `GET /health`
- `GET /scenario`
- `POST /optimise`

`GET /scenario` should return:

- Study-area LSOA polygons.
- IMD deciles and population fields.
- Candidate stops.
- Interchange candidates.
- Current baseline metrics.
- Data attribution text.
- Method caveat text.

`POST /optimise` should accept:

- Budget.
- Maximum stop count.
- Catchment threshold.
- Interchange requirement.

`POST /optimise` should return:

- Selected stops.
- Route or connection geometry.
- Covered origins.
- Baseline metric.
- Optimised metric.
- Delta metric.
- Cost.
- Equity-by-decile chart data.
- Feasibility status and explanation.

Frontend deliverables:

- React + TypeScript frontend.
- MapLibre map.
- deck.gl layers for polygons, candidate stops, selected stops, and route.
- Budget control.
- Max-stop control.
- Optimise button.
- Headline metric card.
- Equity-by-decile chart.
- Loading, error, and infeasible states.
- Visible attribution.

2D map layers:

- Deprivation choropleth.
- Candidate stops.
- Interchange candidates.
- Selected stops.
- Optimised route or connector line.
- Covered origins or catchment highlight.

Exit criteria:

- User can open the app, adjust constraints, run optimisation, and see the map
  update.
- Frontend uses real API responses.
- No frontend-only fake optimiser results.
- Data attribution and limitations are visible.

### Stage 5 - 3D geospatial model and visualisation

Status: complete. Includes the animated route reveal, animated
residents-reached counters, 3D columns for selected, rail/Metro and candidate
stops, and street-level 3D buildings for stop close-ups. Extruded
neighbourhoods are opaque rather than translucent, because translucent
extrusions blended into an unreadable colour; the catchment highlight stays
translucent in 2D and street-level views.

Purpose:

- Add the visual layer that makes the decision-support story tangible and
  memorable without becoming decorative fluff.

Preferred implementation:

- deck.gl 3D layers over MapLibre.

Reason:

- deck.gl keeps the 3D scene tied to real geospatial coordinates, which is more
  defensible than a detached cinematic model.

3D features:

- Extruded LSOA polygons.
- Polygon height represents deprivation intensity, access gap, or gain.
- Polygon colour represents IMD decile or improvement state.
- 3D candidate-stop markers.
- Distinct 3D interchange markers.
- Selected stops highlighted.
- Optimised route shown as an elevated line or animated path.
- Translucent catchment/accessibility layer.
- Animated route reveal.
- Animated resident-reached counter.

Recommended 3D modes:

- Deprivation mode: height and colour emphasise IMD need.
- Access-gap mode: height emphasises origins near local stops but not direct
  interchange access.
- Optimised-gain mode: highlight origins covered by the selected solution.

Interaction:

- Toggle 2D/3D.
- Toggle layer mode.
- Hover LSOA for population, IMD decile, baseline status, and optimised status.
- Hover stop for name, mode, cost, interchange status, and selected status.

Visual quality requirements:

- The 3D layer must support the argument, not just look impressive.
- Text and controls must not overlap.
- The map must remain readable on laptop-sized screens.
- Attribution must remain visible.
- The 3D scene must be tested in the browser after implementation.

Exit criteria:

- 3D view loads reliably.
- Extruded geography aligns with the base map.
- Selected route and stops render in the correct places.
- The 3D model communicates deprivation, access gap, and optimised improvement.

### Stage 6 - Evaluation, documentation, and portfolio polish

Status: complete. Screenshots are in `docs/screenshots/` and regenerate with
`npm run screenshots`. The walkthrough script is `docs/WALKTHROUGH.md`. Browser
tests run with `npm run test:e2e`.

Purpose:

- Make the project credible to reviewers, not just functional.

Evaluation outputs:

- Baseline vs optimised access for most-deprived-decile residents.
- Baseline vs optimised access for bottom-three-decile residents.
- Total population reached.
- Equity gain by IMD decile.
- Cost per deprived resident reached.
- Feasibility and constraint-satisfaction checks.
- Sensitivity notes for threshold, budget, and max stops.

Documentation updates:

- README should reflect what is actually implemented.
- Evaluation figures should replace placeholders.
- Methodology should distinguish proxy model from future R5 model.
- Data attribution should be visible in README and app.
- Setup commands should be tested.
- Screenshots or GIFs should be added.

Portfolio assets:

- Screenshot of deprivation choropleth.
- Screenshot of candidate stops and interchanges.
- Screenshot or GIF of optimisation result.
- Screenshot or GIF of 3D model.
- Short walkthrough script.
- Clear limitations section.

Exit criteria:

- A reviewer can understand the problem, run the demo, and verify the headline
  result.
- Claims in README match implemented behaviour.
- Evaluation numbers are reproducible.
- The project has a clean, honest, impressive story.

## Later stages after Phase 2

These are valuable, but they should come after the core Phase 2 demo is working.

### Stage 7 - R5 travel-time routing

Status: started. The travel-time matrix contract, builder, metadata, API wiring,
and optimiser wiring are implemented. Final R5/r5py network generation from
pinned GTFS and OpenStreetMap inputs is still pending.

Purpose:

- Replace the Euclidean proxy with true walk-plus-transit accessibility.

Deliverables:

- GTFS feed selection and provenance. Pending for final R5.
- OpenStreetMap extract provenance. Pending for final R5.
- R5/r5py network build. Pending.
- Origin-destination travel-time matrix. Contract implemented as
  `data/processed/travel_time_matrix.csv`; current local artifact is
  proxy-derived.
- Updated baseline and scenario accessibility metrics. Implemented through the
  Stage 7 matrix contract.
- Methodology update comparing proxy and R5 results. Partially implemented for
  the proxy-derived contract; final comparison waits for real R5 output.

Exit criteria:

- Headline metrics are based on actual multimodal travel times.
- R5 outputs are reproducible from documented inputs.

### Stage 8 - Pareto trade-off optimiser

Purpose:

- Move from one optimal answer to an explorable decision space.

Deliverables:

- NSGA-II or equivalent multi-objective optimiser.
- Pareto front endpoint.
- Frontend trade-off controls for equity, cost, and journey time.
- Pareto chart.
- Route updates when the selected Pareto solution changes.

Exit criteria:

- User can explore trade-offs rather than accept a single fixed optimum.

### Stage 9 - Demand model

Purpose:

- Estimate likely demand at candidate stops and explain demand drivers.

Deliverables:

- Feature table for candidate stops.
- LightGBM or comparable baseline model.
- Cross-validation metrics.
- Naive baseline comparison.
- SHAP explanations.
- Optional demand objective in the optimiser.

Exit criteria:

- Demand model beats a naive baseline or the limitation is clearly reported.
- Demand is presented as an indicative proxy, not a guaranteed forecast.

### Stage 10 - Natural-language control layer

Purpose:

- Let users request scenarios in plain English without weakening solver
  guarantees.

Deliverables:

- Pydantic constraint schema.
- LLM intent-to-constraints parser.
- Place-name grounding tool.
- Validation and clamping boundary.
- Infeasibility explanation loop.
- Result narration.
- LLM evaluation set.

Guardrail:

- Raw LLM output never reaches the optimiser.
- The solver remains the only component that computes routes.

Exit criteria:

- Natural-language requests produce schema-valid constraints.
- Ambiguous or infeasible prompts fail safely.
- Extraction accuracy is measured with a test set.

### Stage 11 - Deployment and final presentation

Purpose:

- Make AccessBridge AI easy to inspect outside the local machine.

Deliverables:

- Containerised backend.
- Containerised frontend or deployable frontend build.
- Environment documentation.
- Public demo URL.
- Walkthrough video.
- Final README.
- Final evaluation section.

Exit criteria:

- The demo runs outside the development environment.
- The project can be shared as a polished portfolio artifact.

## Explicit Phase 2 exclusions

These should not block Phase 2:

- Full R5/r5py routing.
- NSGA-II Pareto optimiser.
- LightGBM demand model.
- SHAP demand explanations.
- LLM natural-language control.
- User accounts or saved scenarios.
- Production traffic modelling.
- Operator-grade demand forecasting.

They are planned later stages, but Phase 2 is successful when the project has a
defensible backend, working optimiser, usable map dashboard, 3D geospatial model,
and reproducible evaluation evidence.

## Build order summary

1. Finish Stage 0 evidence when ready.
2. Build Stage 1 backend structure.
3. Build Stage 2 accessibility engine.
4. Build Stage 3 optimiser.
5. Build Stage 4 API and 2D frontend.
6. Build Stage 5 3D geospatial model.
7. Build Stage 6 evaluation and portfolio polish.
8. Add later stages only after the Phase 2 core is solid.
