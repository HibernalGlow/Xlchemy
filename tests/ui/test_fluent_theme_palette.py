"""Fluent 模式下，普通 QWidget 的颜色只能来自 palette。

上游那份应用级 QSS 里有 ``QWidget { background-color: canvas }``，而 fluent 壳会
**故意跳过**它（否则两边规则互相污染）。跳过之后，Fluent 认识的控件仍然按主题画，
但任何裸 ``QWidget`` —— 设置页滚动区里的内容容器、注入的语言/紧凑模式行 —— 就退回
**系统** palette。浅色桌面上看，就是深色窗口里嵌着一块浅灰。
"""

import pytest
from PySide6.QtGui import QPalette
from unittest.mock import patch

from ui.fluent.theme import applyFluentTheme
from ui.theme.themes import getTheme

ROLE = QPalette.ColorRole


@pytest.fixture(autouse=True)
def restorePalette(app):
    before = app.palette()
    yield
    app.setPalette(before)


@pytest.fixture(autouse=True)
def noFluentRestyle():
    """挡掉 Fluent 那轮全局重刷。

    ``updateStyleSheet()`` 在 ``list(styleSheetManager.items())`` 上遍历弱登记表，
    测试会话里前面几百个控件正在被回收 —— 回收回调删掉一项就会撞成
    ``RuntimeError: dictionary changed size during iteration``。这跟 palette 无关
    （关掉 palette 同步也一样撞），所以这里只把重刷挡开，palette 走的是真代码。
    """
    with (
        patch("qfluentwidgets.setTheme"),
        patch("qfluentwidgets.setThemeColor"),
    ):
        yield


def test_dark_theme_repaints_plain_widgets(app):
    assert applyFluentTheme(getTheme("Miku")) is True

    palette = app.palette()
    assert palette.color(ROLE.Window).name() == "#141414"
    assert palette.color(ROLE.WindowText).name() == "#e9e9e9"
    assert palette.color(ROLE.Base).name() == "#141414"


def test_light_theme_is_not_left_dark(app):
    applyFluentTheme(getTheme("Miku"))

    assert applyFluentTheme(getTheme("Light Amber")) is True

    palette = app.palette()
    assert palette.color(ROLE.Window).name() == "#f8f9fa"
    assert palette.color(ROLE.WindowText).name() == "#404040"


def test_accent_and_disabled_states_follow_the_theme(app):
    applyFluentTheme(getTheme("Ralsei"))

    palette = app.palette()
    assert palette.color(ROLE.Highlight).name() == "#00ff76"
    assert palette.color(QPalette.ColorGroup.Disabled, ROLE.WindowText).name() == "#9a9a9a"


def test_switching_back_and_forth_reapplies(app):
    applyFluentTheme(getTheme("Light Amber"))
    light = app.palette().color(ROLE.Window).name()

    applyFluentTheme(getTheme("Miku"))
    dark = app.palette().color(ROLE.Window).name()

    applyFluentTheme(getTheme("Light Amber"))
    assert (light, dark, app.palette().color(ROLE.Window).name()) == ("#f8f9fa", "#141414", "#f8f9fa")


def test_classic_mode_leaves_the_palette_alone(app):
    """classic 壳仍然吃上游的 QSS，这里不该抢过去。"""
    before = app.palette()

    with patch("ui.fluent.theme.mode.isFluent", return_value=False):
        assert applyFluentTheme(getTheme("Miku")) is False

    assert app.palette().color(ROLE.Window).name() == before.color(ROLE.Window).name()
