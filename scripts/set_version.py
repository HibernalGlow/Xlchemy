#!/usr/bin/env python3
"""Update version number across all project files.

Covers Go, Python, Rust, frontend (npm), and Windows resource files
in both build/ and build_wails/ directories.

Usage:
    python scripts/set_version.py 1.2.8
    python scripts/set_version.py 1.2.8 --dry-run
    python scripts/set_version.py 1.2.8 --constants-only
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

# Project root = parent of scripts/
ROOT = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Individual updaters
# ---------------------------------------------------------------------------

def _update_go_constants(version: str, dry: bool) -> None:
    """Update `const Version = "X.Y.Z"` in constants.go."""
    p = ROOT / "constants.go"
    text = p.read_text(encoding="utf-8")
    new = re.sub(
        r'(const\s+Version\s*=\s*)"[^"]+"',
        rf'\1"{version}"',
        text,
    )
    if not dry:
        p.write_text(new, encoding="utf-8")
    print(f"  [go]   constants.go → {version}")


def _update_constants_py(version: str, dry: bool) -> None:
    """Update VERSION in data/constants.py."""
    p = ROOT / "data" / "constants.py"
    text = p.read_text(encoding="utf-8")
    new = re.sub(r'VERSION\s*=\s*"[^"]+"', f'VERSION = "{version}"', text)
    if not dry:
        p.write_text(new, encoding="utf-8")
    print(f"  [py]   data/constants.py → {version}")


def _update_pyproject(version: str, dry: bool) -> None:
    """Update version in pyproject.toml."""
    p = ROOT / "pyproject.toml"
    if not p.exists():
        return
    text = p.read_text(encoding="utf-8")
    new = re.sub(
        r'^version\s*=\s*"[^"]+"',
        f'version = "{version}"',
        text,
        flags=re.MULTILINE,
    )
    if not dry:
        p.write_text(new, encoding="utf-8")
    print(f"  [py]   pyproject.toml → {version}")


def _update_rust_cargo(version: str, dry: bool) -> None:
    """Update version in rust_bindings/Cargo.toml."""
    p = ROOT / "rust_bindings" / "Cargo.toml"
    if not p.exists():
        return
    text = p.read_text(encoding="utf-8")
    new = re.sub(
        r'^version\s*=\s*"[^"]+"',
        f'version = "{version}"',
        text,
        flags=re.MULTILINE,
    )
    if not dry:
        p.write_text(new, encoding="utf-8")
    print(f"  [rs]   rust_bindings/Cargo.toml → {version}")


def _update_package_json(version: str, dry: bool) -> None:
    """Update version in frontend/package.json."""
    p = ROOT / "frontend" / "package.json"
    if not p.exists():
        return
    data = json.loads(p.read_text(encoding="utf-8"))
    data["version"] = version
    if not dry:
        p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"  [npm]  frontend/package.json → {version}")


def _update_windows_info(info_path: Path, version: str, dry: bool) -> None:
    """Update file_version and ProductVersion in a Windows info.json."""
    if not info_path.exists():
        return
    data = json.loads(info_path.read_text(encoding="utf-8"))
    if "fixed" in data:
        data["fixed"]["file_version"] = version
    for block in data.get("info", {}).values():
        if "ProductVersion" in block:
            block["ProductVersion"] = version
    if not dry:
        info_path.write_text(json.dumps(data, indent="\t", ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"  [win]  {info_path.relative_to(ROOT)} → {version}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

ALL_UPDATERS = [
    _update_go_constants,
    _update_constants_py,
    _update_pyproject,
    _update_rust_cargo,
    _update_package_json,
]

WINDOWS_INFO_PATHS = [
    "build/windows/info.json",
    "build_wails/windows/info.json",
]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Update version number across all project files."
    )
    parser.add_argument("version", help="Version number (e.g., 1.2.8)")
    parser.add_argument(
        "--constants-only",
        action="store_true",
        help="Only update constants.go and data/constants.py",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would change without writing files",
    )
    args = parser.parse_args()

    version: str = args.version.lstrip("v")
    if not re.match(r"^\d+\.\d+\.\d+$", version):
        print(f"Error: Invalid version format '{version}'. Expected format: X.Y.Z")
        sys.exit(1)

    label = "[DRY RUN] " if args.dry_run else ""
    print(f"{label}Setting version to {version} ...\n")

    if args.constants_only:
        _update_go_constants(version, args.dry_run)
        _update_constants_py(version, args.dry_run)
    else:
        for updater in ALL_UPDATERS:
            updater(version, args.dry_run)
        for rel in WINDOWS_INFO_PATHS:
            _update_windows_info(ROOT / rel, version, args.dry_run)

    print(f"\n{label}Version updated to {version}")


if __name__ == "__main__":
    main()
