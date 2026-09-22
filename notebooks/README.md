# Stage 0 notebooks

These notebooks are the discovery trail for AccessBridge AI. They help inspect
the data, test assumptions, and prototype the maths before stable logic is moved
into `app/` and `scripts/`.

Order:

1. `01_data_audit.ipynb`
2. `02_study_area_and_candidates.ipynb`
3. `03_accessibility_prototype.ipynb`
4. `04_optimiser_prototype.ipynb`
5. `05_milestone_1_demo_check.ipynb`

Guardrails:

- Notebooks may import from production modules once those exist.
- Production modules must never import from notebooks.
- Keep data files out of git.
- Record source URLs, versions, download dates, and licence notes.
- Treat notebook outputs as evidence, not as the deployed system.

Before running Notebook 1 in a fresh environment, use a stable Python release.
Python 3.12 is preferred for the full project. On this Mac, Stage 0 is currently
set up with Apple's stable Python 3.9 because the default `python3` points to
Python 3.15 alpha. Do not use Python 3.15 alpha for this project: the
data-science stack may try to compile `pandas` and `numpy` from source instead of
installing wheels.

```bash
/usr/bin/python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python scripts/check_python.py
python -m pip install -r requirements-stage0.txt
python -m ipykernel install --user --name accessbridge-stage0 --display-name "AccessBridge Stage 0"
python scripts/fetch_data.py
```

The fetch script downloads the light Stage 0 files into `data/raw/`. Larger
geospatial and network datasets are fetched later, when the study-area and R5
workflows need them.

In Jupyter, select the kernel named `AccessBridge Stage 0`.

Before the GeoPandas/r5py work starts, install the official macOS Python 3.12
package from <https://www.python.org/downloads/macos/> and create a new project
environment with that interpreter.
