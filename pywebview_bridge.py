from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

import webview
from webview.dom import DOMEventHandler

from data.constants import (
    ALLOWED_INPUT,
    ALLOWED_INPUT_FILTERS,
    ALLOWED_RESAMPLING,
    JPEG_ALIASES,
    UPDATE_CHECKER_ENABLED,
    VERSION,
)
from pywebview_conversion_runner import PywebviewConversionRunner
from pywebview_models import scan_directory_items, stat_paths
from pywebview_state_store import SnapshotStore

logger = logging.getLogger(__name__)


def _image_file_patterns() -> tuple[str, ...]:
    values = sorted({f"*.{ext}" for ext in ALLOWED_INPUT}, key=str.casefold)
    return ("Images (" + ";".join(values) + ")",)


class PywebviewBridge:
    def __init__(self, app_root: str | Path) -> None:
        self._app_root = Path(app_root)
        self._window: webview.Window | None = None
        self._store = SnapshotStore()
        self._runner = PywebviewConversionRunner(self.dispatch_event)

    def attach_window(self, window: webview.Window) -> None:
        self._window = window

    def get_constants(self) -> dict[str, Any]:
        return {
            "version": VERSION,
            "allowedInput": list(ALLOWED_INPUT),
            "allowedResampling": list(ALLOWED_RESAMPLING),
            "allowedInputFilters": list(ALLOWED_INPUT_FILTERS),
            "jpegAliases": list(JPEG_ALIASES),
            "cpuCount": os.cpu_count() or 4,
            "updateCheckerEnabled": UPDATE_CHECKER_ENABLED,
        }

    def pick_files(self) -> list[str]:
        window = self._require_window()
        selected = window.create_file_dialog(
            webview.OPEN_DIALOG,
            allow_multiple=True,
            file_types=_image_file_patterns(),
        )
        return list(selected or [])

    def pick_directory(self) -> str | None:
        window = self._require_window()
        selected = window.create_file_dialog(webview.FOLDER_DIALOG)
        if not selected:
            return None
        return str(selected[0])

    def stat_files(self, paths: list[str]) -> list[dict[str, Any]]:
        if not isinstance(paths, list):
            return []
        return stat_paths([str(path) for path in paths])

    def scan_directory(self, dir_path: str) -> list[dict[str, Any]]:
        if not dir_path:
            return []
        return scan_directory_items(dir_path)

    def run_conversion_plan(self, plan: dict[str, Any]) -> None:
        if not isinstance(plan, dict):
            raise RuntimeError("Execution plan must be an object")
        self._runner.start(plan)

    def cancel_run(self, _run_id: str) -> None:
        self._runner.cancel()

    def load_app_state(self) -> dict[str, Any]:
        return self._store.load_snapshot()

    def save_app_state(self, snapshot: dict[str, Any]) -> None:
        if not isinstance(snapshot, dict):
            raise RuntimeError("Snapshot payload must be an object")
        self._store.save_snapshot(snapshot)

    def list_presets(self) -> list[str]:
        return self._store.list_presets()

    def save_preset(self, name: str, snapshot: dict[str, Any]) -> None:
        if not isinstance(name, str) or not name.strip():
            raise RuntimeError("Preset name is required")

        if not isinstance(snapshot, dict):
            raise RuntimeError("Preset snapshot must be an object")

        domain = snapshot.get("domain")
        if isinstance(domain, dict):
            payload = {
                "output": domain.get("output", {}),
                "modify": domain.get("modify", {}),
                "settings": domain.get("app", {}),
            }
        else:
            payload = snapshot

        self._store.save_preset(name.strip(), payload)

    def load_preset(self, name: str) -> dict[str, Any]:
        payload = self._store.load_preset(name)
        if not payload:
            return {}

        if "domain" in payload:
            return payload

        return {
            "domain": {
                "output": payload.get("output", {}),
                "modify": payload.get("modify", {}),
                "app": payload.get("settings", payload.get("app", {})),
            }
        }

    def delete_preset(self, name: str) -> None:
        self._store.delete_preset(name)

    def dispatch_event(self, payload: dict[str, Any]) -> None:
        if self._window is None:
            return

        script = f"""
        if (window.__XLCHMY_DISPATCH_EVENT__) {{
          window.__XLCHMY_DISPATCH_EVENT__({json.dumps(payload, ensure_ascii=False)});
        }}
        """
        try:
            self._window.evaluate_js(script)
        except Exception as exc:
            logger.debug("dispatch_event evaluate_js failed: %s", exc)

    def install_dom_bridges(self) -> None:
        window = self._require_window()
        drop_target = window.dom.get_element("[data-file-drop-target]")
        if drop_target is None:
            logger.warning("Drop target not found; pywebview native drop bridge disabled")
            return

        drop_target.on(
            "drop",
            DOMEventHandler(self._on_native_drop, prevent_default=True, stop_propagation=True),
        )
        drop_target.on(
            "dragover",
            DOMEventHandler(lambda _event: None, prevent_default=True, stop_propagation=True),
        )

    def _on_native_drop(self, event: dict[str, Any]) -> None:
        data_transfer = event.get("dataTransfer") if isinstance(event, dict) else None
        files = data_transfer.get("files", []) if isinstance(data_transfer, dict) else []
        paths: list[str] = []

        for file in files:
            if not isinstance(file, dict):
                continue
            full_path = file.get("pywebviewFullPath")
            if isinstance(full_path, str) and full_path:
                paths.append(full_path)

        if paths:
            self.dispatch_event({
                "type": "files_dropped",
                "paths": paths,
            })

    def _require_window(self) -> webview.Window:
        if self._window is None:
            raise RuntimeError("pywebview window is not attached")
        return self._window


class PywebviewApi:
    __slots__ = ("_bridge",)

    def __init__(self, bridge: PywebviewBridge) -> None:
        self._bridge = bridge

    def get_constants(self) -> dict[str, Any]:
        return self._bridge.get_constants()

    def pick_files(self) -> list[str]:
        return self._bridge.pick_files()

    def pick_directory(self) -> str | None:
        return self._bridge.pick_directory()

    def stat_files(self, paths: list[str]) -> list[dict[str, Any]]:
        return self._bridge.stat_files(paths)

    def scan_directory(self, dir_path: str) -> list[dict[str, Any]]:
        return self._bridge.scan_directory(dir_path)

    def run_conversion_plan(self, plan: dict[str, Any]) -> None:
        self._bridge.run_conversion_plan(plan)

    def cancel_run(self, run_id: str) -> None:
        self._bridge.cancel_run(run_id)

    def load_app_state(self) -> dict[str, Any]:
        return self._bridge.load_app_state()

    def save_app_state(self, snapshot: dict[str, Any]) -> None:
        self._bridge.save_app_state(snapshot)

    def list_presets(self) -> list[str]:
        return self._bridge.list_presets()

    def save_preset(self, name: str, snapshot: dict[str, Any]) -> None:
        self._bridge.save_preset(name, snapshot)

    def load_preset(self, name: str) -> dict[str, Any]:
        return self._bridge.load_preset(name)

    def delete_preset(self, name: str) -> None:
        self._bridge.delete_preset(name)


def frontend_entry_url(app_root: str | Path) -> str:
    app_root = Path(app_root)
    dist_index = app_root / "frontend" / "dist" / "index.html"
    if not dist_index.is_file():
        raise FileNotFoundError(
            f"Frontend build not found: {dist_index}. Run `npm run build` in Xlchemy/frontend first."
        )
    return str(dist_index)
