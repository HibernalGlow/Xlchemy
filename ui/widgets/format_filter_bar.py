import logging
from typing import Set

from PySide6.QtWidgets import (
    QWidget,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QDialog,
    QVBoxLayout,
    QGridLayout,
    QCheckBox,
)
from PySide6.QtCore import Qt, Signal

from data.constants import ALLOWED_INPUT
from ui.theme.themes import getTheme
from ui.theme.utils import hexToRGBA

logger = logging.getLogger(__name__)

DEFAULT_EXCLUDED_FORMATS = {"avif", "jxl", "webp", "gif"}


def _getAccentColor() -> str:
    from ui.theme.theme_manager import _current_theme_name
    theme = getTheme(_current_theme_name)
    return theme.colors.accent_big


class FormatBadge(QPushButton):
    """A small badge button representing a file format filter state."""

    badgeToggled = Signal(str, bool)

    def __init__(self, ext: str, excluded: bool = False, parent=None):
        super().__init__(parent)
        self.ext = ext.lower()
        self._excluded = excluded
        self.setCheckable(True)
        self.setChecked(not excluded)
        self.setText(f".{ext.upper()}")
        self.setCursor(Qt.PointingHandCursor)
        self.setFixedHeight(20)
        self._updateStyle()
        self.clicked.connect(self._onClicked)

    def _onClicked(self):
        self._excluded = not self.isChecked()
        self._updateStyle()
        self.badgeToggled.emit(self.ext, self._excluded)

    def setExcluded(self, excluded: bool):
        self._excluded = excluded
        self.setChecked(not excluded)
        self._updateStyle()

    def isExcluded(self) -> bool:
        return self._excluded

    def _updateStyle(self):
        accent = _getAccentColor()
        accent_hover = hexToRGBA(accent, 180)
        if self._excluded:
            self.setStyleSheet(f"""
                QPushButton {{
                    color: #888888;
                    background-color: transparent;
                    border: 1px solid #555555;
                    border-radius: 3px;
                    padding: 1px 6px;
                    font-size: 10px;
                    font-weight: 600;
                }}
                QPushButton:hover {{
                    background-color: #333333;
                    border-color: #777777;
                }}
            """)
        else:
            self.setStyleSheet(f"""
                QPushButton {{
                    color: #ffffff;
                    background-color: {accent};
                    border: 1px solid {accent};
                    border-radius: 3px;
                    padding: 1px 6px;
                    font-size: 10px;
                    font-weight: 600;
                }}
                QPushButton:hover {{
                    background-color: {accent_hover};
                    border-color: {accent_hover};
                }}
            """)


class FormatFilterConfigDialog(QDialog):
    """Dialog for configuring which formats to exclude."""

    def __init__(self, excluded_formats: Set[str], parent=None):
        super().__init__(parent)
        self.setWindowTitle("Format Filter")
        self.setMinimumWidth(300)
        self._excluded = set(excluded_formats)

        layout = QVBoxLayout(self)

        info = QLabel("Unchecked formats will be excluded from input.")
        info.setStyleSheet("color: #888888; font-size: 11px;")
        layout.addWidget(info)

        grid = QGridLayout()
        self.checkboxes: dict[str, QCheckBox] = {}

        sorted_exts = sorted(ALLOWED_INPUT)
        cols = 4
        for i, ext in enumerate(sorted_exts):
            cb = QCheckBox(f".{ext.upper()}")
            cb.setChecked(ext not in self._excluded)
            self.checkboxes[ext] = cb
            grid.addWidget(cb, i // cols, i % cols)

        layout.addLayout(grid)

        btn_layout = QHBoxLayout()
        self.reset_btn = QPushButton("Reset Defaults")
        self.reset_btn.clicked.connect(self._resetDefaults)
        self.ok_btn = QPushButton("OK")
        self.ok_btn.clicked.connect(self.accept)
        self.cancel_btn = QPushButton("Cancel")
        self.cancel_btn.clicked.connect(self.reject)

        btn_layout.addWidget(self.reset_btn)
        btn_layout.addStretch()
        btn_layout.addWidget(self.ok_btn)
        btn_layout.addWidget(self.cancel_btn)
        layout.addLayout(btn_layout)

    def _resetDefaults(self):
        for ext, cb in self.checkboxes.items():
            cb.setChecked(ext not in DEFAULT_EXCLUDED_FORMATS)

    def getExcludedFormats(self) -> Set[str]:
        return {ext for ext, cb in self.checkboxes.items() if not cb.isChecked()}


class FormatFilterBar(QWidget):
    """A bar showing format badges for quick filtering."""

    filterChanged = Signal(set)

    def __init__(self, parent=None):
        super().__init__(parent)
        self._excluded: Set[str] = set(DEFAULT_EXCLUDED_FORMATS)
        self._badges: dict[str, FormatBadge] = {}

        self._setupUI()
        self._createBadges()

    def _setupUI(self):
        self.main_layout = QHBoxLayout(self)
        self.main_layout.setContentsMargins(0, 2, 0, 2)
        self.main_layout.setSpacing(4)

        self.label = QLabel("Filter:")
        self.label.setStyleSheet("font-size: 11px; color: #888888;")
        self.main_layout.addWidget(self.label)

        self.badge_layout = QHBoxLayout()
        self.badge_layout.setSpacing(4)
        self.badge_layout.setAlignment(Qt.AlignLeft)
        self.main_layout.addLayout(self.badge_layout)

        self.main_layout.addStretch()

        self.config_btn = QPushButton("")
        self.config_btn.setFixedSize(20, 20)
        self.config_btn.setCursor(Qt.PointingHandCursor)
        self.config_btn.setStyleSheet("""
            QPushButton {
                color: #888888;
                background-color: transparent;
                border: 1px solid #555555;
                border-radius: 3px;
                font-size: 10px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #333333;
                border-color: #777777;
            }
        """)
        self.config_btn.setText("")
        self.config_btn.setToolTip("Configure format filter")
        self.config_btn.clicked.connect(self._openConfigDialog)
        self.main_layout.addWidget(self.config_btn)

    def _createBadges(self):
        for ext in sorted(ALLOWED_INPUT):
            badge = FormatBadge(ext, excluded=ext in self._excluded)
            badge.badgeToggled.connect(self._onBadgeToggled)
            self._badges[ext] = badge
            self.badge_layout.addWidget(badge)

    def _onBadgeToggled(self, ext: str, excluded: bool):
        if excluded:
            self._excluded.add(ext)
        else:
            self._excluded.discard(ext)
        self.filterChanged.emit(set(self._excluded))

    def _openConfigDialog(self):
        dlg = FormatFilterConfigDialog(self._excluded, self)
        if dlg.exec() == QDialog.Accepted:
            self._excluded = dlg.getExcludedFormats()
            for ext, badge in self._badges.items():
                badge.setExcluded(ext in self._excluded)
            self.filterChanged.emit(set(self._excluded))

    def getExcludedFormats(self) -> Set[str]:
        return set(self._excluded)

    def setExcludedFormats(self, excluded: Set[str]):
        self._excluded = set(excluded)
        for ext, badge in self._badges.items():
            badge.setExcluded(ext in self._excluded)
        self.filterChanged.emit(set(self._excluded))

    def isFormatAllowed(self, ext: str) -> bool:
        return ext.lower() not in self._excluded

    def refreshTheme(self):
        for badge in self._badges.values():
            badge._updateStyle()
