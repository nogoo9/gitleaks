# gitleaks wrappers

[![npm version](https://img.shields.io/npm/v/%40nogoo9%2Fgitleaks?label=npm&logo=npm)](https://www.npmjs.com/package/@nogoo9/gitleaks)
[![PyPI version](https://img.shields.io/pypi/v/nogoo9-gitleaks?label=pypi&logo=pypi)](https://pypi.org/project/nogoo9-gitleaks/)
[![Upstream gitleaks](https://img.shields.io/github/v/release/gitleaks/gitleaks?label=gitleaks&logo=go)](https://github.com/gitleaks/gitleaks/releases/latest)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/github/actions/workflow/status/nogoo9/gitleaks/test.yml?label=tests&logo=github)](https://github.com/nogoo9/gitleaks/actions/workflows/test.yml)
[![Publish](https://img.shields.io/github/actions/workflow/status/nogoo9/gitleaks/publish.yml?label=publish&logo=github)](https://github.com/nogoo9/gitleaks/actions/workflows/publish.yml)
[![Upstream sync](https://img.shields.io/github/actions/workflow/status/nogoo9/gitleaks/check-upstream.yml?label=sync&logo=github)](https://github.com/nogoo9/gitleaks/actions/workflows/check-upstream.yml)

Automatically published **npm** and **PyPI** wrappers for [gitleaks](https://github.com/gitleaks/gitleaks) — the fast, open-source secret scanner for git repositories.

New upstream releases are detected daily and re-published automatically via GitHub Actions with OIDC keyless signing.

---

## Installation

### npm

```bash
bun add @nogoo9/gitleaks        # Bun
npm install @nogoo9/gitleaks    # npm
```

The correct platform binary is installed automatically via optional dependencies (esbuild-style). No postinstall scripts, no sudo.

### Python (pip / uv)

```bash
uv add nogoo9-gitleaks          # uv
pip install nogoo9-gitleaks     # pip
```

Platform-specific wheels bundle the correct `gitleaks` binary — no internet access needed after install. On unsupported platforms a fallback wheel downloads the binary on first use. Set `NOGOO9_GITLEAKS_BIN` to point to a pre-installed binary, or `NOGOO9_GITLEAKS_CACHE` to change the download cache directory.

---

## Usage

### CLI

Both packages expose a `gitleaks` command identical to the upstream binary:

```bash
gitleaks git .
gitleaks git . --report-format json --report-path findings.json
gitleaks version
```

See the [full gitleaks documentation](https://github.com/gitleaks/gitleaks#readme) for all commands and flags.

### JavaScript / TypeScript (programmatic)

```js
import { spawnSync } from 'child_process';
import { getBinaryPath } from '@nogoo9/gitleaks/src/index.js';

// Or just run via the wrapper directly in scripts:
const result = spawnSync(
  process.execPath,
  [require.resolve('@nogoo9/gitleaks'), 'git', '.', '--exit-code', '1'],
  { stdio: 'inherit' }
);
```

### Python (programmatic)

```python
import nogoo9_gitleaks as gitleaks

# Run detect on current git repo, inherit stdio (same as CLI)
result = gitleaks.run(["git", "."])
print("Exit code:", result.returncode)

# Capture JSON output for parsing
result = gitleaks.run(
    ["git", ".", "--report-format", "json", "--exit-code", "0"],
    capture_output=True,
    text=True,
)
import json
findings = json.loads(result.stdout or "[]")
for f in findings:
    print(f["Description"], f["File"], f["StartLine"])

# Get the binary path directly (e.g. for subprocess integration)
binary = gitleaks.get_binary_path()
print("Binary at:", binary)
```

---

## Platform Support

| Platform | npm package | Python wheel |
|---|---|---|
| Linux x64 | `@nogoo9/gitleaks-linux-x64` | `manylinux_2_17_x86_64` ✅ |
| Linux arm64 | `@nogoo9/gitleaks-linux-arm64` | `manylinux_2_17_aarch64` ✅ |
| Linux arm (v7) | `@nogoo9/gitleaks-linux-arm` | fallback (download) |
| Linux x32 | `@nogoo9/gitleaks-linux-x32` | fallback (download) |
| macOS x64 (Intel) | `@nogoo9/gitleaks-darwin-x64` | `macosx_10_9_x86_64` ✅ |
| macOS arm64 (Apple Silicon) | `@nogoo9/gitleaks-darwin-arm64` | `macosx_11_0_arm64` ✅ |
| Windows x64 | `@nogoo9/gitleaks-windows-x64` | `win_amd64` ✅ |
| Windows arm64 | `@nogoo9/gitleaks-windows-arm64` | fallback (download) |
| Windows x32 | `@nogoo9/gitleaks-windows-x32` | fallback (download) |

> **Bundled vs fallback**: Platform wheels (✅) ship with the binary included — fully offline. Fallback wheels download the binary from GitHub Releases on first use.

---

## How It Works

1. A **daily GitHub Actions cron** fetches the latest gitleaks release from the GitHub API.
2. If a new version is found, all `package.json` / `pyproject.toml` versions are bumped, committed, and a `v*` tag is pushed.
3. The **publish workflow** triggers on that tag:
   - Downloads all 9 platform binaries and verifies SHA-256 checksums against gitleaks's official checksums file.
   - Publishes 9 `@nogoo9/gitleaks-<platform>` packages + the main `@nogoo9/gitleaks` to npm with `--provenance`.
   - Builds 5 platform-specific Python wheels (bundling the binary) + 1 fallback wheel + sdist, then publishes all to PyPI via OIDC Trusted Publishing.
4. All publishing is **fully keyless** — no long-lived tokens stored anywhere (npm uses OIDC after initial bootstrap; PyPI uses pending trusted publisher from day one).

---

## License

This wrapper is released under the [MIT License](LICENSE).

gitleaks itself is also [MIT licensed](LICENSES/gitleaks-MIT.txt) — copyright Zachary Rice and contributors.
