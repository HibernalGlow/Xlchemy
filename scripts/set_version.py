#!/usr/bin/env python3
"""Update version number in all relevant files."""

import re
import sys
from pathlib import Path


def update_constants_py(version: str) -> None:
    """Update VERSION in data/constants.py."""
    file_path = Path("data/constants.py")
    content = file_path.read_text(encoding="utf-8")
    new_content = re.sub(
        r'VERSION\s*=\s*"[^"]+"',
        f'VERSION = "{version}"',
        content
    )
    file_path.write_text(new_content, encoding="utf-8")
    print(f"Updated VERSION to {version} in data/constants.py")


def update_pyproject_toml(version: str) -> None:
    """Update version in pyproject.toml."""
    file_path = Path("pyproject.toml")
    if not file_path.exists():
        return
    content = file_path.read_text(encoding="utf-8")
    new_content = re.sub(
        r'^version\s*=\s*"[^"]+"',
        f'version = "{version}"',
        content,
        flags=re.MULTILINE
    )
    file_path.write_text(new_content, encoding="utf-8")
    print(f"Updated version to {version} in pyproject.toml")


def update_rust_cargo_toml(version: str) -> None:
    """Update version in rust_bindings/Cargo.toml."""
    file_path = Path("rust_bindings/Cargo.toml")
    if not file_path.exists():
        return
    content = file_path.read_text(encoding="utf-8")
    new_content = re.sub(
        r'^version\s*=\s*"[^"]+"',
        f'version = "{version}"',
        content,
        flags=re.MULTILINE
    )
    file_path.write_text(new_content, encoding="utf-8")
    print(f"Updated version to {version} in rust_bindings/Cargo.toml")


def main():
    if len(sys.argv) != 2:
        print("Usage: python scripts/set_version.py <version>")
        print("Example: python scripts/set_version.py 1.2.4")
        sys.exit(1)

    version = sys.argv[1].lstrip("v")

    if not re.match(r"^\d+\.\d+\.\d+$", version):
        print(f"Error: Invalid version format '{version}'. Expected format: X.Y.Z")
        sys.exit(1)

    print(f"Setting version to {version}...")

    update_constants_py(version)
    update_pyproject_toml(version)
    update_rust_cargo_toml(version)

    print(f"\nVersion updated to {version}")
    print("Don't forget to commit these changes!")


if __name__ == "__main__":
    main()
