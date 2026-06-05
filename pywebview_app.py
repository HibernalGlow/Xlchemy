from __future__ import annotations

import logging
from pathlib import Path

import webview

from pywebview_bridge import PywebviewApi, PywebviewBridge, frontend_entry_url

logger = logging.getLogger(__name__)


def _setup_window(bridge: PywebviewBridge, app_root: Path) -> webview.Window:
    url = frontend_entry_url(app_root)
    window = webview.create_window(
        "Xlchemy",
        url=url,
        js_api=PywebviewApi(bridge),
        width=1440,
        height=900,
        min_size=(1024, 640),
        text_select=True,
        confirm_close=False,
        background_color="#F4F7FB",
    )
    bridge.attach_window(window)
    window.events.loaded += bridge.install_dom_bridges
    return window


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
    app_root = Path(__file__).resolve().parent
    bridge = PywebviewBridge(app_root)
    _setup_window(bridge, app_root)
    webview.start(debug=False, http_server=True)


if __name__ == "__main__":
    main()
