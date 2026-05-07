#!/usr/bin/env bash
# scripts/bootstrap-npm.sh
#
# One-time bootstrap: publishes all 10 npm packages (@nogoo9/gitleaks + 9 platform
# packages) using a traditional npm token. Run this ONCE before configuring OIDC
# Trusted Publishing on npmjs.com.
#
# Usage:
#   NPM_TOKEN=npm_xxx bash scripts/bootstrap-npm.sh
#   # or: npm login first, then just: bash scripts/bootstrap-npm.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(cat "$ROOT/.gitleaks-version" | tr -d '[:space:]')"

echo "=== npm bootstrap for @nogoo9/gitleaks v${VERSION} ==="

# ── Auth ─────────────────────────────────────────────────────────────────────
if [ -n "${NPM_TOKEN:-}" ]; then
  echo "Using NPM_TOKEN from environment"
  echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" >> ~/.npmrc
else
  echo "NPM_TOKEN not set — ensure you are logged in via 'npm login'"
  npm whoami || { echo "Not logged in. Run: npm login"; exit 1; }
fi

# ── Download & verify binaries ────────────────────────────────────────────────
echo ""
echo "Downloading gitleaks v${VERSION} binaries..."
bun "$ROOT/scripts/build-npm-pkgs.mjs" "$VERSION"

# ── Publish platform packages first ──────────────────────────────────────────
PLATFORMS=(
  darwin-arm64
  darwin-x64
  linux-arm64
  linux-arm
  linux-x64
  linux-x32
  windows-arm64
  windows-x64
  windows-x32
)

echo ""
echo "Publishing platform packages..."
for p in "${PLATFORMS[@]}"; do
  PKG_DIR="$ROOT/packages/npm/gitleaks-$p"

  # ── Preflight: verify binary and README are present ────────────────────────
  if [[ "$p" == windows-* ]]; then
    BINARY="$PKG_DIR/bin/gitleaks.exe"
  else
    BINARY="$PKG_DIR/bin/gitleaks"
  fi
  if [ ! -f "$BINARY" ]; then
    echo "ERROR: binary missing for $p: $BINARY" >&2
    echo "  Run: bun scripts/build-npm-pkgs.mjs" >&2
    exit 1
  fi
  if [ ! -f "$PKG_DIR/README.md" ]; then
    echo "ERROR: README.md missing for $p" >&2
    exit 1
  fi
  echo "  ✓ preflight ok: $p ($(du -sh "$BINARY" | cut -f1) binary + README)"

  echo "  → @nogoo9/gitleaks-$p"
  npm publish "$PKG_DIR" --access public --tag latest
done

# ── Publish main package ──────────────────────────────────────────────────────
echo ""
echo "Publishing @nogoo9/gitleaks (main)..."
npm publish "$ROOT/packages/npm/gitleaks" --access public --tag latest

echo ""
echo "=== Bootstrap complete! ==="
echo ""
echo "Next steps:"
echo "  1. Configure Trusted Publishing on npmjs.com for each of the 10 packages:"
echo "       Owner: nogoo9   Repo: gitleaks   Workflow: publish.yml   Env: npm"
echo "  2. Create an 'npm' environment in GitHub repo Settings → Environments"
echo "  3. Delete your NPM_TOKEN — all future publishes use OIDC"
