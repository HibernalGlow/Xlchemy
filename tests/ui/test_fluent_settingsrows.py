"""「跟随系统」那一行的行为 —— 它换的是主题，不是上游的任何一处代码。"""

import pytest
from PySide6.QtCore import QObject, Qt, Signal
from PySide6.QtWidgets import QApplication, QComboBox, QVBoxLayout, QWidget
from unittest.mock import patch

from ui.fluent import settingsrows


class FakeHints(QObject):
    """QStyleHints 的最小替身：一个查询口 + 一个变更信号。"""

    colorSchemeChanged = Signal(object)

    def __init__(self, scheme):
        super().__init__()
        self.scheme = scheme

    def colorScheme(self):
        return self.scheme


class FakeApp:
    def __init__(self, hints):
        self._hints = hints

    def styleHints(self):
        return self._hints


@pytest.fixture
def hints(app):        # app: QWidget/QObject 都要先有 QApplication
    return FakeHints(Qt.ColorScheme.Dark)


@pytest.fixture
def useApp(hints):
    class FakeQApp:
        @staticmethod
        def instance():
            return FakeApp(hints)

    with patch.object(settingsrows, "QApplication", FakeQApp):
        yield hints


@pytest.fixture
def page(app):
    class Page(QWidget):
        def __init__(self):
            super().__init__()
            self.settings_lt = QVBoxLayout(self)
            self.theme_cmb = QComboBox()
            self.theme_cmb.addItems(["Miku", "Ralsei", "Dark Amber", "Light Amber"])
            self.wm = FakeWidgetManager()

    return Page()


class FakeWidgetManager:
    def __init__(self, variables=None):
        self.variables = dict(variables or {})

    def getVar(self, var):
        return self.variables.get(var)

    def setVar(self, var, value):
        self.variables[var] = value


def test_dark_system_picks_the_dark_theme(useApp):
    assert settingsrows.systemThemeName() == "Miku"


def test_light_system_picks_the_light_theme(useApp, hints):
    hints.scheme = Qt.ColorScheme.Light

    assert settingsrows.systemThemeName() == "Light Amber"


def test_unknown_system_falls_back_to_the_macos_preference(useApp, hints):
    """Qt 在 offscreen 一类的平台上报 Unknown，这时读 defaults。"""
    hints.scheme = Qt.ColorScheme.Unknown

    with patch.object(settingsrows, "_systemSchemeFromPreferences", return_value="light"):
        assert settingsrows.systemThemeName() == "Light Amber"

    with patch.object(settingsrows, "_systemSchemeFromPreferences", return_value="dark"):
        assert settingsrows.systemThemeName() == "Miku"


def test_unknown_system_with_nothing_to_read_leaves_the_choice_alone(useApp, hints):
    hints.scheme = Qt.ColorScheme.Unknown

    with patch.object(settingsrows, "_systemSchemeFromPreferences", return_value=None):
        assert settingsrows.systemThemeName() is None


def test_qt_scheme_does_not_spawn_defaults(useApp, hints):
    with patch.object(settingsrows, "_systemSchemeFromPreferences", side_effect=AssertionError("must not read")):
        assert settingsrows.systemThemeName() == "Miku"
        hints.scheme = Qt.ColorScheme.Light
        assert settingsrows.systemThemeName() == "Light Amber"


def test_dark_mode_preference_string_is_case_insensitive():
    class Proc:
        returncode, stdout = 0, "Dark\n"

    with (
        patch.object(settingsrows.platform, "system", return_value="Darwin"),
        patch.object(settingsrows.subprocess, "run", return_value=Proc()),
    ):
        assert settingsrows._systemSchemeFromPreferences() == "dark"


def test_missing_preference_key_means_light():
    class Proc:
        returncode, stdout = 1, ""

    with (
        patch.object(settingsrows.platform, "system", return_value="Darwin"),
        patch.object(settingsrows.subprocess, "run", return_value=Proc()),
    ):
        assert settingsrows._systemSchemeFromPreferences() == "light"


def test_non_macintosh_never_reads_defaults():
    with patch.object(settingsrows.platform, "system", return_value="Linux"):
        with patch.object(settingsrows.subprocess, "run", side_effect=AssertionError("must not spawn")):
            assert settingsrows._systemSchemeFromPreferences() is None


def test_switching_on_applies_the_system_theme_and_greys_the_dropdown(useApp, page):
    with patch("ui.theme.setTheme") as setTheme:
        row = settingsrows.AutoThemeRow(page, page)
        row.switch.setChecked(True)

    setTheme.assert_called_once_with("Miku")
    assert page.theme_cmb.isEnabled() is False
    assert page.wm.getVar("auto_theme") is True


def test_switching_off_restores_what_the_dropdown_says(useApp, page):
    page.theme_cmb.setCurrentText("Ralsei")

    with patch("ui.theme.setTheme") as setTheme:
        row = settingsrows.AutoThemeRow(page, page)
        row.switch.setChecked(True)
        setTheme.reset_mock()
        row.switch.setChecked(False)

    setTheme.assert_called_once_with("Ralsei")
    assert page.theme_cmb.isEnabled() is True


def test_saved_state_reapplies_at_construction(useApp, page):
    page.wm.variables["auto_theme"] = True

    with patch("ui.theme.setTheme") as setTheme:
        row = settingsrows.AutoThemeRow(page, page)

    assert row.switch.isChecked() is True
    setTheme.assert_called_once_with("Miku")
    assert page.theme_cmb.isEnabled() is False


def test_off_state_does_not_touch_the_theme_at_all(useApp, page):
    with patch("ui.theme.setTheme") as setTheme:
        settingsrows.AutoThemeRow(page, page)

    setTheme.assert_not_called()
    assert page.theme_cmb.isEnabled() is True


def test_system_flip_while_on_switches_themes(useApp, page, hints):
    with patch("ui.theme.setTheme") as setTheme:
        row = settingsrows.AutoThemeRow(page, page)
        row.switch.setChecked(True)
        setTheme.reset_mock()

        hints.scheme = Qt.ColorScheme.Light
        hints.colorSchemeChanged.emit(Qt.ColorScheme.Light)

    setTheme.assert_called_once_with("Light Amber")


def test_system_flip_while_off_is_ignored(useApp, page, hints):
    with patch("ui.theme.setTheme") as setTheme:
        row = settingsrows.AutoThemeRow(page, page)
        setTheme.reset_mock()

        hints.scheme = Qt.ColorScheme.Light
        hints.colorSchemeChanged.emit(Qt.ColorScheme.Light)

    setTheme.assert_not_called()


def test_unknown_system_flip_keeps_the_current_theme(useApp, page, hints):
    with patch("ui.theme.setTheme") as setTheme:
        row = settingsrows.AutoThemeRow(page, page)
        row.switch.setChecked(True)
        setTheme.reset_mock()

        hints.scheme = Qt.ColorScheme.Unknown
        with patch.object(settingsrows, "_systemSchemeFromPreferences", return_value=None):
            hints.colorSchemeChanged.emit(Qt.ColorScheme.Unknown)

    setTheme.assert_not_called()


def test_installed_row_goes_after_its_anchor(page):
    row = settingsrows.AutoThemeRow(page, page)
    anchor = QWidget()
    page.settings_lt.addWidget(anchor)

    installed = settingsrows.installSettingsRows(page, [(anchor, row)])

    assert installed == [row]
    assert page.settings_lt.indexOf(row) == 1
