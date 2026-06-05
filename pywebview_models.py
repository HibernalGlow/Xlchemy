from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from data.constants import ALLOWED_INPUT


def is_allowed_input(ext: str) -> bool:
    return ext.lower() in ALLOWED_INPUT


def file_item_from_path(path: str | Path, anchor_path: str | Path | None = None) -> dict[str, Any] | None:
    candidate = Path(path)
    if not candidate.is_file():
        return None

    ext = candidate.suffix[1:].lower()
    if not is_allowed_input(ext):
        return None

    stat = candidate.stat()
    anchor = Path(anchor_path) if anchor_path else candidate.parent

    return {
        "absPath": str(candidate),
        "name": candidate.stem,
        "ext": ext,
        "dir": str(candidate.parent),
        "size": stat.st_size,
        "anchorPath": str(anchor),
    }


def scan_directory_items(directory: str | Path) -> list[dict[str, Any]]:
    root = Path(directory)
    if not root.is_dir():
        return []

    items: list[dict[str, Any]] = []
    for path in root.rglob("*"):
        item = file_item_from_path(path, anchor_path=root)
        if item is not None:
            items.append(item)
    return items


def stat_paths(paths: list[str]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    seen: set[str] = set()

    for raw_path in paths:
        path = Path(raw_path)
        if path.is_dir():
            for item in scan_directory_items(path):
                abs_path = item["absPath"]
                if abs_path in seen:
                    continue
                seen.add(abs_path)
                items.append(item)
            continue

        item = file_item_from_path(path)
        if item is None:
            continue
        abs_path = item["absPath"]
        if abs_path in seen:
            continue
        seen.add(abs_path)
        items.append(item)

    return items


@dataclass(slots=True)
class PlannedItem:
    abs_path: Path
    anchor_path: Path

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> "PlannedItem":
        abs_path = Path(str(payload.get("absPath") or payload.get("abs_path") or ""))
        anchor = payload.get("anchorPath") or payload.get("anchor_path") or abs_path.parent
        return cls(abs_path=abs_path, anchor_path=Path(str(anchor)))
