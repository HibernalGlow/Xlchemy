import csv
import json
import os
import logging
import platform
import subprocess
import sys
from pathlib import Path
from typing import Any

import requests
import webview

from PySide6.QtCore import QThreadPool

from core.controller import Controller
from data.constants import (
    VERSION,
    CONFIG_LOCATION,
    ALLOWED_INPUT,
    LOGS_DIR,
    LICENSE_PATH,
    LICENSE_3RD_PARTY_PATH,
    UPDATE_CHECKER_VER_FILE_URL,
)
from data.config_manager import ConfigManager
from data.logging_manager import LoggingManager
from core.update_checker import UpdateInfo, isNewerVersionAvailable

logger = logging.getLogger(__name__)

DEFAULT_EXCLUDED_FORMATS = ['avif', 'jxl', 'webp', 'gif']
SETTINGS_PATH = os.path.join(CONFIG_LOCATION, 'web_settings.json')

DEFAULT_RAM_OPTIMIZER_RULES = '("all", 3.5, "7/8"), ("all", 4.5, "6/8"), ("all", 5.5, "5/8"), ("all", 6.5, "4/8"), ("all", 7.5, "3/8"), ("all", 8.5, "2/8"), ("all", 9.5, "1/8"), ("all", 10.5, "1")'

DEFAULT_EXIFTOOL_ARGS = {
    'ExifTool - Wipe': '-m -all= -tagsFromFile @ -icc_profile:all -ColorSpace:all -Orientation $dst -overwrite_original',
    'ExifTool - Preserve': '-m -tagsFromFile $src $dst -overwrite_original',
    'ExifTool - Unsafe Wipe': '-m -all= $dst -overwrite_original',
    'ExifTool - Custom': '',
}


def _deep_merge(base: dict, updates: dict) -> dict:
    merged = dict(base)
    for key, val in updates.items():
        if isinstance(val, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge(merged[key], val)
        else:
            merged[key] = val
    return merged


def _safe_read_json(path: str) -> dict:
    if not os.path.isfile(path):
        return {}
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except Exception as err:
        logger.warning(f'Failed to read settings file: {err}')
        return {}


def _safe_write_json(path: str, payload: dict) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(payload, f, indent=2)


def _default_settings(max_threads: int) -> dict:
    thread_default = max(max_threads - 1, 1)
    return {
        'input': {
            'excluded_formats': list(DEFAULT_EXCLUDED_FORMATS),
            'sort_order': 'Original',
        },
        'output': {
            'format': 'JPEG XL',
            'quality': 80,
            'lossless': False,
            'max_compression': False,
            'effort': 7,
            'intelligent_effort': False,
            'jxl_modular': False,
            'jxl_verify': False,
            'jxl_normalize_enable': False,
            'jxl_normalize_when': 'On Fail',
            'aom_av1_chroma_subsampling': 'Default',
            'jpegli_chroma_subsampling': 'Default',
            'jpg_chroma_subsampling': 'Default',
            'if_file_exists': 'Rename',
            'custom_output_dir': False,
            'custom_output_dir_path': '',
            'keep_dir_struct': False,
            'delete_original': False,
            'delete_original_mode': 'To Trash',
            'smallest_format_pool': {
                'png': True,
                'webp': True,
                'jxl': True,
            },
            'jxl_png_fallback': False,
            'thread_count': thread_default,
            'clear_after_conv': False,
        },
        'modify': {
            'downscaling': {
                'enabled': False,
                'mode': 'Resolution',
                'percent': 80,
                'width': 2000,
                'height': 2000,
                'file_size': 300,
                'shortest_side': 1080,
                'longest_side': 1920,
                'megapixels': 2.1,
                'resample': 'Default',
            },
            'misc': {
                'keep_metadata': 'Encoder - Wipe',
                'keep_timestamps': False,
            },
        },
        'settings': {
            'custom_resampling': False,
            'sorting_disabled': False,
            'disable_downscaling_startup': True,
            'disable_delete_startup': True,
            'enable_jxl_effort_10': False,
            'disable_progressive_jpegli': False,
            'enable_custom_args': False,
            'cjxl_args': '',
            'avifenc_args': '',
            'cjpegli_args': '',
            'im_args': '',
            'enable_quality_precision_snapping': False,
            'jpg_encoder': 'JPEGLI',
            'jxl_auto_lossless_jpeg': False,
            'ram_optimizer': 'Dynamic',
            'ram_optimizer_rules': DEFAULT_RAM_OPTIMIZER_RULES,
            'jxl_lossy_modular': False,
            'jxl_int_effort': False,
            'play_sound_on_finish': False,
            'play_sound_on_finish_vol': 0.6,
            'keep_if_larger': False,
            'copy_if_larger': False,
            'exiftool_args': dict(DEFAULT_EXIFTOOL_ARGS),
            'avif_encoder': 'AOM AV1',
            'avif_bit_depth': 'Auto',
            'avif_aom_iq_tune': False,
            'processing_order': 'Original',
        },
    }


def _normalize_settings(payload: dict, max_threads: int) -> dict:
    defaults = _default_settings(max_threads)
    merged = _deep_merge(defaults, payload or {})
    return merged


def _open_path(path: str) -> tuple[bool, str]:
    try:
        if platform.system() == 'Windows':
            os.startfile(path)
        elif platform.system() == 'Darwin':
            subprocess.run(['open', path], check=False)
        else:
            subprocess.run(['xdg-open', path], check=False)
        return True, ''
    except Exception as err:
        return False, str(err)


class API:
    def __init__(self):
        self._window = None
        self._controller = None
        self._files: list[dict] = []
        self._max_threads = os.cpu_count() or 1
        self._settings_payload = _normalize_settings(_safe_read_json(SETTINGS_PATH), self._max_threads)
        self._logging = LoggingManager()

    def set_window(self, window):
        self._window = window

    def set_controller(self, controller: Controller):
        self._controller = controller
        self._controller.update_progress_line1.connect(self._on_progress_line1)
        self._controller.update_progress_line2.connect(self._on_progress_line2)
        self._controller.update_progress_value.connect(self._on_progress_value)
        self._controller.processing_started.connect(self._on_processing_started)
        self._controller.processing_finished.connect(self._on_processing_finished)
        self._controller.exception.connect(self._on_exception)

    def _emit(self, event: str, data: Any = None):
        if self._window:
            payload = json.dumps(data) if data is not None else 'null'
            self._window.evaluate_js(f'window.__xlchemy_emit("{event}", {payload})')

    def _on_progress_line1(self, text: str):
        self._emit('progress', {'line1': text})

    def _on_progress_line2(self, text: str):
        self._emit('progress', {'line2': text})

    def _on_progress_value(self, value: int):
        self._emit('progress', {'value': value})

    def _on_processing_started(self):
        self._emit('processing_started')

    def _on_processing_finished(self):
        self._emit('processing_finished')

    def _on_exception(self, title: str, description: str, path: str):
        self._emit('exception', {'title': title, 'description': description, 'path': path})

    def getVersion(self) -> str:
        return VERSION

    def getSettings(self) -> dict:
        payload = self._settings_payload
        return {
            'version': VERSION,
            'config_location': CONFIG_LOCATION,
            'allowed_input': list(ALLOWED_INPUT),
            'max_threads': self._max_threads,
            'license_path': LICENSE_PATH,
            'license_3rd_party_path': LICENSE_3RD_PARTY_PATH,
            'input': payload['input'],
            'output': payload['output'],
            'modify': payload['modify'],
            'settings': payload['settings'],
            'logging_enabled': self._logging.isLoggingToFile(),
        }

    def saveSettings(self, payload: dict):
        normalized = _normalize_settings(payload, self._max_threads)
        self._settings_payload = normalized
        output = dict(normalized)
        output['version'] = VERSION
        _safe_write_json(SETTINGS_PATH, output)

    def addFiles(self, paths: list, excluded_formats: list | None = None) -> int:
        excluded = set(x.lower() for x in (excluded_formats or self._settings_payload['input'].get('excluded_formats', [])))
        count = 0
        for path in paths:
            if os.path.isfile(path):
                ext = os.path.splitext(path)[1].lstrip('.').lower()
                if ext in ALLOWED_INPUT and ext not in excluded:
                    name = os.path.basename(path)
                    size = os.path.getsize(path)
                    self._files.append({
                        'path': path,
                        'anchor_path': os.path.dirname(path),
                        'name': name,
                        'size': size,
                        'format': ext,
                    })
                    count += 1
            elif os.path.isdir(path):
                anchor_root = path
                for root, _, filenames in os.walk(path):
                    for filename in filenames:
                        ext = os.path.splitext(filename)[1].lstrip('.').lower()
                        if ext in ALLOWED_INPUT and ext not in excluded:
                            filepath = os.path.join(root, filename)
                            size = os.path.getsize(filepath)
                            self._files.append({
                                'path': filepath,
                                'anchor_path': anchor_root,
                                'name': filename,
                                'size': size,
                                'format': ext,
                            })
                            count += 1
        return count

    def removeFiles(self, indices: list):
        for i in sorted(indices, reverse=True):
            if 0 <= i < len(self._files):
                self._files.pop(i)

    def clearFiles(self):
        self._files.clear()

    def getFiles(self) -> list:
        return self._files

    def startConversion(self, output_settings: dict, modify_settings: dict, settings_tab_settings: dict, thread_count: int):
        if not self._controller:
            return

        # Normalize settings from UI
        down = modify_settings.get('downscaling', {})
        if down.get('mode') == 'Resolution':
            if not isinstance(down.get('width'), (int, float)) or down.get('width', 0) <= 0:
                down['width'] = float('inf')
            if not isinstance(down.get('height'), (int, float)) or down.get('height', 0) <= 0:
                down['height'] = float('inf')
        modify_settings['downscaling'] = down

        if 'misc' not in modify_settings:
            modify_settings['misc'] = {'keep_metadata': 'Encoder - Wipe', 'keep_timestamps': False}

        if settings_tab_settings.get('play_sound_on_finish_vol', 0) > 1:
            settings_tab_settings['play_sound_on_finish_vol'] = round(settings_tab_settings['play_sound_on_finish_vol'] / 100, 2)

        if 'smallest_format_pool' not in output_settings:
            output_settings['smallest_format_pool'] = {
                'png': True,
                'webp': True,
                'jxl': True,
            }

        items = [(Path(f['path']), Path(f['anchor_path'])) for f in self._files]
        self._controller.items.clear()
        self._controller.items.parseData(settings_tab_settings.get('processing_order', 'Sequential'), *items)

        self._controller.startProcessing(
            output_settings,
            modify_settings,
            settings_tab_settings,
            thread_count,
        )

    def cancelConversion(self):
        if self._controller:
            self._controller.cancel()

    def checkRequirements(self, output_settings: dict, modify_settings: dict, settings_tab_settings: dict) -> dict:
        if not self._controller:
            return {'allowed_to_proceed': False, 'display_error': True, 'error_title': 'Error', 'error_description': 'Controller not initialized'}

        sm_pool = output_settings.get('smallest_format_pool', {})
        if isinstance(sm_pool, dict):
            sm_is_format_pool_empty = not any(bool(v) for v in sm_pool.values())
        else:
            sm_is_format_pool_empty = not bool(output_settings.get('sm_format_pool', []))

        check = self._controller.checkProcessingRequirements(
            len(self._files),
            sm_is_format_pool_empty,
            output_settings,
            modify_settings,
            settings_tab_settings,
        )
        return {
            'allowed_to_proceed': check.allowed_to_proceed,
            'display_error': check.display_error,
            'error_title': check.error_title,
            'error_description': check.error_description,
        }

    def checkForUpdates(self) -> dict:
        try:
            response = requests.get(UPDATE_CHECKER_VER_FILE_URL, timeout=5)
            if response.status_code != 200:
                return {'ok': False, 'error': f'HTTP {response.status_code}'}
            info = UpdateInfo.fromJson(response.json())
            return {
                'ok': True,
                'is_newer': isNewerVersionAvailable(info.latest_version),
                'latest_version': info.latest_version,
                'download_url': info.download_url,
                'message': info.message,
                'message_url': info.message_url,
            }
        except Exception as err:
            return {'ok': False, 'error': str(err)}

    def toggleLogging(self) -> dict:
        if self._logging.isLoggingToFile():
            self._logging.stopLoggingToFile()
        else:
            self._logging.startLoggingToFile('INFO')
        return {'enabled': self._logging.isLoggingToFile()}

    def openLogsDir(self) -> dict:
        if not os.path.isdir(LOGS_DIR):
            return {'ok': False, 'message': 'No logs have been found.'}
        ok, err = _open_path(LOGS_DIR)
        return {'ok': ok, 'message': err or None}

    def wipeLogsDir(self) -> dict:
        msg = self._logging.wipeLogsDir()
        return {'ok': True, 'message': msg}

    def saveExceptions(self, items: list) -> dict:
        if not self._window:
            return {'ok': False, 'message': 'No window available'}

        if not items:
            return {'ok': False, 'message': 'Exception list is empty'}

        result = self._window.create_file_dialog(
            webview.SAVE_DIALOG,
            save_filename='xlchemy_exceptions.csv',
            file_types=('CSV (*.csv)',),
        )

        if not result:
            return {'ok': False, 'message': 'Save canceled'}

        path = result if isinstance(result, str) else result[0]
        rows = [
            ('Version', VERSION),
            ('OS', platform.system()),
            ('Exceptions',),
            ('ID', 'Exception', 'Filename'),
        ]

        for idx, item in enumerate(items, start=1):
            rows.append((str(idx), item.get('description', ''), item.get('path', '')))

        try:
            with open(path, 'w', newline='', encoding='utf-8') as csv_file:
                writer = csv.writer(csv_file, quoting=csv.QUOTE_MINIMAL)
                writer.writerows(rows)
            return {'ok': True}
        except OSError as err:
            return {'ok': False, 'message': str(err)}

    def openPath(self, path: str) -> dict:
        ok, err = _open_path(path)
        return {'ok': ok, 'message': err or None}

    def openFileDialog(self) -> list | None:
        if not self._window:
            return None
        result = self._window.create_file_dialog(
            webview.OPEN_DIALOG,
            allow_multiple=True,
            file_types=(f'Image Files ({";".join(f"*.{ext}" for ext in ALLOWED_INPUT)})',),
        )
        return list(result) if result else None

    def openFolderDialog(self) -> str | None:
        if not self._window:
            return None
        result = self._window.create_file_dialog(webview.FOLDER_DIALOG)
        return result[0] if result else None


def on_drop(api: API, e):
    """Handle drop events from pywebview DOM."""
    files = e.get('dataTransfer', {}).get('files', [])
    if not files:
        return

    paths = []
    for file in files:
        full_path = file.get('pywebviewFullPath')
        if full_path:
            paths.append(full_path)

    if paths:
        api.addFiles(paths)
        # Notify frontend to refresh file list
        api._emit('files_updated', api.getFiles())


def bind_events(window, api):
    """Bind DOM events for drag and drop."""
    try:
        window.dom.document.events.dragenter += lambda e: None
        window.dom.document.events.dragover += lambda e: None
        window.dom.document.events.drop += lambda e: on_drop(api, e)
    except Exception as err:
        logger.warning(f'Failed to bind drag/drop events: {err}')


def main():
    api = API()

    ui_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ui_web')
    dist_dir = os.path.join(ui_dir, 'dist')
    dev_index = os.path.join(ui_dir, 'index.html')
    dist_index = os.path.join(dist_dir, 'index.html')

    if os.path.isfile(dist_index):
        url = dist_index
    elif os.path.isfile(dev_index):
        url = dev_index
    else:
        url = f'http://localhost:5000'

    window = webview.create_window(
        'Xlchemy',
        url,
        js_api=api,
        width=750,
        height=500,
        min_size=(600, 400),
        resizable=True,
    )

    api.set_window(window)

    threadpool = QThreadPool.globalInstance()
    controller = Controller(threadpool)
    api.set_controller(controller)

    webview.start(lambda: bind_events(window, api), debug=True)


if __name__ == '__main__':
    main()
