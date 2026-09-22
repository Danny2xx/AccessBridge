# Architecture

This document explains how AccessBridge AI is put together and *why* each choice was made. The guiding principle runs through everything:

> **The LLM translates and narrates. The solver computes.** The optimiser guarantees constraints; the language model never touches the maths.

## System overview

```
                    ┌─────────────────────────────────────────────┐
                    │                Frontend (React/TS)            │
                    │   deck.gl map · sliders · NL input · charts   │
                    └───────────────┬───────────────▲──────────────┘
                                    │ request       │ result + explanation
                                    ▼               │
                    ┌─────────────────────────────────────────────┐
                    │                 API (FastAPI)                 │
                    └───┬───────────────┬───────────────┬──────────┘
                        │               │               │
              ┌─────────▼──────┐ ┌──────▼───────┐ ┌─────▼─────────┐
              │  LLM control   │ │ Optimisation │ │   Demand      │
              │     layer      │ │   engine     │ │   model       │
              │ NL → params,   │ │ MILP +       │ │ LightGBM +    │
              │ result → prose │ │ NSGA-II      │ │ SHAP          │
              └────────────────┘ └──────┬───────┘ └───────────────┘
                                        │ reads
                              ┌─────────▼──────────┐
                              │ Accessibility layer │
                              │ R5 travel-time      │
                              │ matrix + catchments │
                              └─────────┬───────────┘
                                        │ built from
                              ┌─────────▼──────────┐
                              │   Data layer        │
                              │ IMD · pop · NaPTAN  │
                              │ OSM · GTFS          │
                              └────────────────────┘
```

## Components

### Data layer
Ingests and cleans the open datasets (see [`DATA.md`](DATA.md)) into a consistent set of geographies (LSOA-level deprivation and population) and network inputs (OSM street graph, GTFS transit feed, NaPTAN stops). Output is a tidy, versioned set of processed files the rest of the system reads.

### Accessibility layer
Uses `r5py` (the Python interface to Conveyal R5) to compute **multimodal walk-plus-transit travel-time matrices** from origins (population-weighted LSOA centroids) to candidate stops and onward destinations. This is the engine room: it is what makes "within reach" a real, network-based measure rather than a circle on a map. Catchments and cumulative-opportunity accessibility scores are derived here.

### Optimisation engine
Two solvers behind one interface:
- A **mixed-integer program** (`OR-Tools` / `PuLP`) formulated as a maximal-covering / p-median style problem — pick the stop set that maximises weighted deprived-population coverage subject to budget, stop count and a mandatory Metro interchange. Returns a single optimal solution for a given objective weighting.
- A **multi-objective evolutionary search** (`pymoo`, NSGA-II) that produces a **Pareto front** across equity, cost and journey time, so the user can explore trade-offs rather than accept one fixed answer.

### Demand model
A `LightGBM` regressor estimating likely boardings at candidate stops from open proxies (population, land use, points of interest, accessibility score). `SHAP` provides per-prediction explanations. Feeds the optimiser as an optional objective and provides a sense-check on the chosen pattern.

### LLM control layer
Two narrow jobs, both at the language boundary:
1. **Intent → constraints.** A natural-language request is converted, via tool-use / structured output, into a validated `Pydantic` object describing objective weights and constraints.
2. **Result → explanation.** The solver's structured output is narrated back in plain English, including the trade-offs that were made.
It also handles **infeasibility** (relaying the conflict and proposing a relaxation) and **grounding** (resolving place names like "Nechells" to real LSOA codes via a lookup tool, so it never invents geography). Detail in [`METHODOLOGY.md`](METHODOLOGY.md).

### API
`FastAPI` exposes typed endpoints: build/scenario, optimise (single and Pareto), predict-demand, and the NL endpoint that orchestrates the LLM layer around the solver. `Pydantic` models are the single source of truth for the request/response contract — and, crucially, the validation boundary between the LLM and the solver.

### Frontend
`React` + `TypeScript` with `deck.gl` over a `MapLibre` basemap for GPU-accelerated geospatial rendering (deprivation choropleth, catchments, animated route). `Recharts`/`D3` for the equity-decile audit and the Pareto front. State via `Zustand` or React Query.

## Request lifecycle (natural-language path)

1. User types an instruction in the frontend.
2. API passes it to the LLM control layer, which returns a structured constraint object.
3. The object is **validated and clamped** (weights normalised, values bounded, impossible asks rejected) — raw LLM output never reaches the solver.
4. The optimiser runs over the precomputed travel-time matrix and returns a guaranteed solution.
5. The solver output is sent back to the LLM for narration.
6. The frontend renders the route, updates the metrics and decile audit, and shows the explanation.

## Why these choices (the short version)

- **R5 over hand-rolled isochrones** — the methodology real transit-accessibility teams use; multimodal and defensible under questioning.
- **MILP + NSGA-II** — a single optimum *and* an explorable trade-off space; demonstrates both exact and metaheuristic optimisation.
- **LLM strictly at the boundary** — uses the model for language (its strength) and never for guarantees (its weakness); the validation layer is the headline engineering decision.
- **FastAPI + typed contracts** — production-grade, async, and the Pydantic schema doubles as the LLM's tool definition.
- **deck.gl** — handles large geospatial layers on the GPU and powers the animated route; a marketable data-visualisation skill in its own right.
