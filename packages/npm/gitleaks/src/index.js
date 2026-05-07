#!/usr/bin/env node
// @nogoo9/gitleaks — binary wrapper
// Detects the platform, resolves the installed optional dependency binary,
// and exec-replaces the current process with gitleaks.
// Falls back to a guided download if the optional dep is not installed.

'use strict';

const { spawnSync } = require('child_process');
const path = require('path');
const os = require('os');

// Map Node's platform/arch to our package naming scheme
const PLATFORM_MAP = {
  'darwin-x64':   'darwin-x64',
  'darwin-arm64': 'darwin-arm64',
  'linux-x64':    'linux-x64',
  'linux-ia32':   'linux-x32',
  'linux-arm64':  'linux-arm64',
  'linux-arm':    'linux-arm',
  'win32-x64':    'windows-x64',
  'win32-ia32':   'windows-x32',
  'win32-arm64':  'windows-arm64',
};

function getPlatformKey() {
  return `${os.platform()}-${os.arch()}`;
}

function getBinaryPath() {
  const key = getPlatformKey();
  const platformSuffix = PLATFORM_MAP[key];
  if (!platformSuffix) return null;

  const pkgName = `@nogoo9/gitleaks-${platformSuffix}`;
  const isWindows = os.platform() === 'win32';
  const binaryName = isWindows ? 'gitleaks.exe' : 'gitleaks';

  try {
    // resolve the binary from the optional dep's bin/ directory
    return require.resolve(`${pkgName}/bin/${binaryName}`);
  } catch {
    return null;
  }
}

function main() {
  const binaryPath = getBinaryPath();

  if (!binaryPath) {
    const key = getPlatformKey();
    const supported = Object.keys(PLATFORM_MAP);
    if (!PLATFORM_MAP[key]) {
      console.error(
        `[gitleaks] Unsupported platform: ${key}\n` +
        `Supported platforms: ${supported.join(', ')}\n` +
        `Please install gitleaks manually: https://github.com/gitleaks/gitleaks/releases`
      );
    } else {
      console.error(
        `[gitleaks] Binary not found. The optional package @nogoo9/gitleaks-${PLATFORM_MAP[key]} ` +
        `was not installed.\n` +
        `Try reinstalling with: npm install @nogoo9/gitleaks\n` +
        `Or install gitleaks manually: https://github.com/gitleaks/gitleaks/releases`
      );
    }
    process.exit(1);
  }

  // Exec-replace: pass all args and inherit stdio for full interactive support
  const result = spawnSync(binaryPath, process.argv.slice(2), {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error) {
    console.error(`[gitleaks] Failed to run binary: ${result.error.message}`);
    process.exit(1);
  }

  process.exit(result.status ?? 0);
}

main();
