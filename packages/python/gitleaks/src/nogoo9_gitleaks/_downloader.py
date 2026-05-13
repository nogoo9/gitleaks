"""Binary resolver for nogoo9-gitleaks.

Resolution order:
1. ``NOGOO9_GITLEAKS_BIN`` environment variable (explicit override)
2. Bundled binary inside the installed wheel (``nogoo9_gitleaks/bin/gitleaks``)
3. Download from GitHub Releases on first use (fallback for ``py3-none-any`` wheel)
"""

from __future__ import annotations

import hashlib
import os
import platform
import re
import stat
import sys
import tarfile
import tempfile
import urllib.request
import zipfile
from importlib import resources as importlib_resources
from pathlib import Path
from urllib.parse import urlparse, urlunparse

# Keep in sync with pyproject.toml version (updated by scripts/sync-version.mjs)
_GITLEAKS_VERSION = "8.30.1"

_GITHUB_BASE = "https://github.com/gitleaks/gitleaks/releases/download"
_CHECKSUMS_FILENAME = "checksums.txt"

# Maps (sys.platform, machine) → gitleaks asset suffix
_PLATFORM_MAP: dict[tuple[str, str], tuple[str, str]] = {
    ("linux",  "x86_64"):  ("linux_x64",   ".tar.gz"),
    ("linux",  "aarch64"): ("linux_arm64",  ".tar.gz"),
    ("linux",  "armv7l"):  ("linux_armv7",  ".tar.gz"),
    ("linux",  "armv6l"):  ("linux_armv6",  ".tar.gz"),
    ("linux",  "i686"):    ("linux_x32",    ".tar.gz"),
    ("darwin", "x86_64"):  ("darwin_x64",   ".tar.gz"),
    ("darwin", "arm64"):   ("darwin_arm64", ".tar.gz"),
    ("win32",  "AMD64"):   ("windows_x64",  ".zip"),
    ("win32",  "ARM64"):   ("windows_arm64", ".zip"),
    ("win32",  "x86"):     ("windows_x32",  ".zip"),
}


def _binary_name() -> str:
    return "gitleaks.exe" if sys.platform == "win32" else "gitleaks"


def _find_bundled_binary() -> str | None:
    """Look for the gitleaks binary bundled inside the installed package.

    This is the fast path for platform-specific wheels that ship with
    the binary pre-bundled under ``nogoo9_gitleaks/bin/``.
    """
    try:
        bin_dir = importlib_resources.files("nogoo9_gitleaks") / "bin"
        binary = bin_dir / _binary_name()
        # importlib.resources may return a Traversable; resolve to a real path
        binary_path = Path(str(binary))
        if binary_path.is_file():
            # Ensure executable permission on Unix
            if sys.platform != "win32":
                current = binary_path.stat().st_mode
                binary_path.chmod(current | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
            return str(binary_path)
    except (TypeError, FileNotFoundError, OSError):
        pass
    return None


def _detect_platform() -> tuple[str, str]:
    """Return (gitleaks_platform_suffix, archive_ext) for the current host."""
    sys_platform = sys.platform  # 'linux', 'darwin', 'win32'
    machine = platform.machine()

    key = (sys_platform, machine)
    if key not in _PLATFORM_MAP:
        raise RuntimeError(
            f"Unsupported platform: {sys_platform}/{machine}.\n"
            "Please install gitleaks manually: "
            "https://github.com/gitleaks/gitleaks/releases"
        )
    return _PLATFORM_MAP[key]


def _cache_dir(version: str) -> Path:
    """Return the cache directory for a given gitleaks version."""
    base = Path(os.environ.get("NOGOO9_GITLEAKS_CACHE", Path.home() / ".cache" / "nogoo9-gitleaks"))
    return base / version


def _build_validated_url(base_url: str, version: str, filename: str) -> str:
    try:
        # Minimal path validation
        if "/../" in base_url or re.search(r"/%2e%2e/", base_url, re.IGNORECASE):
            raise ValueError("Invalid path")
        
        parsed = urlparse(base_url)
        
        # Validate path parameters
        if not re.fullmatch(r"[A-Za-z0-9._-]+", version):
            raise ValueError("Invalid parameter")
        if not re.fullmatch(r"[A-Za-z0-9._-]+", filename):
            raise ValueError("Invalid parameter")
        
        # Rebuild path from fixed literals + validated segments
        parsed = parsed._replace(path=f"/gitleaks/gitleaks/releases/download/v{version}/{filename}")
        
        return urlunparse(parsed)
    except Exception:
        raise ValueError("Invalid URL")


def _download_and_verify(version: str, suffix: str, ext: str, dest_dir: Path) -> Path:
    """Download the gitleaks archive + checksum, verify, extract, return binary path."""
    archive_name = f"gitleaks_{version}_{suffix}{ext}"
    checksums_name = f"gitleaks_{version}_{_CHECKSUMS_FILENAME}"

    dest_dir.mkdir(parents=True, exist_ok=True)

    # Download checksums file
    checksums_url = _build_validated_url(_GITHUB_BASE, version, checksums_name)
    print(f"[nogoo9-gitleaks] Downloading checksums from {checksums_url}", file=sys.stderr)
    with urllib.request.urlopen(checksums_url) as resp:  # noqa: S310
        checksums_text = resp.read().decode()

    # Find the expected SHA256 for our archive
    expected_sha256 = None
    for line in checksums_text.splitlines():
        parts = line.split()
        if len(parts) == 2 and parts[1] == archive_name:
            expected_sha256 = parts[0]
            break

    if expected_sha256 is None:
        raise RuntimeError(f"Could not find checksum for {archive_name}")

    # Download archive to a temp file, then verify
    archive_url = _build_validated_url(_GITHUB_BASE, version, archive_name)
    print(f"[nogoo9-gitleaks] Downloading {archive_url}", file=sys.stderr)
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp_path = Path(tmp.name)
        with urllib.request.urlopen(archive_url) as resp:  # noqa: S310
            tmp.write(resp.read())

    try:
        # Verify SHA256
        sha256 = hashlib.sha256(tmp_path.read_bytes()).hexdigest()
        if sha256 != expected_sha256:
            raise RuntimeError(
                f"SHA256 mismatch for {archive_name}:\n"
                f"  expected: {expected_sha256}\n"
                f"  got:      {sha256}"
            )

        # Extract the binary
        binary_name = _binary_name()
        if ext == ".tar.gz":
            with tarfile.open(tmp_path, "r:gz") as tar:
                member = tar.getmember(binary_name)
                tar.extract(member, path=dest_dir)
        else:  # .zip
            with zipfile.ZipFile(tmp_path) as zf:
                zf.extract(binary_name, path=dest_dir)
    finally:
        tmp_path.unlink(missing_ok=True)

    binary_path = dest_dir / binary_name
    # Ensure executable bit is set (important on Unix)
    binary_path.chmod(binary_path.stat().st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
    return binary_path


def get_binary_path(version: str = _GITLEAKS_VERSION) -> str:
    """Return the path to the gitleaks binary.

    Resolution order:

    1. ``NOGOO9_GITLEAKS_BIN`` environment variable — point to any binary.
    2. Bundled binary from the platform-specific wheel
       (``nogoo9_gitleaks/bin/gitleaks``).
    3. Download from GitHub Releases on first use and cache under
       ``~/.cache/nogoo9-gitleaks/<version>/``.
       Set ``NOGOO9_GITLEAKS_CACHE`` to override the cache directory.

    Args:
        version: Gitleaks version to use. Defaults to the bundled version.

    Returns:
        Absolute path string to the gitleaks binary.
    """
    # 1. Explicit override
    override = os.environ.get("NOGOO9_GITLEAKS_BIN")
    if override:
        return override

    # 2. Bundled binary (platform wheel)
    bundled = _find_bundled_binary()
    if bundled:
        return bundled

    # 3. Download fallback (any wheel or uncovered platform)
    suffix, ext = _detect_platform()
    cache = _cache_dir(version)
    binary = cache / _binary_name()

    if binary.exists():
        return str(binary)

    return str(_download_and_verify(version, suffix, ext, cache))
