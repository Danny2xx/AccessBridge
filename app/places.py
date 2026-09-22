"""Human-readable place names for neighbourhoods and candidate stops.

Built by `scripts/build_place_names.py` from NaPTAN localities. The lookup is
optional: when the file is missing, callers fall back to the official names.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from app.config import Settings, get_settings


@dataclass(frozen=True)
class PlaceNames:
    """Place-name lookups keyed by LSOA code and candidate id."""

    neighbourhoods: dict[str, str] = field(default_factory=dict)
    candidates: dict[str, str] = field(default_factory=dict)

    def neighbourhood(self, lsoa21cd: str, fallback: str) -> str:
        return self.neighbourhoods.get(str(lsoa21cd)) or fallback

    def candidate(self, candidate_id: str, fallback: str) -> str:
        return self.candidates.get(str(candidate_id)) or fallback


_CACHE: dict[tuple[str, int], PlaceNames] = {}


def read_place_names(path: Path) -> PlaceNames:
    """Parse a place-names JSON file."""

    payload = json.loads(path.read_text())
    neighbourhoods = payload.get("neighbourhoods", {})
    candidates = payload.get("candidates", {})
    if not isinstance(neighbourhoods, dict) or not isinstance(candidates, dict):
        raise ValueError(f"{path.name} must contain 'neighbourhoods' and 'candidates' objects")
    return PlaceNames(
        neighbourhoods={str(key): str(value) for key, value in neighbourhoods.items()},
        candidates={str(key): str(value) for key, value in candidates.items()},
    )


def load_place_names(settings: Settings | None = None) -> PlaceNames:
    """Load place names, re-reading only when the file changes."""

    path = (settings or get_settings()).place_names_path
    if not path.exists():
        return PlaceNames()
    key = (str(path), path.stat().st_mtime_ns)
    if key not in _CACHE:
        _CACHE.clear()
        _CACHE[key] = read_place_names(path)
    return _CACHE[key]
