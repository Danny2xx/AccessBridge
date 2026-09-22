"""Fetch reproducible Stage 0 source data for AccessBridge AI.

The script downloads open datasets into data/raw/. Raw files stay gitignored; the
repo should ship the fetch script and provenance, not the data.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
PROVENANCE_PATH = RAW_DIR / "provenance_stage0.json"


@dataclass(frozen=True)
class Dataset:
    key: str
    filename: str
    url: str
    source_page: str
    licence: str
    size_hint_mb: float
    purpose: str
    default: bool = True
    note: str = ""

    @property
    def output_path(self) -> Path:
        return RAW_DIR / self.filename


DATASETS: tuple[Dataset, ...] = (
    Dataset(
        key="imd_file1",
        filename="imd_2025_file_1_index_of_multiple_deprivation.xlsx",
        url=(
            "https://assets.publishing.service.gov.uk/media/"
            "691dece32c6b98ecdbc500d5/"
            "File_1_IoD2025_Index_of_Multiple_Deprivation.xlsx"
        ),
        source_page="https://www.gov.uk/government/statistics/english-indices-of-deprivation-2025",
        licence="Open Government Licence v3.0",
        size_hint_mb=1.4,
        purpose="IMD 2025 LSOA ranks and deciles; usually enough for deprivation mapping.",
    ),
    Dataset(
        key="imd_file7",
        filename="imd_2025_file_7_all_ranks_scores_deciles_population_denominators.csv",
        url=(
            "https://assets.publishing.service.gov.uk/media/"
            "691ded56d140bbbaa59a2a7d/"
            "File_7_IoD2025_All_Ranks_Scores_Deciles_Population_Denominators.csv"
        ),
        source_page="https://www.gov.uk/government/statistics/english-indices-of-deprivation-2025",
        licence="Open Government Licence v3.0",
        size_hint_mb=9.44,
        purpose="IMD 2025 all ranks, scores, deciles, and IoD population denominators.",
    ),
    Dataset(
        key="lsoa_population_broad",
        filename="ons_lsoa_population_broad_age_mid_2022_revised_to_mid_2024.xlsx",
        url=(
            "https://www.ons.gov.uk/file?uri=/peoplepopulationandcommunity/"
            "populationandmigration/populationestimates/datasets/"
            "lowersuperoutputareamidyearpopulationestimatesnationalstatistics/"
            "mid2022revisednov2025tomid2024/"
            "sapelsoabroadage20222024.xlsx"
        ),
        source_page=(
            "https://www.ons.gov.uk/peoplepopulationandcommunity/"
            "populationandmigration/populationestimates/datasets/"
            "lowersuperoutputareamidyearpopulationestimatesnationalstatistics"
        ),
        licence="Open Government Licence v3.0",
        size_hint_mb=12.5,
        purpose="Accredited LSOA population estimates by broad age groups and sex.",
    ),
    Dataset(
        key="birmingham_lsoa_boundaries",
        filename="birmingham_lsoa_2021_boundaries.geojson",
        url=(
            "https://cityobservatory.birmingham.gov.uk/api/explore/v2.1/"
            "catalog/datasets/boundaries-lsoa-2021-birmingham/exports/geojson"
            "?lang=en&timezone=Europe%2FLondon"
        ),
        source_page=(
            "https://cityobservatory.birmingham.gov.uk/explore/dataset/"
            "boundaries-lsoa-2021-birmingham/"
        ),
        licence=(
            "Open Government Licence v3.0; contains ONS and Ordnance Survey "
            "intellectual property"
        ),
        size_hint_mb=1.1,
        purpose=(
            "Birmingham-only Census 2021 LSOA boundaries for Stage 0 study-area "
            "joins and choropleth checks."
        ),
    ),
    Dataset(
        key="naptan_atco_430",
        filename="naptan_atco_430_west_midlands.csv",
        url="https://naptan.api.dft.gov.uk/v1/access-nodes?dataFormat=csv&atcoAreaCodes=430",
        source_page="https://beta-naptan.dft.gov.uk/download",
        licence="Open Government Licence v3.0",
        size_hint_mb=3.7,
        purpose=(
            "NaPTAN public transport access nodes for ATCO area 430, covering "
            "West Midlands stops used to derive Birmingham and study-area stops."
        ),
    ),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--datasets",
        nargs="+",
        choices=[dataset.key for dataset in DATASETS],
        help="Dataset keys to fetch. Defaults to the Stage 0 light set.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be downloaded without writing data files.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download files even when they already exist.",
    )
    return parser.parse_args()


def selected_datasets(keys: list[str] | None) -> list[Dataset]:
    if keys is None:
        return [dataset for dataset in DATASETS if dataset.default]
    requested = set(keys)
    return [dataset for dataset in DATASETS if dataset.key in requested]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download_with_urllib(dataset: Dataset, tmp_path: Path) -> None:
    request = Request(
        dataset.url,
        headers={"User-Agent": "AccessBridgeAI/0.1 (+portfolio data reproducibility)"},
    )
    with urlopen(request, timeout=120) as response, tmp_path.open("wb") as handle:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            handle.write(chunk)


def download_with_curl(dataset: Dataset, tmp_path: Path) -> None:
    subprocess.run(
        [
            "curl",
            "-L",
            "--fail",
            "--silent",
            "--show-error",
            "--output",
            str(tmp_path),
            dataset.url,
        ],
        check=True,
    )


def download(dataset: Dataset, *, force: bool) -> dict[str, object]:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    output_path = dataset.output_path

    if output_path.exists() and not force:
        return {
            **asdict(dataset),
            "path": output_path.relative_to(ROOT).as_posix(),
            "downloaded": False,
            "status": "exists",
            "bytes": output_path.stat().st_size,
            "sha256": sha256_file(output_path),
        }

    tmp_path = output_path.with_suffix(output_path.suffix + ".tmp")

    try:
        download_with_urllib(dataset, tmp_path)
    except (HTTPError, URLError, TimeoutError):
        # macOS framework Python installations often lack a configured CA bundle.
        # Falling back to system curl keeps downloads reproducible without asking
        # users to weaken SSL verification.
        try:
            download_with_curl(dataset, tmp_path)
        except subprocess.CalledProcessError as exc:
            if tmp_path.exists():
                tmp_path.unlink()
            raise RuntimeError(f"Failed to download {dataset.key}: {exc}") from exc

    tmp_path.replace(output_path)
    return {
        **asdict(dataset),
        "path": output_path.relative_to(ROOT).as_posix(),
        "downloaded": True,
        "status": "downloaded",
        "bytes": output_path.stat().st_size,
        "sha256": sha256_file(output_path),
    }


def write_provenance(records: list[dict[str, object]]) -> None:
    existing: list[dict[str, object]] = []
    if PROVENANCE_PATH.exists():
        existing = json.loads(PROVENANCE_PATH.read_text())

    run = {
        "fetched_at_utc": datetime.now(timezone.utc).isoformat(),
        "records": records,
    }
    PROVENANCE_PATH.write_text(json.dumps([*existing, run], indent=2) + "\n")


def main() -> None:
    args = parse_args()
    datasets = selected_datasets(args.datasets)

    print("Stage 0 datasets:")
    for dataset in datasets:
        status = "exists" if dataset.output_path.exists() else "missing"
        print(f"- {dataset.key}: {dataset.filename} ({dataset.size_hint_mb} MB, {status})")

    if args.dry_run:
        print("\nDry run only. No files downloaded.")
        return

    records = [download(dataset, force=args.force) for dataset in datasets]
    write_provenance(records)

    print("\nFetch complete:")
    for record in records:
        print(f"- {record['status']}: {record['path']} ({record['bytes']} bytes)")
    print(f"- provenance: {PROVENANCE_PATH.relative_to(ROOT).as_posix()}")


if __name__ == "__main__":
    main()
