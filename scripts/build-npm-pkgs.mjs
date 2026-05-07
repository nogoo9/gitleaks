#!/usr/bin/env bun
/**
 * build-npm-pkgs.mjs
 *
 * Downloads gitleaks binaries from GitHub Releases for all supported platforms,
 * verifies SHA-256 checksums, and extracts them into the correct
 * packages/npm/gitleaks-<platform>/bin/ directories.
 *
 * Usage:
 *   bun scripts/build-npm-pkgs.mjs [version]
 *
 * If version is omitted, reads from .gitleaks-version.
 */

import { createHash } from 'crypto';
import { mkdirSync, readFileSync, writeFileSync, chmodSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';


const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Platform definitions: [npm-suffix, gitleaks-asset-suffix, archive-ext, binary-name]
const PLATFORMS = [
  ['darwin-arm64',  'darwin_arm64',  '.tar.gz', 'gitleaks'],
  ['darwin-x64',    'darwin_x64',    '.tar.gz', 'gitleaks'],
  ['linux-arm64',   'linux_arm64',   '.tar.gz', 'gitleaks'],
  ['linux-arm',     'linux_armv7',   '.tar.gz', 'gitleaks'],
  ['linux-x64',     'linux_x64',     '.tar.gz', 'gitleaks'],
  ['linux-x32',     'linux_x32',     '.tar.gz', 'gitleaks'],
  ['windows-arm64', 'windows_arm64', '.zip',    'gitleaks.exe'],
  ['windows-x64',   'windows_x64',   '.zip',    'gitleaks.exe'],
  ['windows-x32',   'windows_x32',   '.zip',    'gitleaks.exe'],
];

const version = process.argv[2] || readFileSync(join(ROOT, '.gitleaks-version'), 'utf8').trim();
const BASE_URL = `https://github.com/gitleaks/gitleaks/releases/download/v${version}`;

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.text();
}

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function parseChecksums(version) {
  const url = `${BASE_URL}/gitleaks_${version}_checksums.txt`;
  console.log(`Fetching checksums from ${url}`);
  const text = await fetchText(url);
  const map = {};
  for (const line of text.trim().split('\n')) {
    const [hash, name] = line.trim().split(/\s+/);
    if (hash && name) map[name] = hash;
  }
  return map;
}

function verifyChecksum(buffer, expected, filename) {
  const actual = createHash('sha256').update(buffer).digest('hex');
  if (actual !== expected) {
    throw new Error(
      `SHA-256 mismatch for ${filename}:\n  expected: ${expected}\n  actual:   ${actual}`
    );
  }
  console.log(`  ✓ SHA-256 verified: ${filename}`);
}

async function extractTarGz(buffer, binaryName, destDir) {
  // Use Bun's native tar support via child process for simplicity
  const tmpArchive = join(destDir, '_tmp.tar.gz');
  writeFileSync(tmpArchive, buffer);

  const proc = Bun.spawn(['tar', '-xzf', tmpArchive, '-C', destDir, binaryName], {
    stdout: 'inherit',
    stderr: 'inherit',
  });
  await proc.exited;
  if (proc.exitCode !== 0) throw new Error(`tar extraction failed`);

  // Cleanup temp
  Bun.spawnSync(['rm', '-f', tmpArchive]);
}

async function extractZip(buffer, binaryName, destDir) {
  const tmpArchive = join(destDir, '_tmp.zip');
  writeFileSync(tmpArchive, buffer);

  const proc = Bun.spawn(['unzip', '-o', '-j', tmpArchive, binaryName, '-d', destDir], {
    stdout: 'inherit',
    stderr: 'inherit',
  });
  await proc.exited;
  if (proc.exitCode !== 0) throw new Error(`unzip extraction failed`);

  Bun.spawnSync(['rm', '-f', tmpArchive]);
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log(`Building npm platform packages for gitleaks v${version}\n`);

const checksums = await parseChecksums(version);

for (const [npmSuffix, assetSuffix, ext, binaryName] of PLATFORMS) {
  const archiveName = `gitleaks_${version}_${assetSuffix}${ext}`;
  const binDir = join(ROOT, `packages/npm/gitleaks-${npmSuffix}/bin`);
  const binaryPath = join(binDir, binaryName);

  console.log(`\n→ ${npmSuffix} (${archiveName})`);

  mkdirSync(binDir, { recursive: true });

  const expectedHash = checksums[archiveName];
  if (!expectedHash) throw new Error(`No checksum found for ${archiveName}`);

  const url = `${BASE_URL}/${archiveName}`;
  console.log(`  Downloading ${url}`);
  const buffer = await fetchBuffer(url);

  verifyChecksum(buffer, expectedHash, archiveName);

  if (ext === '.tar.gz') {
    await extractTarGz(buffer, binaryName, binDir);
  } else {
    await extractZip(buffer, binaryName, binDir);
  }

  // Ensure executable permission on Unix
  if (!binaryName.endsWith('.exe')) {
    chmodSync(binaryPath, 0o755);
  }

  console.log(`  ✓ Placed at ${binaryPath}`);
}

console.log(`\nAll platform binaries downloaded and verified for v${version}`);
