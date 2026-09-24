"""设置页里**我们自己**的那几行 —— 全部运行时注入，一行都不改上游文件。

上游 ``ui/tabs/settings_tab.py`` 的设置项布局是 ``settings_lt``（一个
``QVBoxLayout``），主题那一行是其中的 ``theme_hb``。我们的行插在主题行之后，
顺序是 ``Theme → Follow system → Language → Compact mode``。上游真把结构改了也
不会有事 —— 注入失败就静默跳过，不影响启动。

**为什么放在这里而不是标题栏**：语言原先还有一个「标题栏地球按钮」入口，那个是
「上游把设置页重排了就找不到入口」的兜底。现在标题栏不再放控件，设置页是唯一入口
（:class:`LanguageRow`）；紧凑模式原先挂在左侧导航底部，现在也收进设置页
（:class:`ShellModeRow`）。这样标题栏与侧栏都干净了。

**分类显隐**：设置页的分类是 ``changeCategory()`` 里写死的一张「属性名 → 分类」表，
我们加不进去（那就得改上游文件）。所以改成运行时**包一层**：先让上游按它自己的表
算完，再把我们注入的行按各自的分类补上。注意要**一次把所有行装完、只包一层** ——
每行各包一次会互相嵌套，越早装的行越容易被后来的包装挡住。
"""

from __future__ import annotations

import logging
import platform
import subprocess
from typing import Any, Callable, Optional, Sequence

from PySide6.QtCore import Qt
from PySide6.QtWidgets import QApplication, QHBoxLayout, QLayout, QWidget
from qfluentwidgets import SwitchButton

from ui.i18n import (
    availableLanguages,
    currentLanguage,
    onLanguageChanged,
    setLanguage,
)

from .adapters import QLabel
from .widgets import QComboBox

logger = logging.getLogger(__name__)

#: 注入的行归到设置页的哪个分类（取值与 ``settings_tab.changeCategory`` 一致）。
GENERAL = "General"

#: 「跟随系统」在两端的落点：深色沿用默认那套，浅色用上游唯一的亮色主题。
AUTO_DARK_THEME = "Miku"
AUTO_LIGHT_THEME = "Light Amber"


def _systemSchemeFromPreferences() -> Optional[str]:
    """macOS 的「外观」设置，走 ``defaults``。

    Qt 的 ``colorScheme()`` 在 offscreen 平台上报 ``Unknown``（cocoa 上才报得出
    深浅），所以留这一条兜底：认不出来就保持现状，而不是猜一个。
    """
    if platform.system() != "Darwin":
        return None

    try:
        proc = subprocess.run(
            ["defaults", "read", "-g", "AppleInterfaceStyle"],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            timeout=5,
            text=True,
        )
    except (OSError, subprocess.SubprocessError) as e:
        logger.debug(f"[settingsrows] Cannot read the macOS appearance. {e}")
        return None

    if proc.returncode != 0:
        # 浅色模式下这个键压根不存在，read 会以非零码退出。
        return "light"

    value = proc.stdout.strip().lower()
    if value == "dark":
        return "dark"
    if value == "light":
        return "light"

    return None


def systemThemeName() -> Optional[str]:
    """系统外观对应的主题名。

    认不出深浅时返回 None：宁可保持用户当前那一套，也不要在没有依据的情况下
    把窗口翻成另一种配色。
    """
    app = QApplication.instance()
    scheme = app.styleHints().colorScheme() if app is not None else Qt.ColorScheme.Unknown

    if scheme == Qt.ColorScheme.Dark:
        return AUTO_DARK_THEME
    if scheme == Qt.ColorScheme.Light:
        return AUTO_LIGHT_THEME

    return {"dark": AUTO_DARK_THEME, "light": AUTO_LIGHT_THEME}.get(_systemSchemeFromPreferences())


class AutoThemeRow(QWidget):
    """设置页里的「Follow system」一行：开着就按系统深浅在两套主题之间挑。

    **为什么是开关，而不是给主题下拉框加第 5 个选项**：那个名字得让上游的
    ``getTheme()`` 认识，要么改上游文件、要么运行时把它的函数换掉。开关只调
    ``setTheme()``，两边都不碰。开着的时候把下拉框置灰，表示「现在不归它管」；
    关掉时按下拉框里那套重新应用一次。

    状态存在 ``SettingsTab.json`` 的 ``variables`` 里（键 ``auto_theme``），不进
    预设：预设抓的是 ``getSettings()`` 那份字典，这里没它。
    """

    STATE_KEY = "auto_theme"

    def __init__(self, page, parent: Optional[QWidget] = None):
        super().__init__(parent)
        self._page = page

        self.label = QLabel("Follow system", self)
        self.switch = SwitchButton(self)
        # 与 ShellModeRow 同理：Off/On 文字走 Fluent 自己的 tr()，接缝拦不到。
        self.switch.setOnText("")
        self.switch.setOffText("")

        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(self.label)
        layout.addWidget(self.switch)
        layout.addStretch()

        # 先摆正状态，再接信号，免得建行的过程本身触发一次换主题。
        enabled = bool(page.wm.getVar(self.STATE_KEY))
        self.switch.setChecked(enabled)
        self._syncCombo()

        self.switch.checkedChanged.connect(self._onToggled)
        app = QApplication.instance()
        if app is not None:
            app.styleHints().colorSchemeChanged.connect(self._onSystemSchemeChanged)

        if enabled:
            self._apply()

    # ------------------------------------------------------------------

    def _onToggled(self, checked: bool) -> None:
        self._page.wm.setVar(self.STATE_KEY, bool(checked))
        self._syncCombo()

        if checked:
            self._apply()
        else:
            self._applyName(str(self._page.theme_cmb.currentText()))

    def _onSystemSchemeChanged(self, *_args: object) -> None:
        if self.switch.isChecked():
            self._apply()

    def _syncCombo(self) -> None:
        combo = getattr(self._page, "theme_cmb", None)
        if combo is not None:
            combo.setEnabled(not self.switch.isChecked())

    def _apply(self) -> None:
        self._applyName(systemThemeName())

    @staticmethod
    def _applyName(name: Optional[str]) -> None:
        if not name:
            return

        # 延迟导入：ui.theme 反过来要用 ui.fluent.*，模块级导入会成环。
        from ui.theme import setTheme

        setTheme(name)


def _languageChoices() -> list[tuple[str, str]]:
    """``[(tag, 该语言自己的写法)]``。

    语言名一律用**该语言自己的写法**（``简体中文`` / ``English``），不参与翻译：
    语言选单必须永远可读，不能因为选了看不懂的语言就找不回来。
    """
    return availableLanguages()


class LanguageRow(QWidget):
    """设置页里的「Language」一行：左边标签、右边下拉。"""

    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(parent)

        # 给**英文原文**，翻译交给接缝上的拦截（``QLabel.setText`` 是被拦的入口），
        # 这样切语言时它也能跟着重翻。
        self.label = QLabel("Language", self)
        self.combo = QComboBox(self)
        self.combo.setProperty("class", "min_width_cmb")  # 与主题下拉等宽

        self._tags: list[str] = []
        self._syncItems()

        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(self.label)
        layout.addWidget(self.combo)
        layout.addStretch()

        self.combo.currentIndexChanged.connect(self._onIndexChanged)
        onLanguageChanged(lambda _tag: self._syncSelection())

    # ------------------------------------------------------------------

    def _syncItems(self) -> None:
        """按可用语言重建下拉项（语言名用各自母语写法，不翻译）。"""
        self._tags = []
        self.combo.clear()
        for tag, name in _languageChoices():
            self._tags.append(tag)
            self.combo.addItem(name)
        self._syncSelection()

    def _syncSelection(self) -> None:
        current = currentLanguage()
        if current in self._tags:
            self.combo.blockSignals(True)
            self.combo.setCurrentIndex(self._tags.index(current))
            self.combo.blockSignals(False)

    def _onIndexChanged(self, index: int) -> None:
        if 0 <= index < len(self._tags):
            setLanguage(self._tags[index])


class ShellModeRow(QWidget):
    """设置页里的「Compact mode」一行：左边标签、右边开关。

    **开 = 紧凑模式**（顶部标签栏，窗口能窄一些）；**关 = 左侧导航**。

    这个行**不认识** ``ShellMode``：它只拿两个回调（怎么读、怎么改）外加一个
    「外部把壳改了」的信号。这样 ``shell.py`` 能单向依赖本模块而不会成环 ——
    窗口比这一行知道得多，反过来不成立。
    """

    def __init__(
        self,
        is_compact: Callable[[], bool],
        set_compact: Callable[[bool], None],
        *,
        changed: Any = None,
        parent: Optional[QWidget] = None,
    ):
        super().__init__(parent)
        self._isCompact = is_compact
        self._setCompact = set_compact
        # 「同步开关」时不要把状态又回灌成一次设置（见 _syncState）。
        self._syncing = False

        self.label = QLabel("Compact mode", self)
        self.switch = SwitchButton(self)
        # 只留一个光秃秃的开关：Fluent 自带的 Off/On 文字走它自己的 ``tr()``，
        # 接缝拦不到，会永远停在英文。
        self.switch.setOnText("")
        self.switch.setOffText("")

        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(self.label)
        layout.addWidget(self.switch)
        layout.addStretch()

        self._syncState()
        self.switch.checkedChanged.connect(self._onToggled)
        # 用顶部标签栏那个按钮切壳时，这个开关也得跟上。
        if changed is not None:
            changed.connect(self._syncState)

    # ------------------------------------------------------------------

    def _syncState(self, *_args: object) -> None:
        """把开关拨到当前壳模式（外部改壳时会调到这里）。"""
        compact = bool(self._isCompact())
        self._syncing = True
        try:
            self.switch.setChecked(compact)
        finally:
            self._syncing = False

    def _onToggled(self, checked: bool) -> None:
        if self._syncing:
            return
        self._setCompact(bool(checked))


# ------------------------------------------------------------------ 注入


def layoutIndexOf(container: QLayout, child: Any) -> Optional[int]:
    """返回 child（``QLayout`` **或** ``QWidget``）在 container 里的下标。"""
    for index in range(container.count()):
        item = container.itemAt(index)
        if item is None:
            continue
        if child is item.layout() or child is item.widget():
            return index
    return None


def installSettingsRows(
    page: QWidget, rows: Sequence[tuple[Any, QWidget]], *, category: str = GENERAL
) -> list[QWidget]:
    """按顺序把 ``(锚点, 行)`` 插进设置页，返回真正插上的行。

    第一个锚点通常是设置页的 ``theme_hb``，之后的行以前一行为锚点 —— 这样顺序
    由调用方的列表决定，不依赖「插到第几个下标」。

    找不到锚点就**停下**（后面的行锚在前一行上，继续插只会错位），已插上的行照常
    绑定分类。上游重排设置页时这里的表现是「安静地少几行」，不会影响启动。
    """
    container: Optional[QLayout] = getattr(page, "settings_lt", None)
    if container is None:
        logger.error("[settingsrows] 设置页没有 settings_lt，跳过注入")
        return []

    installed: list[QWidget] = []
    for anchor, row in rows:
        index = layoutIndexOf(container, anchor)
        if index is None:
            logger.error("[settingsrows] 找不到锚点，停止注入后续设置行")
            break
        container.insertWidget(index + 1, row)
        installed.append(row)

    if installed:
        _bindCategoryVisibility(page, installed, category)
    return installed


def _bindCategoryVisibility(
    page: QWidget, rows: Sequence[QWidget], category: str
) -> None:
    """让注入的行跟着设置页的分类一起显隐。

    分类可见性是 ``changeCategory()`` 里写死的一张表（按属性名列举要显示的控件）。
    改那张表就得改上游文件，所以改成运行时**包一层**：先让上游按它自己的表算完，
    再把我们的行补上。
    """
    original = getattr(page, "changeCategory", None)
    if original is None:
        return

    wanted = str(category).strip().lower()

    def changeCategory(category_name: str) -> None:
        original(category_name)
        visible = str(category_name).strip().lower() == wanted
        for row in rows:
            row.setVisible(visible)

    try:
        page.changeCategory = changeCategory  # type: ignore[method-assign]
    except (AttributeError, TypeError) as error:  # pragma: no cover
        logger.error(f"[settingsrows] Cannot bind the rows to categories: {error}")
        return

    # 构造时可能已经调过一次 changeCategory，补一次现状。
    #
    # 不写死 ``general_btn``：分类名与按钮名的关系就是 ``<分类小写>_btn``，
    # 按同一套规则扫一遍，换分类时不用改这里。
    for button_name in _categoryButtonNames(page):
        button = getattr(page, f"{button_name}_btn", None)
        if button is None or not getattr(button, "isChecked", lambda: False)():
            continue
        for row in rows:
            row.setVisible(button_name == wanted)
        break


def _categoryButtonNames(page: QWidget) -> tuple[str, ...]:
    """从页面属性里推出所有 ``<分类>_btn`` 的分类名（保持声明顺序）。"""
    names = []
    for attribute in vars(page):
        if attribute.endswith("_btn"):
            names.append(attribute[: -len("_btn")])
    return tuple(names)
