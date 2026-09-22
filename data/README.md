# Data directory

Raw and processed datasets are intentionally not committed to the repository.
AccessBridge AI should ship fetch/build scripts and provenance notes, not data
files.

Expected layout:

```text
data/
├── raw/         # original downloaded files
├── processed/   # cleaned geospatial and matrix outputs
└── external/    # manually supplied files, if any
```

Licensing reminders:

- Public sector datasets must include Open Government Licence v3.0 attribution.
- OpenStreetMap-derived databases may trigger ODbL share-alike obligations.
- GTFS/BODS feeds require source attribution and version/date tracking.

For each analysis run, record the dataset version, source URL, download date,
and any known caveats.

