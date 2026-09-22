# Evaluation

This evaluation describes the implemented Phase 2 prototype with the Stage 7
travel-time matrix contract active. The current local matrix is proxy-derived
from Stage 0 Euclidean walk times, not final R5 walk-plus-transit routing.

Regenerate the numbers with:

```bash
.venv/bin/python scripts/evaluate_phase2.py
```

For the full machine-readable payload:

```bash
.venv/bin/python scripts/evaluate_phase2.py --json
```

## 1. Default Phase 2 result

Default request:

- Budget: GBP 600,000
- Maximum stops: 8
- Catchment threshold: 10 minutes
- Interchange required: yes

Solver result:

- Status: optimal
- Selected stops: 7
- Total cost: GBP 600,000
- Objective value: 1,439,242

Selected stop pattern:

| Stop | Mode | Cost | Interchange |
|---|---|---:|---|
| Five Ways (West Midlands Metro) | tram_metro | GBP 150,000 | yes |
| Alum Rock Road | bus | GBP 75,000 | no |
| Colonial Road | bus | GBP 75,000 | no |
| Fentham Road | bus | GBP 75,000 | no |
| Handsworth Park | bus | GBP 75,000 | no |
| Herrick Road | bus | GBP 75,000 | no |
| Ravensdale Road | bus | GBP 75,000 | no |

## 2. Optimiser vs baseline

Baseline definition: residents whose LSOA centroid is within 10 active
matrix minutes of a rail/Metro interchange candidate.

Optimised definition: residents whose LSOA centroid is within 10 active
matrix minutes of at least one selected feeder candidate stop.

| Metric | Baseline | AccessBridge | Delta |
|---|---:|---:|---:|
| Most-deprived-decile residents reached | 71,309 | 126,330 | 55,021 |
| Bottom-three-decile residents reached | 96,296 | 140,312 | 44,016 |
| Total population reached | 128,755 | 151,899 | 23,144 |
| Share of reached residents in most-deprived decile | 55.4% | 83.2% | 27.8 pp |
| Cost per most-deprived-decile resident gained | - | GBP 10.90 | - |

Interpretation: the default solution increases most-deprived-decile access by
55,021 residents and shifts the reached population strongly toward IMD decile 1.
Total population gain is more modest because the objective deliberately favours
equity-weighted reach over broad population maximisation.

## 3. Equity distribution

| IMD decile | Baseline population | AccessBridge population | Delta |
|---:|---:|---:|---:|
| 1 | 71,309 | 126,330 | 55,021 |
| 2 | 11,648 | 10,224 | -1,424 |
| 3 | 13,339 | 3,758 | -9,581 |
| 4 | 4,953 | 2,954 | -1,999 |
| 5 | 4,757 | 1,573 | -3,184 |
| 6 | 11,478 | 2,338 | -9,140 |
| 7 | 5,358 | 1,306 | -4,052 |
| 8 | 1,353 | 0 | -1,353 |
| 9 | 4,560 | 3,416 | -1,144 |
| 10 | 0 | 0 | 0 |

The progressive check is positive for decile 1: access gains are concentrated in
the most-deprived decile. The bottom-three result is still positive overall, but
deciles 2 and 3 decline relative to the direct-interchange proxy baseline. That
is a useful modelling signal: the current objective is very D1-sensitive and
should be tuned later if a smoother bottom-three distribution is desired.

## 4. Sensitivity analysis

### Walk threshold sensitivity

Budget and stop count are held at GBP 600,000 and 8 stops.

| Threshold | Cost | Stops | D1 gain | Bottom-three gain | Total population delta |
|---:|---:|---:|---:|---:|---:|
| 5 min | GBP 600,000 | 7 | 29,343 | 17,780 | -3,730 |
| 10 min | GBP 600,000 | 7 | 55,021 | 44,016 | 23,144 |
| 15 min | GBP 600,000 | 7 | 56,293 | 62,326 | 46,033 |

The D1 gain remains positive across thresholds. The 5-minute threshold is much
stricter and produces a negative total-population delta, while 10 and 15 minutes
show broader gains.

### Budget sensitivity

Threshold and max stops are held at 10 minutes and 8 stops.

| Budget | Actual cost | Stops | D1 gain | Bottom-three gain | Total population delta |
|---:|---:|---:|---:|---:|---:|
| GBP 450,000 | GBP 450,000 | 5 | 23,458 | 7,082 | -13,790 |
| GBP 600,000 | GBP 600,000 | 7 | 55,021 | 44,016 | 23,144 |
| GBP 750,000 | GBP 675,000 | 8 | 74,111 | 57,735 | 36,863 |
| GBP 900,000 | GBP 675,000 | 8 | 74,111 | 57,735 | 36,863 |

The solution saturates the current 8-stop cap at GBP 675,000. Increasing budget
beyond that does not help unless the stop cap is also relaxed.

## 5. What is not evaluated yet

The following are planned later improvements and are intentionally not claimed
as implemented Phase 2 results:

- Final R5 walk-plus-transit travel-time routing with pinned GTFS/OSM inputs
- Multi-objective Pareto frontier / NSGA-II
- Demand model and SHAP explanations
- Natural-language constraint extraction
- Live deployment performance

## 6. Reproducibility

Implemented checks currently passing:

- Backend tests: 51 passing
- Browser tests: 23 passing (`npm run test:e2e` in `frontend/`)
- `ruff`: clean
- `mypy`: clean
- Python compile check: clean
- Frontend production build: clean

Data provenance is recorded under `data/raw/provenance_stage0.json`,
`data/processed/stage0_*_metadata.json`, and
`data/processed/stage7_routing_metadata.json`.
