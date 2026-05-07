"""Tests for nogoo9-gitleaks Python wrapper.

These are real integration tests — no mocking. The downloader fetches
the actual gitleaks binary from GitHub Releases on first run (cached).
"""

from __future__ import annotations

import os
import stat
from pathlib import Path

import nogoo9_gitleaks as gitleaks
from nogoo9_gitleaks._downloader import _GITLEAKS_VERSION, get_binary_path


# ── Helpers ───────────────────────────────────────────────────────────────────

def _repo_root() -> Path:
    """Walk up from this file to find .gitleaks-version."""
    p = Path(__file__).parent
    while p != p.parent:
        if (p / '.gitleaks-version').exists():
            return p
        p = p.parent
    raise FileNotFoundError('.gitleaks-version not found')


EXPECTED_VERSION = (_repo_root() / '.gitleaks-version').read_text().strip()


# ── Binary downloader tests ───────────────────────────────────────────────────

def test_get_binary_path_returns_string():
    path = get_binary_path()
    assert isinstance(path, str)
    assert len(path) > 0


def test_binary_exists_on_disk():
    path = get_binary_path()
    assert Path(path).exists(), f"Binary not found at {path}"


def test_binary_is_executable():
    path = Path(get_binary_path())
    if os.name != 'nt':
        assert path.stat().st_mode & stat.S_IEXEC, "Binary is not executable"


def test_nogoo9_gitleaks_bin_env_override(tmp_path):
    """NOGOO9_GITLEAKS_BIN env var should override the downloaded binary path."""
    fake_bin = tmp_path / 'fake-gitleaks'
    fake_bin.touch()
    env_before = os.environ.get('NOGOO9_GITLEAKS_BIN')
    try:
        os.environ['NOGOO9_GITLEAKS_BIN'] = str(fake_bin)
        assert get_binary_path() == str(fake_bin)
    finally:
        if env_before is None:
            os.environ.pop('NOGOO9_GITLEAKS_BIN', None)
        else:
            os.environ['NOGOO9_GITLEAKS_BIN'] = env_before


def test_bundled_version_matches_repo():
    """_GITLEAKS_VERSION in _downloader.py must match .gitleaks-version."""
    assert _GITLEAKS_VERSION == EXPECTED_VERSION


# ── CLI integration tests (real binary) ──────────────────────────────────────

def test_run_version_exits_zero():
    result = gitleaks.run(['version'], capture_output=True, text=True)
    assert result.returncode == 0


def test_run_version_output_contains_version():
    result = gitleaks.run(['version'], capture_output=True, text=True)
    output = result.stdout + result.stderr
    assert EXPECTED_VERSION in output, (
        f"Expected version {EXPECTED_VERSION!r} not found in output: {output!r}"
    )


def test_run_help_exits_zero():
    result = gitleaks.run(['--help'], capture_output=True, text=True)
    assert result.returncode == 0


def test_run_help_lists_subcommands():
    result = gitleaks.run(['--help'], capture_output=True, text=True)
    output = result.stdout + result.stderr
    # gitleaks v8.20+ renamed detect→git, removed protect; dir added for filesystem scans
    for subcommand in ('git', 'dir', 'version'):
        assert subcommand in output.lower(), f"'{subcommand}' not found in --help output"



def test_run_unknown_command_exits_nonzero():
    result = gitleaks.run(['not-a-real-subcommand'], capture_output=True, text=True)
    assert result.returncode != 0


# ── Public API surface ────────────────────────────────────────────────────────

def test_module_version_matches_repo():
    assert gitleaks.__version__ == EXPECTED_VERSION


def test_module_gitleaks_version_matches_repo():
    assert gitleaks.__gitleaks_version__ == EXPECTED_VERSION


def test_run_returns_completed_process():
    import subprocess
    result = gitleaks.run(['version'], capture_output=True, text=True)
    assert isinstance(result, subprocess.CompletedProcess)
