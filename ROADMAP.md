# Roadmap

Build order matters: get one thing working end-to-end before adding depth, so there is always something demoable. The sequence below front-loads the parts that prove competence and leaves polish for last.

## Milestone 1 — Vertical slice (the defensible core)

Goal: a working line from real data to a rendered result.

- [x] Data fetch + clean (IMD, population, NaPTAN, OSM, GTFS) — `scripts/fetch_data.py`, plus the pinned OSM and GTFS inputs for `scripts/build_r5_matrix.py`
- [x] R5 travel-time matrix build — `scripts/build_r5_matrix.py`
- [x] Catchment + accessibility score per LSOA
- [x] Single-objective MILP optimiser (equity-weighted coverage, budget + stop constraints)
- [x] FastAPI endpoints: `/scenario`, `/optimise` (plus `/evidence`)
- [x] deck.gl map: deprivation choropleth + stops + optimised route + headline equity metric vs baseline

**Demoable result:** "Here is the deprivation surface, here is the route that maximises deprived-decile access, here is the gain over today."

## Milestone 2 — Trade-offs and rigour

- [ ] Multi-objective NSGA-II + Pareto front endpoint
- [ ] Frontend trade-off sliders (equity / cost / journey time) re-running live
- [x] Equity-by-decile audit chart
- [x] Baseline-vs-optimised evaluation + sensitivity analysis ([`EVALUATION.md`](EVALUATION.md))

**Demoable result:** the judge drives the sliders and watches the route re-form.

## Milestone 3 — Machine learning

- [ ] LightGBM demand model + cross-validation
- [ ] SHAP explanations (global + local)
- [ ] Optional demand objective wired into the optimiser
- [ ] MLflow / W&B experiment tracking

## Milestone 4 — Natural-language layer

- [ ] Pydantic constraint schema + validation boundary
- [ ] LLM intent → constraints (tool-use / structured output, Instructor)
- [ ] Grounding tool (place names → LSOA codes)
- [ ] Result → plain-English narration
- [ ] Infeasibility loop (bounded)
- [ ] LLM eval set + metrics

**Demoable result:** type "prioritise Nechells, keep it under six stops, connect to the Eastside tram" and watch it run.

## Milestone 5 — Polish (the closing flourish)

- [ ] Animated route with deck.gl `TripsLayer` — catchment blooming + live "residents reached" counter (animate the *analysis*, not just a bus)
- [ ] Time-of-day toggle (day vs evening access)
- [ ] Cost + carbon + value-for-money panel
- [ ] One-click report / figure export
- [x] Deploy with a live URL: <https://danny2xx.github.io/AccessBridge/> (static build on GitHub Pages; Dockerfile and compose for a live API)
- [ ] README screenshots / demo video (screenshots and a video script done; video not recorded)

## Engineering hygiene (throughout, not at the end)

- [ ] Type hints + `mypy`, `ruff`, pre-commit (typing, `mypy` and `ruff` done; pre-commit not set up)
- [x] `pytest` for the optimiser and accessibility maths; Vitest/Playwright for the frontend
- [x] GitHub Actions CI
- [x] Dockerfile + compose for reproducibility

## Future work (say these in interviews; don't necessarily build them)

- Real ticketing / footfall data to replace demand proxies
- Integration with the planned franchised network as a scenario constraint
- Live data feeds (air quality, footfall) replacing the illustrative panels
- Extension to the Phase 1 and Phase 3 concepts as additional modules

## Priority call

Milestones 1–2 plus clean engineering are the non-negotiable core that proves competence. Milestones 4 (the NL layer) and 5 (the animation) are what take it from "competent" to "this person is good" — but only start them once the core is solid.
