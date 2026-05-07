# nogoo9-gitleaks

[![PyPI version](https://img.shields.io/pypi/v/nogoo9-gitleaks.svg)](https://pypi.org/project/nogoo9-gitleaks/)
[![Python versions](https://img.shields.io/pypi/pyversions/nogoo9-gitleaks.svg)](https://pypi.org/project/nogoo9-gitleaks/)
[![CI](https://github.com/nogoo9/gitleaks/actions/workflows/test.yml/badge.svg)](https://github.com/nogoo9/gitleaks/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Python wrapper for [gitleaks](https://github.com/gitleaks/gitleaks) — find secrets in git repos.

Pre-built platform wheels ship the correct `gitleaks` binary for your OS — no
internet access needed after install. For unsupported platforms, the binary is
downloaded and cached on first use.

## Installation

```bash
pip install nogoo9-gitleaks
# or
uv add nogoo9-gitleaks
# or
pipx install nogoo9-gitleaks
```

## Usage

### CLI

```bash
gitleaks git .
gitleaks dir .
gitleaks version
```

### Python API

```python
import nogoo9_gitleaks as gitleaks

# Get the path to the gitleaks binary
bin_path = gitleaks.get_binary_path()

# Scan a git repository
result = gitleaks.run(['git', '.', '--exit-code', '1'])
print(result.stdout)
print('exit code:', result.returncode)
```

## Platform Support

Pre-built wheels are available for the most popular platforms:

| Platform | Architecture | Wheel tag |
|---|---|---|
| Linux | x86_64 | `manylinux_2_17_x86_64` |
| Linux | aarch64 | `manylinux_2_17_aarch64` |
| macOS | Apple Silicon (M1+) | `macosx_11_0_arm64` |
| macOS | Intel x86_64 | `macosx_10_9_x86_64` |
| Windows | x86_64 | `win_amd64` |

A fallback `py3-none-any` wheel is also published for other platforms — it
downloads the correct binary from GitHub Releases on first use and caches it
locally.

## Environment Variables

| Variable | Description |
|---|---|
| `NOGOO9_GITLEAKS_BIN` | Override the path to the `gitleaks` binary (skip bundled + download) |
| `NOGOO9_GITLEAKS_CACHE` | Override the download cache directory (default: `~/.cache/nogoo9-gitleaks`) |

## Binary Resolution Order

1. **`NOGOO9_GITLEAKS_BIN`** — explicit override (e.g. system-installed gitleaks)
2. **Bundled binary** — shipped inside the platform-specific wheel
3. **Download fallback** — fetches from GitHub Releases on first use (SHA-256 verified)

## Versioning

This package version tracks the upstream [gitleaks](https://github.com/gitleaks/gitleaks/releases)
release version exactly (e.g. `nogoo9-gitleaks==8.30.1` wraps `gitleaks v8.30.1`).

## License

MIT — see [LICENSE](https://github.com/nogoo9/gitleaks/blob/main/LICENSE).

The bundled/downloaded `gitleaks` binary is also MIT licensed —
see [LICENSES/gitleaks-MIT.txt](https://github.com/nogoo9/gitleaks/blob/main/LICENSES/gitleaks-MIT.txt).
