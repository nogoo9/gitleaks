"""nogoo9-gitleaks: Python wrapper for gitleaks.

Provides both a CLI (`gitleaks`) and a programmatic API.

Programmatic usage::

    import nogoo9_gitleaks as gitleaks

    # Simple run — returns subprocess.CompletedProcess
    result = gitleaks.run(["detect", "--source", "."])
    print(result.returncode)
    print(result.stdout)

    # With captured output
    result = gitleaks.run(
        ["detect", "--source", ".", "--report-format", "json"],
        capture_output=True,
        text=True,
    )
    import json
    findings = json.loads(result.stdout or "[]")

    # Get the binary path directly
    binary = gitleaks.get_binary_path()
"""

from __future__ import annotations

import subprocess
from typing import Any

from ._downloader import get_binary_path

__version__ = "8.30.1"
__gitleaks_version__ = "8.30.1"

__all__ = [
    "__version__",
    "__gitleaks_version__",
    "get_binary_path",
    "run",
]


def run(
    args: list[str],
    *,
    check: bool = False,
    capture_output: bool = False,
    text: bool = False,
    **kwargs: Any,
) -> subprocess.CompletedProcess:
    """Run gitleaks with the given arguments.

    Args:
        args: Command-line arguments to pass to gitleaks (e.g. ``["detect", "--source", "."]``).
        check: If True, raise CalledProcessError on non-zero exit.
        capture_output: If True, capture stdout and stderr.
        text: If True, decode stdout/stderr as text.
        **kwargs: Additional keyword arguments forwarded to :func:`subprocess.run`.

    Returns:
        :class:`subprocess.CompletedProcess` instance.

    Example::

        result = gitleaks.run(["version"], capture_output=True, text=True)
        print(result.stdout)  # e.g. "v8.30.1"
    """
    binary = get_binary_path()
    return subprocess.run(
        [binary, *args],
        check=check,
        capture_output=capture_output,
        text=text,
        **kwargs,
    )
