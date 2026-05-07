# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versions track the upstream [gitleaks](https://github.com/gitleaks/gitleaks) release they wrap.

---

## [8.30.1-post.2] — 2026-05-08

### Added
- **npm**: `README.md` added to all 10 packages (`@nogoo9/gitleaks` + 9 platform sub-packages) and explicitly listed in `files`
- **npm/CI**: preflight checks before every `npm publish` — verifies binary exists and `README.md` is present; aborts with clear error if either is missing
- **PyPI**: platform-specific wheels that bundle the gitleaks binary (no internet access needed after install):
  - `manylinux_2_17_x86_64` (Linux x64)
  - `manylinux_2_17_aarch64` (Linux arm64)
  - `macosx_11_0_arm64` (macOS Apple Silicon)
  - `macosx_10_9_x86_64` (macOS Intel)
  - `win_amd64` (Windows x64)
  - `py3-none-any` fallback wheel (downloads on first use for other platforms)
- **PyPI/CI**: preflight step after `uv build` — verifies `.whl` + `.tar.gz` exist, wheel contains `.py` files and README-embedded METADATA, sdist contains `README.md`
- **PyPI/CI**: matrix build job (`build-pypi-wheels`) produces all 6 wheels, uploads as artifacts, then a single `publish-pypi` job uploads them all to PyPI via OIDC Trusted Publishing
- `hatch_build.py`: custom hatchling build hook — reads `WHEEL_PLATFORM_TAG` env var and overrides wheel filename tag for platform-specific builds

### Fixed
- **npm**: all `npm publish` commands now include `--tag latest`, required by npm when publishing pre-release version strings (e.g. `8.30.1-post.2`)
- **PyPI binary resolution**: `_downloader.py` now uses 3-tier lookup — (1) `NOGOO9_GITLEAKS_BIN` env var, (2) bundled binary from platform wheel via `importlib.resources`, (3) download + cache fallback
- **build-npm-pkgs.mjs**: removed unused dead imports (`tar`, `stream`, `zlib`) that caused `SyntaxError` in Bun

---

## [8.30.1] — 2026-03-21

### Added
- Initial release wrapping upstream gitleaks v8.30.1
- npm: `@nogoo9/gitleaks` + 9 platform sub-packages
- PyPI: `nogoo9-gitleaks` with download-on-first-use binary management
- CI: daily upstream polling, OIDC keyless publishing for both registries

### Upstream changes
See [gitleaks v8.30.1 release notes](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1).
