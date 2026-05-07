"""Custom build hook for nogoo9-gitleaks platform wheels.

When the environment variable WHEEL_PLATFORM_TAG is set (e.g. to
"manylinux_2_17_x86_64.manylinux2014_x86_64"), this hook overrides the wheel
filename tag to ``py3-none-<WHEEL_PLATFORM_TAG>``, producing a platform-specific
wheel that bundles the pre-built gitleaks binary.

When WHEEL_PLATFORM_TAG is unset, the default ``py3-none-any`` tag is used,
producing a fallback wheel that downloads the binary on first use.

The binary is included via ``artifacts`` in ``pyproject.toml``, so this hook
only needs to override the tag — no ``force_include`` needed.
"""

from __future__ import annotations

import os

from hatchling.builders.hooks.plugin.interface import BuildHookInterface


class PlatformWheelHook(BuildHookInterface):
    PLUGIN_NAME = "platform-wheel"

    def initialize(self, version: str, build_data: dict) -> None:
        if self.target_name != "wheel":
            return

        tag = os.environ.get("WHEEL_PLATFORM_TAG", "")
        if tag:
            build_data["tag"] = f"py3-none-{tag}"
