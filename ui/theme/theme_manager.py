import logging

from ui.fluent.qt import QApplication
from ui.fluent.theme import applyFluentTheme

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

    if applyFluentTheme(theme):
        # Fluent 层已经接管：它自带样式表，再套上游的 QSS 会把两边规则搅在一起。
        return

    app.setStyle("Fusion")
    app.setStyleSheet(stylesheet)
    StyledLabel.updateStyleForAll(f"""
    a {{
        color: {theme.colors.accent_big};
        text-decoration: none;
    }}
    """)