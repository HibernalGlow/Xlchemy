from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from threading import RLock
from typing import Any

from data.constants import CONFIG_LOCATION


def _normalize_snapshot_payload(payload: dict[str, Any]) -> dict[str, Any]:
    domain = payload.get("domain")
    if isinstance(domain, dict):
        return payload

    normalized = {
        "domain": {
            "output": payload.get("output"),
            "modify": payload.get("modify"),
            "app": payload.get("app"),
        }
    }

    for key, value in payload.items():
        if key in {"output", "modify", "app"}:
            continue
        normalized[key] = value

    return normalized


class SnapshotStore:
    def __init__(self, config_root: str | Path | None = None) -> None:
        self._lock = RLock()
        self._config_root = Path(config_root or CONFIG_LOCATION)
        self._snapshot_path = self._config_root / "app-state.json"
        self._presets_dir = self._config_root / "presets"
        self._default_preset_path = self._config_root / "default_preset.json"

    def _ensure_dirs(self) -> None:
        self._config_root.mkdir(parents=True, exist_ok=True)
        self._presets_dir.mkdir(parents=True, exist_ok=True)

    def _write_json_atomic(self, path: Path, payload: Any) -> None:
        self._ensure_dirs()
        serialized = json.dumps(payload, indent=2, ensure_ascii=False)
        fd, temp_path = tempfile.mkstemp(
            prefix=f"{path.name}.tmp-",
            suffix=".json",
            dir=str(path.parent),
            text=True,
        )
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                handle.write(serialized)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temp_path, path)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def load_snapshot(self) -> dict[str, Any]:
        with self._lock:
            if not self._snapshot_path.is_file():
                return {}

            with self._snapshot_path.open("r", encoding="utf-8") as handle:
                payload = json.load(handle)

            if isinstance(payload, dict):
                return _normalize_snapshot_payload(payload)

            return {}

    def save_snapshot(self, snapshot: dict[str, Any]) -> None:
        with self._lock:
            normalized = _normalize_snapshot_payload(snapshot)
            self._write_json_atomic(self._snapshot_path, normalized)

    def list_presets(self) -> list[str]:
        with self._lock:
            if not self._presets_dir.is_dir():
                return []

            names = []
            for path in self._presets_dir.glob("*.json"):
                names.append(path.stem)
            return sorted(names, key=str.casefold)

    def save_preset(self, name: str, payload: dict[str, Any]) -> None:
        with self._lock:
            self._write_json_atomic(self._presets_dir / f"{name}.json", payload)

    def load_preset(self, name: str) -> dict[str, Any]:
        with self._lock:
            path = self._presets_dir / f"{name}.json"
            if not path.is_file():
                return {}

            with path.open("r", encoding="utf-8") as handle:
                payload = json.load(handle)

            return payload if isinstance(payload, dict) else {}

    def delete_preset(self, name: str) -> None:
        with self._lock:
            path = self._presets_dir / f"{name}.json"
            if path.is_file():
                path.unlink()

            if self.get_default_preset() == name and self._default_preset_path.is_file():
                self._default_preset_path.unlink()

    def set_default_preset(self, name: str | None) -> None:
        with self._lock:
            if not name:
                if self._default_preset_path.is_file():
                    self._default_preset_path.unlink()
                return

            self._write_json_atomic(self._default_preset_path, {"name": name})

    def get_default_preset(self) -> str | None:
        with self._lock:
            if not self._default_preset_path.is_file():
                return None

            with self._default_preset_path.open("r", encoding="utf-8") as handle:
                payload = json.load(handle)

            name = payload.get("name") if isinstance(payload, dict) else None
            if isinstance(name, str) and name and (self._presets_dir / f"{name}.json").is_file():
                return name
            return None
