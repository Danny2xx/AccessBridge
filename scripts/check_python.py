"""Check that the local Python version is suitable for Stage 0 notebooks."""

from __future__ import annotations

import platform
import sys

MIN_VERSION = (3, 9)
MAX_VERSION = (3, 13)
PREFERRED_VERSION = (3, 12)


def main() -> None:
    version = sys.version_info
    version_label = platform.python_version()

    if version.releaselevel != "final":
        raise SystemExit(
            f"Python {version_label} is a {version.releaselevel} release. "
            "Use a stable Python, ideally 3.12, for the notebook environment."
        )

    if not (MIN_VERSION <= version[:2] <= MAX_VERSION):
        raise SystemExit(
            f"Python {version_label} is not the recommended project range. "
            "Use Python 3.9-3.13 for Stage 0; Python 3.12 is preferred."
        )

    if version[:2] != PREFERRED_VERSION:
        print(
            f"Python {version_label} is usable for Stage 0 notebooks. "
            "Before the GeoPandas/r5py work, install Python 3.12 for the main project environment."
        )
        return

    print(f"Python {version_label} looks ideal for Stage 0.")


if __name__ == "__main__":
    main()
