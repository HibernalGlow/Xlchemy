"""主题桥：把上游的 Theme 对象翻译成 Fluent 的主题 + 强调色。

上游有 4 套自建主题（Miku / Ralsei / Dark Amber / Light Amber），用户已经选好
的存在配置文件里。这里不做取舍，而是把每一套映射到 Fluent：

    深/浅色  <- 由 canvas 的亮度推断
    强调色   <- accent_big
    窗口底色 <- canvas

这样旧配置无缝生效，各主题的品牌色也保留下来。
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from . import mode

if TYPE_CHECKING:  # pragma: no cover - 仅用于类型提示
    from ui.theme.models import Theme

logger = logging.getLogger(__name__)

# 上游主题对象没有 Fluent 需要的深浅标记，这里以 canvas 的感知亮度推断。
# 0.5 是 sRGB 相对亮度上常见的分界点。
_DARK_THRESHOLD = 0.5

_current_theme: "Theme | None" = None
_window = None  # 弱引用由 shell 负责，这里只存引用，窗口销毁时会被 shell 清掉

# 已经下发给 Fluent 的深浅模式，用来跳过重复的 ``setTheme``（见 applyFluentTheme）。
_applied_mode = None


def _luminance(hex_color: str) -> float:
    """Returns the perceived brightness (0-1) of a #rrggbb color."""
    value = hex_color.lstrip("#")
    if len(value) != 6:
        return 0.0
    r, g, b = (int(value[i : i + 2], 16) / 255 for i in (0, 2, 4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def isDark(theme: "Theme") -> bool:
    """Returns True when the upstream theme should map to Fluent's dark mode."""
    return _luminance(theme.colors.canvas) < _DARK_THRESHOLD


def isDarkTheme() -> bool:
    """Returns True when the active theme is a dark one.

    Falls back to Fluent's own notion of the theme before the first `setTheme`.
    """
    if _current_theme is None:
        try:
            from qfluentwidgets import isDarkTheme as _fluent_is_dark

            return bool(_fluent_is_dark())
        except Exception:  # pragma: no cover - classic 模式
            return True
    return isDark(_current_theme)


def getCurrentTheme() -> "Theme | None":
    """Returns the last theme applied to the Fluent layer."""
    return _current_theme


def getAccentColor() -> str:
    """Returns the accent color of the current theme (falls back to Miku's)."""
    if _current_theme is None:
        return "#39C5BB"
    return _current_theme.colors.accent_big


def getCanvasColor() -> str:
    """Returns the window background color of the current theme."""
    if _current_theme is None:
        return "#141414"
    return _current_theme.colors.canvas


def getBorderColor() -> str:
    """Returns the card/separator color of the current theme."""
    if _current_theme is None:
        return "#404040"
    return _current_theme.colors.border


def getFontColor() -> str:
    """Returns the primary text color of the current theme."""
    if _current_theme is None:
        return "#e9e9e9"
    return _current_theme.colors.font


def getDisabledFontColor() -> str:
    """Returns the disabled text color of the current theme."""
    if _current_theme is None:
        return "#9A9A9A"
    return _current_theme.colors.font_disabled


def setWindow(window) -> None:
    """Registers the main window so theme changes can restyle its background."""
    global _window
    _window = window


def getWindow():
    """Returns the registered main window, if any."""
    return _window


def applyFluentTheme(theme: "Theme") -> bool:
    """Applies `theme` to the Fluent layer.

    Returns True when the Fluent layer took over theming. Upstream's `setTheme`
    uses that to skip its own QSS, which would otherwise fight Fluent's stylesheet.
    """
    global _current_theme, _applied_mode

    if not mode.isFluent():
        return False

    from qfluentwidgets import Theme, setTheme, setThemeColor

    _current_theme = theme

    # Fluent 的 ``setTheme`` 会广播 ``qconfig.themeChanged``，所有注册过的控件都会把
    # 自己的样式表**重刷一遍**。上游有些控件是自带 ``setStyleSheet`` 的（比如
    # ``FormatBadge``），重刷会把它们的内联样式冲掉——它们靠上游的 ``theme_changed``
    # 信号补回来，而那个信号只在深浅色真的相关时才值得惊动。所以深浅没变就不调。
    wanted = Theme.DARK if isDark(theme) else Theme.LIGHT
    if wanted is not _applied_mode:
        _applied_mode = wanted
        setTheme(wanted)

    setThemeColor(theme.colors.accent_big)

    _restyleWindow(theme)
    _restyleLabels(theme)

    return True


def _restyleWindow(theme: "Theme") -> None:
    """Makes the window adopt the theme's canvas color instead of Fluent's default."""
    window = getWindow()
    if window is None:
        return

    try:
        window.setCustomBackgroundColor(theme.colors.canvas, theme.colors.canvas)
    except AttributeError:
        # classic 模式下的窗口是原生 QMainWindow，没有这个接口。
        pass


def _restyleLabels(theme: "Theme") -> None:
    """Keeps the HTML links inside StyledLabel on the accent color."""
    try:
        from ui.widgets.label import StyledLabel
    except Exception:  # pragma: no cover - 导入环保护
        return

    StyledLabel.updateStyleForAll(
        f"""
    a {{
        color: {theme.colors.accent_big};
        text-decoration: none;
    }}
    """
    )
