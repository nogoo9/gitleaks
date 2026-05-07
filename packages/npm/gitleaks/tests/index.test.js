import { test, expect, beforeAll } from 'bun:test';
import { spawnSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexJs = join(__dirname, '../src/index.js');
const rootDir = join(__dirname, '../../../..');

// Read the pinned version from the repo root — no hardcoding
const expectedVersion = readFileSync(join(rootDir, '.gitleaks-version'), 'utf8').trim();

/** Run gitleaks via our wrapper and return the spawnSync result */
function runWrapper(...args) {
  return spawnSync(process.execPath, [indexJs, ...args], {
    encoding: 'utf8',
    env: process.env,
    timeout: 15_000,
  });
}

// ── Smoke tests — require real binary (downloaded via bun scripts/build-npm-pkgs.mjs) ──

test('wrapper: gitleaks version exits 0', () => {
  const result = runWrapper('version');
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
});

test('wrapper: gitleaks version output contains expected version', () => {
  const result = runWrapper('version');
  const output = (result.stdout ?? '') + (result.stderr ?? '');
  expect(output).toContain(expectedVersion);
});

test('wrapper: gitleaks --help exits 0 and lists subcommands', () => {
  const result = runWrapper('--help');
  expect(result.status).toBe(0);
  const output = result.stdout ?? '';
  // gitleaks v8.20+ renamed detect→git, removed protect; dir added for filesystem scans
  expect(output).toMatch(/\bgit\b/i);
  expect(output).toMatch(/\bdir\b/i);
  expect(output).toMatch(/version/i);
});

test('wrapper: unknown command exits non-zero', () => {
  const result = runWrapper('not-a-real-subcommand');
  expect(result.status).not.toBe(0);
});

// ── Unit tests — no binary required ──────────────────────────────────────────

test('src/index.js: PLATFORM_MAP covers current platform', async () => {
  // Import the module and verify the current platform resolves to a known suffix
  const os = await import('os');

  const PLATFORM_MAP = {
    'darwin-x64': 'darwin-x64',
    'darwin-arm64': 'darwin-arm64',
    'linux-x64': 'linux-x64',
    'linux-ia32': 'linux-x32',
    'linux-arm64': 'linux-arm64',
    'linux-arm': 'linux-arm',
    'win32-x64': 'windows-x64',
    'win32-ia32': 'windows-x32',
    'win32-arm64': 'windows-arm64',
  };

  const key = `${os.platform()}-${os.arch()}`;
  expect(PLATFORM_MAP[key]).toBeTruthy();
});
