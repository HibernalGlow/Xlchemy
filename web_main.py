import json
import os
import logging
import webview
from typing import Any

from PySide6.QtCore import QThreadPool

from core.controller import Controller
from data.constants import VERSION, CONFIG_LOCATION, ALLOWED_INPUT
from data.config_manager import ConfigManager

logger = logging.getLogger(__name__)


class API:
    def __init__(self):
        self._window = None
        self._controller = None
        self._files: list[dict] = []

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
        config = ConfigManager()
        return {
            'version': VERSION,
            'config_location': CONFIG_LOCATION,
        }

    def saveSettings(self, settings: dict):
        pass

    def addFiles(self, paths: list) -> int:
        count = 0
        for path in paths:
            if os.path.isfile(path):
                ext = os.path.splitext(path)[1].lstrip('.').lower()
                if ext in ALLOWED_INPUT:
                    name = os.path.basename(path)
                    size = os.path.getsize(path)
                    self._files.append({
                        'path': path,
                        'anchor_path': path,
                        'name': name,
                        'size': size,
                        'format': ext,
                    })
                    count += 1
            elif os.path.isdir(path):
                for root, _, filenames in os.walk(path):
                    for filename in filenames:
                        ext = os.path.splitext(filename)[1].lstrip('.').lower()
                        if ext in ALLOWED_INPUT:
                            filepath = os.path.join(root, filename)
                            size = os.path.getsize(filepath)
                            self._files.append({
                                'path': filepath,
                                'anchor_path': filepath,
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

        items = [(f['path'], f['anchor_path']) for f in self._files]
        self._controller.items.clear()
        self._controller.items.parseData(settings_tab_settings.get('processing_order', 'Sequential'), items, [])

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

        check = self._controller.checkProcessingRequirements(
            len(self._files),
            not bool(output_settings.get('sm_format_pool', [])),
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
