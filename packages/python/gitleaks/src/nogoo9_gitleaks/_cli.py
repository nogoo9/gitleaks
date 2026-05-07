"""CLI entrypoint for the `gitleaks` command."""

from __future__ import annotations

import os
import subprocess
import sys

from ._downloader import get_binary_path


def main() -> None:
    """Entry point for the ``gitleaks`` console script."""
    binary = get_binary_path()

    # Use os.execv on Unix to fully replace the process (no Python overhead,
    # signal handling, exit codes all pass through natively).
    if os.name != "nt":
        os.execv(binary, [binary] + sys.argv[1:])
    else:
        # Windows: os.execv does not truly replace the process, use subprocess
        result = subprocess.run([binary] + sys.argv[1:])
        sys.exit(result.returncode)
