# Data sources & licences

AccessBridge AI is built entirely on open data. This file lists every dataset, what it provides, how to obtain it, and the licence and attribution obligations that apply. **Read the licence column before publishing anything** — most require attribution, and OpenStreetMap adds a share-alike condition.

## Datasets

| Dataset | Provides | Source | Licence |
|---|---|---|---|
| English Indices of Deprivation 2025 / Index of Multiple Deprivation (IMD 2025) | Deprivation deciles by LSOA | MHCLG / gov.uk | Open Government Licence v3.0 |
| ONS mid-year population estimates (LSOA) | Population weighting | Office for National Statistics | Open Government Licence v3.0 |
| LSOA boundaries | Geography for choropleth + centroids | ONS Open Geography Portal; Stage 0 uses the Birmingham-only LSOA 2021 boundary extract from Birmingham City Observatory as a compact open mirror/source | Open Government Licence v3.0 |
| NaPTAN | Public-transport access node locations | Department for Transport; Stage 0 uses NaPTAN API ATCO area `430` for West Midlands stops before filtering to Birmingham/study-area geometry | Open Government Licence v3.0 |
| GTFS transit feed | Bus and Metro timetables for R5 | Bus Open Data Service West Midlands regional GTFS, feed version 20260923_025020, sha256 `1ae310408d03916b…` | Open Government Licence v3.0 (attribute) |
| OpenStreetMap | Street network for walk routing with R5 | Geofabrik `west-midlands-latest.osm.pbf` dated 22 Sep 2026 23:28:35, sha256 `14231e747b2caf61…` | **Open Database Licence (ODbL) — attribution + share-alike** |
| Basemap tiles | Map background | MapLibre + tile provider | Provider-dependent; attribute |

## Attribution text to display

Include in the app footer, the video credits, and this repo:

- Contains public sector information licensed under the Open Government Licence v3.0.
- Contains data from the English Indices of Deprivation 2025 / Index of Multiple Deprivation 2025 (MHCLG), ONS, and NaPTAN (DfT).
- Map data © OpenStreetMap contributors, available under the Open Database Licence (ODbL).
- Transit data via the Bus Open Data Service.

> **ODbL note:** if you publish a *derived database* from OpenStreetMap (not just a rendered map image), the share-alike condition applies to that database. Rendering maps and computing routes for display is fine with attribution; redistributing a processed OSM dataset means releasing it under ODbL too.

## Obtaining the data

`scripts/fetch_data.py` downloads the open Stage 0 datasets to `data/raw/`.
The current Phase 2 processed files are regenerated with:

```bash
python scripts/build_stage0_geography.py
python scripts/build_stage0_stops.py
python scripts/build_stage0_accessibility.py
python scripts/build_stage7_travel_time_matrix.py
python scripts/build_place_names.py
```

`scripts/build_place_names.py` writes `data/processed/place_names.json`. It
names each neighbourhood and candidate stop after the most common NaPTAN
`LocalityName` among its stops, so no extra dataset is needed. NaPTAN's
"Birmingham" locality is shown as "Birmingham City Centre", and the few
neighbourhoods with no stop inside take the name of the nearest stop.

The active accessibility output is `data/processed/travel_time_matrix.csv`. It
follows the Stage 7 `travel_time_min` contract and is built from
`data/processed/r5_walk_matrix.csv`, routed by `scripts/build_r5_matrix.py`
under the routing environment described in the README. The build also writes
`r5_walk_transit_matrix.csv` and a provenance file per profile with input
checksums, the departure window and the unreachable count.

Raw and processed data are **gitignored** — the repo ships the scripts, not the
data, so anyone can reproduce local artifacts from source.

## Refreshing

- IMD: updated infrequently. Use the English Indices of Deprivation 2025 / IMD 2025 release, and prefer the corrected `v2` files where GOV.UK marks them as updated.
- Population: annual ONS estimates.
- GTFS: changes regularly; re-fetch before a fresh analysis.
- OSM: continuously updated; pin a date for reproducibility.

## Personal data / GDPR

No personal data is processed. All inputs are aggregated to LSOA level or are infrastructure locations. If a deployed version ever collects user input (e.g. saved scenarios tied to an account), add a privacy notice and revisit this section.

## Provenance for reproducibility

Record, for each analysis run, the dataset versions and the OSM/GTFS extract
dates used (e.g. in `data/processed/stage7_routing_metadata.json`). This makes
published numbers reproducible and is part of the rigour the project is meant
to demonstrate.
