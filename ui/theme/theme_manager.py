import logging

from PySide6.QtWidgets import QApplication

from ui.widgets.label import StyledLabel
from .stylesheet import getStyleSheet
from .themes import getTheme

_current_theme_name: str = "Miku"

def setTheme(theme_name: str = "Miku") -> None:
    """Sets theme of the QApplication."""
    global _current_theme_name
    _current_theme_name = theme_name
    theme = getTheme(theme_name)
    stylesheet = getStyleSheet(theme)

    app = QApplication.instance()
    if app is None:
        logging.getLogger(__name__).error("QApplication not found.")
        return

    app.setStyle("Fusion")
    app.setStyleSheet(stylesheet)
    StyledLabel.updateStyleForAll(f"""
    a {{
        color: {theme.colors.accent_big};
        text-decoration: none;
    }}
    """)