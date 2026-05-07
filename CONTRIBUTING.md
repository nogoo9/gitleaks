# Contributing

Thank you for your interest in contributing!

This repo is a thin automation wrapper — it does not modify gitleaks itself.
For gitleaks bugs or features, please open issues at [gitleaks/gitleaks](https://github.com/gitleaks/gitleaks).

---

## Toolchain

| Tool  | Version | Purpose                        |
|-------|---------|--------------------------------|
| proto | 0.47+   | Toolchain version manager      |
| moon  | 1.31+   | Monorepo task orchestration    |
| bun   | 1.2+    | JS package manager & runtime   |
| uv    | latest  | Python package manager         |

### Setup

```bash
# Install proto (manages all other tool versions automatically)
bash <(curl -fsSL https://moonrepo.dev/install/proto.sh)

# Install toolchain (moon, bun, node, python all pinned via .prototools)
proto install

# Install JS workspace dependencies
bun install

# Install Python package in editable mode (inside packages/python/gitleaks)
cd packages/python/gitleaks
uv sync
```

---

## Project Structure

```
.
├── .moon/              ← moon workspace & toolchain config
├── .prototools         ← pinned tool versions (bun, node, python, moon)
├── .gitleaks-version   ← currently wrapped upstream version
├── packages/
│   ├── npm/
│   │   ├── gitleaks/           ← @nogoo9/gitleaks (main wrapper)
│   │   └── gitleaks-<platform>/← platform binary packages (×9)
│   └── python/
│       └── gitleaks/           ← nogoo9-gitleaks
└── scripts/
    ├── sync-version.mjs    ← bumps all version fields
    └── build-npm-pkgs.mjs  ← downloads & verifies gitleaks binaries
```

---

## Common Tasks

```bash
# Run all tests
moon run :test

# Run all linters
moon run :lint

# Manually check for new upstream version (runs sync if newer)
bun scripts/sync-version.mjs

# Download binaries for current version (for local testing of npm packages)
bun scripts/build-npm-pkgs.mjs

# Build Python distribution
cd packages/python/gitleaks && uv build
```

---

## Release Process (Automated)

The release process is fully automated:

1. The `check-upstream.yml` workflow runs daily.
2. If a new gitleaks version is detected, it calls `scripts/sync-version.mjs`, commits, and pushes a `v<version>` tag.
3. The `publish.yml` workflow triggers on that tag and publishes to npm and PyPI.

### Manual Trigger

You can trigger `check-upstream.yml` manually from the GitHub Actions UI with `force: true` to republish the current version.

---

## npm Bootstrap (One-Time)

npm requires the package to exist before OIDC Trusted Publishing can be configured.

**First publish only:**
```bash
# Set your npm token, then run the bootstrap moon task
NPM_TOKEN=npm_xxx moon run root:bootstrap-npm

# Or if already logged in via `npm login`:
moon run root:bootstrap-npm
```

Then configure Trusted Publishing on [npmjs.com](https://www.npmjs.com) for each package:
- **Organization:** `nogoo9`
- **Repository:** `gitleaks`
- **Workflow:** `publish.yml`
- **Environment:** `npm`

After setup, delete the npm token — all future publishes use OIDC.

---

## PyPI Setup (No Bootstrap Required)

PyPI supports **pending trusted publishers** — you can configure OIDC before the first publish:

1. Go to https://pypi.org/manage/account/publishing/
2. Add a new publisher:
   - **Package name:** `nogoo9-gitleaks`
   - **Owner:** `nogoo9`
   - **Repository:** `gitleaks`
   - **Workflow:** `publish.yml`
   - **Environment:** `pypi`
3. Create a `pypi` environment in the GitHub repo settings (no secrets needed).

The first automated publish will create the package on PyPI directly via OIDC.
