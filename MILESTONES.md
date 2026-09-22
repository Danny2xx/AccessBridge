# AccessBridge AI stages and milestones

This file turns the project roadmap into a build sequence with clear deliverables,
exit criteria, and evidence to capture as the work progresses.

Source-of-truth documents:

- `README.md`
- `ARCHITECTURE.md`
- `METHODOLOGY.md`
- `DATA.md`
- `EVALUATION.md`
- `ROADMAP.md`

Core architectural rule: the LLM translates intent into validated constraints and
narrates solver output. The solver computes the route. No language model should
perform optimisation.

## Stage 0 - Notebook-first discovery

Purpose: understand the data and modelling assumptions before productionising the
pipeline.

Deliverables:

- `notebooks/01_data_audit.ipynb`
- `notebooks/02_study_area_and_candidates.ipynb`
- `notebooks/03_accessibility_prototype.ipynb`
- `notebooks/04_optimiser_prototype.ipynb`
- `notebooks/05_milestone_1_demo_check.ipynb`

Tasks:

- Audit IMD 2025, ONS population, LSOA boundaries, NaPTAN, GTFS, and OSM inputs.
- Confirm columns, joins, CRS handling, missing values, licences, and attribution.
- Define the Birmingham Knowledge Quarter / east Birmingham study area.
- Plot deprivation, population, candidate stops, and interchange candidates.
- Prototype catchment maths on a tiny synthetic matrix before using real R5 output.
- Prototype the MILP on synthetic data before moving to real candidate stops.

Exit criteria:

- Data assumptions are written down and reproducible.
- The study area and candidate-stop logic are visually checked.
- Accessibility and optimiser logic are understood well enough to extract into
  typed Python modules.

Important guardrail:

- Notebooks are for exploration and evidence. Production logic must live in
  `app/` and `scripts/`; notebooks may import from `app/`, never the reverse.

## Milestone 1 - Vertical slice: defensible core

Purpose: build one end-to-end path from real data to rendered result.

User-facing definition of done:

- Run `uvicorn`.
- Call `/optimise` with a budget and stop count.
- See an optimised route on the map.
- See the number of most-deprived-decile residents brought within reach versus
  the current-network baseline.

Backend deliverables:

- `scripts/fetch_data.py` downloads open datasets into `data/raw/`.
- `scripts/build_network.py` builds the R5 travel-time matrix into
  `data/processed/`.
- `app/accessibility/` computes catchments, accessibility scores, and baseline
  deltas.
- `app/optimisation/` contains a single-objective MILP optimiser.
- `app/main.py` exposes `/scenario` and `/optimise`.
- `tests/` covers accessibility maths and optimiser behaviour.

Frontend deliverables:

- Minimal React + TypeScript + Vite app.
- deck.gl + MapLibre map.
- Deprivation choropleth.
- Candidate and selected stops.
- Optimised route line.
- Headline equity metric vs baseline.

Data scope:

- English Indices of Deprivation 2025 / IMD 2025.
- ONS population estimates.
- LSOA boundaries.
- NaPTAN stops.
- GTFS transit feed.
- OpenStreetMap street network.

Optimisation scope:

- Decision variables: selected candidate stops and covered origins.
- Objective: maximise equity-weighted deprived-population coverage.
- Constraints: budget, maximum stop count, and at least one Metro/rail
  interchange.
- Solver: OR-Tools or PuLP.

Exit criteria:

- Real-data pipeline can be run from scripts.
- API returns typed, stable scenario and optimisation responses.
- MILP satisfies budget, stop-count, and interchange constraints.
- Accessibility result reports baseline, optimised value, and delta.
- Map renders the deprivation surface, route, stops, and headline metric.
- `pytest`, `ruff`, and `mypy` pass or known exceptions are documented.

## Milestone 2 - Trade-offs and rigour

Purpose: move from one optimal answer to an explorable decision space.

Deliverables:

- Multi-objective NSGA-II optimiser.
- Pareto front endpoint.
- Frontend trade-off sliders for equity, cost, and journey time.
- Equity-by-decile audit chart.
- Baseline-vs-optimised evaluation outputs.
- Sensitivity analysis for key assumptions.

Exit criteria:

- User can move along the Pareto front and see the route re-form.
- Evaluation reports gains by IMD decile.
- Sensitivity analysis shows whether the recommended route is stable under
  reasonable assumption changes.

## Milestone 3 - Demand modelling

Purpose: add an ML component that estimates likely demand and explains drivers.

Deliverables:

- LightGBM demand model.
- Cross-validation metrics.
- Naive baseline comparison.
- SHAP explanations, global and local.
- Optional demand objective for the optimiser.
- MLflow or Weights & Biases experiment tracking.

Exit criteria:

- Demand model beats a naive baseline or the limitation is clearly reported.
- Top demand drivers are explainable.
- Demand is treated as an indicative sense-check, not a guaranteed forecast.

## Milestone 4 - Natural-language control layer

Purpose: allow plain-English scenario requests without weakening solver guarantees.

Deliverables:

- Pydantic constraint schema.
- LLM intent-to-constraints parser.
- Grounding tool for place names to real geography.
- Validation and clamping boundary.
- Result-to-narration layer.
- Bounded infeasibility handling loop.
- LLM evaluation set and metrics.

Exit criteria:

- Natural-language requests produce schema-valid constraints.
- Raw LLM output never reaches the optimiser.
- Ambiguous or infeasible prompts fail safely with useful feedback.
- Solver output remains the only source of route computation.

## Milestone 5 - Polish and deployment

Purpose: turn the working product into a strong portfolio demo.

Deliverables:

- Animated route and catchment reveal.
- Time-of-day toggle.
- Cost, carbon, and value-for-money panel.
- One-click figure or report export.
- Containerised backend and frontend.
- Live deployment URL.
- README screenshots and walkthrough video.

Exit criteria:

- A reviewer can understand the problem, run the demo, and verify the headline
  result.
- Attribution is visible in the app and repo.
- Deployment is reproducible from documented commands.

## Engineering hygiene throughout

Tasks:

- Keep production code typed and modular.
- Keep data files gitignored; ship fetch/build scripts, not datasets.
- Add tests alongside optimiser and accessibility maths.
- Keep notebooks as evidence, not dependencies.
- Maintain `ruff` and `mypy` cleanliness.
- Record dataset versions, GTFS dates, and OSM extract dates.
- Document non-obvious assumptions close to the code that implements them.

## Portfolio evidence to capture

- Data audit screenshots from notebooks.
- Before/after accessibility metrics.
- Choropleth plus optimised route map.
- Solver formulation summary.
- Tests showing constraint satisfaction and catchment correctness.
- Evaluation table from `EVALUATION.md`.
- Short explanation of why the LLM is kept outside the optimisation loop.
