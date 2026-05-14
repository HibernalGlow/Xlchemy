import os
import json
import logging
from typing import Optional

from data.constants import CONFIG_LOCATION

PRESETS_DIR = os.path.join(CONFIG_LOCATION, "presets")

class PresetManager:
    def __init__(self):
        self._ensureDir()

    def _ensureDir(self):
        try:
            os.makedirs(PRESETS_DIR, exist_ok=True)
        except OSError as err:
            logging.error(f"[PresetManager] Cannot create presets directory: {err}")

    def listPresets(self) -> list[str]:
        try:
            files = os.listdir(PRESETS_DIR)
            return sorted(f[:-5] for f in files if f.endswith(".json"))
        except OSError as err:
            logging.error(f"[PresetManager] Cannot list presets: {err}")
            return []

    def save(self, name: str, data: dict) -> bool:
        path = os.path.join(PRESETS_DIR, f"{name}.json")
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4, ensure_ascii=False)
            return True
        except OSError as err:
            logging.error(f"[PresetManager] Cannot save preset '{name}': {err}")
            return False

    def load(self, name: str) -> Optional[dict]:
        path = os.path.join(PRESETS_DIR, f"{name}.json")
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (OSError, json.JSONDecodeError) as err:
            logging.error(f"[PresetManager] Cannot load preset '{name}': {err}")
            return None

    def delete(self, name: str) -> bool:
        path = os.path.join(PRESETS_DIR, f"{name}.json")
        try:
            if os.path.isfile(path):
                os.remove(path)
            return True
        except OSError as err:
            logging.error(f"[PresetManager] Cannot delete preset '{name}': {err}")
            return False

    def exists(self, name: str) -> bool:
        return os.path.isfile(os.path.join(PRESETS_DIR, f"{name}.json"))
