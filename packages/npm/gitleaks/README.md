# @nogoo9/gitleaks

[![npm version](https://img.shields.io/npm/v/@nogoo9/gitleaks.svg)](https://www.npmjs.com/package/@nogoo9/gitleaks)
[![CI](https://github.com/nogoo9/gitleaks/actions/workflows/test.yml/badge.svg)](https://github.com/nogoo9/gitleaks/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> npm wrapper for [gitleaks](https://github.com/gitleaks/gitleaks) — find secrets in git repos.

Installs the correct `gitleaks` binary for your platform automatically via npm's
[optional dependencies](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#optionaldependencies)
mechanism (same pattern as [esbuild](https://esbuild.github.io/getting-started/#install-the-esbuild-npm-package)).
No postinstall scripts. No network calls at install time.

## Installation

```bash
npm install @nogoo9/gitleaks
# or
bun add @nogoo9/gitleaks
# or
pnpm add @nogoo9/gitleaks
```

## Usage

### CLI

After installation the `gitleaks` binary is available via `npx`:

```bash
npx gitleaks git .
npx gitleaks dir .
npx gitleaks version
```

Or run it directly if `node_modules/.bin` is on your `PATH`:

```bash
gitleaks git .
```

### Node.js API

```js
import { run, getBinaryPath } from '@nogoo9/gitleaks';

// Get the path to the gitleaks binary
const bin = getBinaryPath();

// Run gitleaks programmatically
const result = await run(['git', '.', '--exit-code', '1']);
console.log(result.stdout);
console.log('exit code:', result.exitCode);
```

## Platform Support

The correct binary is selected automatically at install time:

| Platform | Architecture | Package |
|---|---|---|
| Linux | x64 | `@nogoo9/gitleaks-linux-x64` |
| Linux | x32 | `@nogoo9/gitleaks-linux-x32` |
| Linux | arm64 | `@nogoo9/gitleaks-linux-arm64` |
| Linux | arm (v7) | `@nogoo9/gitleaks-linux-arm` |
| macOS | x64 | `@nogoo9/gitleaks-darwin-x64` |
| macOS | arm64 (M1/M2/M3) | `@nogoo9/gitleaks-darwin-arm64` |
| Windows | x64 | `@nogoo9/gitleaks-windows-x64` |
| Windows | x32 | `@nogoo9/gitleaks-windows-x32` |
| Windows | arm64 | `@nogoo9/gitleaks-windows-arm64` |

## Environment Variables

| Variable | Description |
|---|---|
| `NOGOO9_GITLEAKS_BIN` | Override the path to the `gitleaks` binary |

## Versioning

This package version tracks the upstream [gitleaks](https://github.com/gitleaks/gitleaks/releases)
release version exactly (e.g. `@nogoo9/gitleaks@8.30.1` wraps `gitleaks v8.30.1`).

## License

MIT — see [LICENSE](https://github.com/nogoo9/gitleaks/blob/main/LICENSE).

The bundled `gitleaks` binary is also MIT licensed —
see [LICENSES/gitleaks-MIT.txt](https://github.com/nogoo9/gitleaks/blob/main/LICENSES/gitleaks-MIT.txt).
