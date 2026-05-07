#!/usr/bin/env bun
/**
 * sync-version.mjs
 *
 * Fetches the latest gitleaks release from GitHub, compares it with the
 * currently pinned version in .gitleaks-version, and if different:
 *   - Updates .gitleaks-version
 *   - Updates all npm package.json versions (platform + main)
 *   - Updates pyproject.toml version
 *   - Updates the _GITLEAKS_VERSION constant in _downloader.py
 *
 * The GitHub Actions workflow then commits, tags, and pushes.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

async function fetchLatestRelease() {
  const headers = { 'User-Agent': 'nogoo9-gitleaks-sync/1.0' };
  if (process.env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;

  const res = await fetch(
    'https://api.github.com/repos/gitleaks/gitleaks/releases/latest',
    { headers }
  );
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

function updateChangelog(filePath, newVersion, releaseDate, releaseBody) {
  const existing = readFileSync(filePath, 'utf8');

  // Format upstream release notes, trimming leading bullet asterisks to markdown list
  const notes = (releaseBody || '')
    .trim()
    .split('\n')
    .map(l => l.replace(/^\*\s+/, '- ').trimEnd())
    .filter(Boolean)
    .join('\n');

  const entry = [
    `## [${newVersion}] — ${releaseDate}`,
    ``,
    `### Changed`,
    `- Tracking upstream gitleaks v${newVersion}`,
    ``,
    `### Upstream release notes`,
    notes || '*(no notes provided)*',
    ``,
    `See [gitleaks v${newVersion} release](https://github.com/gitleaks/gitleaks/releases/tag/v${newVersion}).`,
    ``,
  ].join('\n');

  // Insert after the "# Changelog\n\n..." header block (before first "## ")
  const insertAt = existing.indexOf('\n## ');
  const updated =
    insertAt === -1
      ? existing + '\n' + entry
      : existing.slice(0, insertAt + 1) + entry + existing.slice(insertAt + 1);

  writeFileSync(filePath, updated);
  console.log(`  Updated ${filePath}`);
}

function readVersion() {
  return readFileSync(join(ROOT, '.gitleaks-version'), 'utf8').trim();
}

function updateJsonVersion(filePath, newVersion) {
  const raw = readFileSync(filePath, 'utf8');
  const pkg = JSON.parse(raw);

  // Update own version
  pkg.version = newVersion;

  // Update optionalDependencies versions (main package only)
  if (pkg.optionalDependencies) {
    for (const dep of Object.keys(pkg.optionalDependencies)) {
      if (dep.startsWith('@nogoo9/gitleaks')) {
        pkg.optionalDependencies[dep] = newVersion;
      }
    }
  }

  writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`  Updated ${filePath}`);
}

function updatePyprojectVersion(filePath, newVersion) {
  let content = readFileSync(filePath, 'utf8');
  content = content.replace(/^version = "[\d.]+"/m, `version = "${newVersion}"`);
  writeFileSync(filePath, content);
  console.log(`  Updated ${filePath}`);
}

function updateDownloaderVersion(filePath, newVersion) {
  let content = readFileSync(filePath, 'utf8');
  content = content.replace(
    /^_GITLEAKS_VERSION = "[\d.]+"/m,
    `_GITLEAKS_VERSION = "${newVersion}"`
  );
  writeFileSync(filePath, content);
  console.log(`  Updated ${filePath}`);
}

function updateInitVersion(filePath, newVersion) {
  let content = readFileSync(filePath, 'utf8');
  content = content
    .replace(/^__version__ = "[\d.]+"/m, `__version__ = "${newVersion}"`)
    .replace(/^__gitleaks_version__ = "[\d.]+"/m, `__gitleaks_version__ = "${newVersion}"`);
  writeFileSync(filePath, content);
  console.log(`  Updated ${filePath}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

const currentVersion = readVersion();
const release = await fetchLatestRelease();
const latestVersion = release.tag_name.replace(/^v/, '');
const releaseDate = release.published_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);

if (currentVersion === latestVersion) {
  console.log(`Already at latest gitleaks version: ${latestVersion}`);
  process.exit(0);
}

console.log(`New version detected: ${currentVersion} → ${latestVersion}`);

// .gitleaks-version
writeFileSync(join(ROOT, '.gitleaks-version'), latestVersion + '\n');
console.log('  Updated .gitleaks-version');

// npm main package
updateJsonVersion(join(ROOT, 'packages/npm/gitleaks/package.json'), latestVersion);

// npm platform packages
const platforms = [
  'darwin-arm64', 'darwin-x64',
  'linux-arm64', 'linux-arm', 'linux-x64', 'linux-x32',
  'windows-arm64', 'windows-x64', 'windows-x32',
];
for (const p of platforms) {
  updateJsonVersion(join(ROOT, `packages/npm/gitleaks-${p}/package.json`), latestVersion);
}

// Python package
updatePyprojectVersion(
  join(ROOT, 'packages/python/gitleaks/pyproject.toml'),
  latestVersion
);
updateDownloaderVersion(
  join(ROOT, 'packages/python/gitleaks/src/nogoo9_gitleaks/_downloader.py'),
  latestVersion
);
updateInitVersion(
  join(ROOT, 'packages/python/gitleaks/src/nogoo9_gitleaks/__init__.py'),
  latestVersion
);

// CHANGELOG
updateChangelog(
  join(ROOT, 'CHANGELOG.md'),
  latestVersion,
  releaseDate,
  release.body ?? ''
);

console.log(`\nSync complete: ${currentVersion} → ${latestVersion}`);
