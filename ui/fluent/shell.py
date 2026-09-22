"""窗口壳与页面容器。

上游 ``main.py`` 里有两个 Qt 类被替换掉，其余逻辑一行不动：

============================  ==================================================
上游                           这里
============================  ==================================================
``QMainWindow``               ``QMainWindow`` —— Fluent 窗口（Mica / 自绘标题栏）
``QTabWidget``                ``QTabWidget`` —— 页面容器，对上游暴露 QTabWidget 接口
============================  ==================================================

类名沿用 Qt 的名字，跟 ``adapters.py`` / ``widgets.py`` / ``dialogs.py`` 一致。

``QTabWidget`` 同时支撑两种壳，并且**可以在运行时切换**：

* ``nav``     —— 左侧导航（图标 + 文字）。默认。
* ``compact`` —— 顶部 Fluent 标签栏，窗口能保持窄一些。

两种壳共存于同一棵 widget 树里，切换就是切可见性，所以切换是即时的：不重建页面,
``stackedWidget`` 的当前页也不会丢。
"""

from __future__ import annotations

import inspect
import json
import logging
import os
import sys
from enum import Enum
from typing import Optional

from PySide6.QtCore import QRect, QSize, Qt
from PySide6.QtWidgets import QHBoxLayout, QVBoxLayout, QWidget
from qfluentwidgets import (
    FluentIcon,
    FluentWindow,
    NavigationItemPosition,
    TabBar,
    ToolButton,
)

from ui.i18n import onLanguageChanged, tr

from . import theme as fluent_theme
from .langmenu import LanguageButton, installSettingsRow

logger = logging.getLogger(__name__)

# 上游 main.py 里写死的是 resize(700, 352)——那是给顶部标签栏准备的紧凑尺寸，
# 连导航壳都放不下，更装不下 Fluent 尺寸的页面。窗口下限现在由页面自己算
# （见 ``_requiredSize``），这里只留一个「别小于这个」的兜底。
UPSTREAM_DEFAULT_SIZE = QSize(700, 352)
MIN_WINDOW_SIZE = QSize(700, 420)

# 导航展开后的宽度与「保持展开」的窗口宽度下限。
NAV_EXPAND_WIDTH = 190
NAV_MIN_EXPAND_WINDOW_WIDTH = 720

# 紧凑模式下标签栏那一行的高度（``sizeHint`` 有时还没算出来）。
TAB_ROW_HEIGHT = 40

# Qt 的 ``QWIDGETSIZE_MAX``。PySide6 没有把这个宏导出到 Python，只能按值写。
QWIDGETSIZE_MAX = (1 << 24) - 1

# 紧凑模式下把内容区上边距收回到标题栏高度：导航没了，那 46px 的留白也没意义了。
TITLE_BAR_NAV_OFFSET = 46

# ---------------------------------------------------------------- macOS 交通灯
#
# macOS 的红/黄/绿三个按钮是**系统画的**（AppKit 的 standardWindowButton），
# 位置由 ``qframelesswindow`` 的 ``_updateSystemButtonRect()`` 用 ``setFrameOrigin_``
# 摆，摆到哪由 ``systemTitleBarRect()`` 决定。而 qfluentwidgets 的
# ``FluentWindowBase`` 把它覆写成了窗口**右上角**::
#
#     return QRect(size.width() - 75, 0 if self.isFullScreen() else 8, 75, size.height())
#
# 那是为了对齐它自家的 Windows 风格标题栏按钮（最小化/最大化/关闭在右边）——
# 在 Windows 上说得通，但在 macOS 上就违背了「红黄绿在左上角」的惯例。
#
# 而且还有第二层问题：``qframelesswindow`` 每次 ``paintEvent`` 都会重设一遍
# ``styleMask``（``_extendTitleBarToClientArea``），AppKit 于是重新摆一遍它自己的
# 默认位置（左上角），紧接着又被 ``setFrameOrigin_`` 拽回右上角 —— 两拨人在同一个
# 位置上打架，偶尔就停在中间，看起来就是「交通灯错位/压在侧栏上」。
#
# 所以这里把它纠回 AppKit 自己的默认位置（左上角）。这既符合 macOS 惯例，又因为
# 目标位置和系统默认位置一致而**消掉了那场打架**。代价是要给自绘标题栏和左侧导航
# 让出左上角这一块。
_IS_MACOS = sys.platform == "darwin"

# 交通灯占的那一块（窗口左上角）。实测三个按钮落在 x 10..64 / y 13..29。
TRAFFIC_LIGHT_ZONE = QRect(0, 0, 78, 34)

# 自绘标题栏的内容（图标 + 标题）从交通灯右边开始，留 8px 空隙。
TITLE_BAR_LEFT_INSET = TRAFFIC_LIGHT_ZONE.right() + 8

# 左侧导航的内容整体下移，让开交通灯 —— 这就是 macOS 上「侧栏在标题栏下面」的观感。
NAV_TOP_INSET = TRAFFIC_LIGHT_ZONE.height()


class ShellMode(str, Enum):
    NAV = "nav"
    COMPACT = "compact"


ENV_VAR = "XLCHEMY_SHELL"
_DEFAULT_MODE = ShellMode.NAV

# 页面标题 -> 导航图标
_ICONS: dict[str, FluentIcon] = {
    "input": FluentIcon.ZIP_FOLDER,
    "output": FluentIcon.SAVE,
    "modify": FluentIcon.EDIT,
    "settings": FluentIcon.SETTING,
    "about": FluentIcon.INFO,
}


def _iconFor(label: str) -> FluentIcon:
    return _ICONS.get(label.strip().lower(), FluentIcon.PAGE_LEFT)


def _modeFilePath() -> Optional[str]:
    try:
        from data.constants import CONFIG_LOCATION

        return os.path.join(CONFIG_LOCATION, "UiLayout.json")
    except Exception:  # pragma: no cover - 常量还没初始化好
        return None


def loadShellMode() -> ShellMode:
    """Returns the persisted shell mode (env var wins over the config file)."""
    override = os.environ.get(ENV_VAR, "").strip().lower()
    if override in (ShellMode.NAV.value, ShellMode.COMPACT.value):
        return ShellMode(override)

    path = _modeFilePath()
    if path and os.path.isfile(path):
        try:
            with open(path, "r", encoding="utf-8") as handle:
                value = str(json.load(handle).get("shell", "")).lower()
            if value in (ShellMode.NAV.value, ShellMode.COMPACT.value):
                return ShellMode(value)
        except (OSError, ValueError) as error:
            logger.error(f"[ui.fluent.shell] Cannot read the UI layout: {error}")

    return _DEFAULT_MODE


def saveShellMode(mode: ShellMode) -> None:
    """Persists the shell mode so the next launch starts in the same one."""
    path = _modeFilePath()
    if not path:
        return

    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as handle:
            json.dump({"shell": mode.value}, handle, indent=2)
    except OSError as error:
        logger.error(f"[ui.fluent.shell] Cannot save the UI layout: {error}")


class QTabWidget(QWidget):
    """页面容器，对上游暴露 ``QTabWidget`` 用到的那几个方法。

    上游 ``main.py`` 只用 ``addTab`` / ``count`` / ``setCurrentIndex`` /
    ``setEnabled`` / ``isEnabled``。页面本身挂在窗口的 ``stackedWidget`` 上
    （Fluent 的导航要求如此），所以这里 ``setEnabled`` 得显式往下发。
    """

    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(parent)
        self._window: Optional["QMainWindow"] = None
        self._pages: list[QWidget] = []
        self._labels: list[str] = []
        self._enabled = True
        self._current = 0

    # ------------------------------------------------------ 上游使用的接口

    def addTab(self, widget: QWidget, label: str) -> int:  # noqa: N802 - Qt 命名
        # Fluent 用 objectName 当路由键，必须非空且唯一。
        widget.setObjectName(f"xlchemyPage{len(self._pages)}")
        self._pages.append(widget)
        # 标签存的是**英文原文**，显示时再翻。留着原文是为了切语言时能重翻 ——
        # 存译文的话切回来就没救了。
        self._labels.append(label)

        if self._window is not None:
            self._install(len(self._pages) - 1)

        return len(self._pages) - 1

    def count(self) -> int:
        return len(self._pages)

    def pages(self) -> list[QWidget]:
        """按注册顺序返回页面控件。"""
        return list(self._pages)

    def pageLabels(self) -> list[str]:  # noqa: N802 - 与 Qt 命名风格一致
        """按注册顺序返回页面标题的**英文原文**（切语言时要用它重翻）。"""
        return list(self._labels)

    def setCurrentIndex(self, index: int) -> None:  # noqa: N802
        if not 0 <= index < len(self._pages):
            return
        self._current = index
        if self._window is not None:
            self._window.switchTo(self._pages[index])

    def currentIndex(self) -> int:  # noqa: N802
        return self._current

    def setEnabled(self, enabled: bool) -> None:  # noqa: N802
        self._enabled = bool(enabled)
        super().setEnabled(enabled)

        # 页面被 reparent 到窗口的 stackedWidget 上了，不再是本容器的子控件，
        # 继承不到 enabled 状态，得逐个同步。
        for page in self._pages:
            page.setEnabled(enabled)

        if self._window is not None:
            self._window.setShellEnabled(enabled)

    def isEnabled(self) -> bool:  # noqa: N802
        return self._enabled

    # ------------------------------------------------------------ 装配

    def attachToWindow(self, window: "QMainWindow") -> None:
        """Installs every page into `window` (nav items + tab strip + stack)."""
        self._window = window
        for index in range(len(self._pages)):
            self._install(index)
        window.notifyPagesInstalled()

    def _install(self, index: int) -> None:
        page = self._pages[index]
        label = self._labels[index]
        icon = _iconFor(label)

        self._window.addSubInterface(page, icon, label, **self._installKwargs(label, icon))
        self._window.addShellTab(page.objectName(), label, icon)

    def _installKwargs(self, label: str, icon: FluentIcon) -> dict:
        """Picks the `addSubInterface` arguments this FluentWindow actually accepts.

        ``FluentWindow`` 与 ``MSFluentWindow`` 的签名不同（前者没有 ``selectedIcon``），
        所以按实际签名决定传什么，别写死。
        """
        accepted = inspect.signature(self._window.addSubInterface).parameters
        kwargs: dict = {"position": NavigationItemPosition.TOP}
        if "selectedIcon" in accepted:
            kwargs["selectedIcon"] = icon
        if "tooltip" in accepted and "text" not in accepted:
            kwargs["tooltip"] = label
        return kwargs


class QMainWindow(FluentWindow):
    """Fluent 窗口。``main.py`` 里的 ``class MainWindow(QMainWindow)`` 换成它。"""

    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(parent)

        self._pages_installed = False
        self._shell_mode = loadShellMode()
        self.languageButton: Optional[LanguageButton] = None
        self._tabs: Optional[QTabWidget] = None

        # 主题桥需要在切主题时改窗口底色，所以窗口一建好就登记进去。
        fluent_theme.setWindow(self)

        self._setupShell()

        # 切语言后要重翻壳自己画的那几处文字（导航项 / 标签栏）。页面里的普通控件
        # 由 i18n 的通用重翻负责，这里补的是「不是普通控件」的部分。
        onLanguageChanged(lambda _tag: self.applyTranslations())

    # ------------------------------------------------------------ 装配

    def _setupShell(self) -> None:
        self.navigationInterface.setExpandWidth(NAV_EXPAND_WIDTH)
        self.navigationInterface.setMinimumExpandWidth(NAV_MIN_EXPAND_WINDOW_WIDTH)
        self.navigationInterface.setCollapsible(True)
        self._reserveTrafficLightZone()

        # 紧凑模式的一行：标签栏 + 右侧的壳切换按钮。
        self.tabBar = TabBar(self)
        self.tabBar.setAddButtonVisible(False)
        self.tabBar.setTabsClosable(False)
        self.tabBar.setMovable(False)

        self.tabRow = QWidget(self)
        row = QHBoxLayout(self.tabRow)
        row.setContentsMargins(12, 6, 12, 0)
        row.setSpacing(8)
        row.addWidget(self.tabBar, 1)

        self.shellToggle = ToolButton(FluentIcon.TILES, self.tabRow)
        self.shellToggle.clicked.connect(self.toggleShellMode)
        row.addWidget(self.shellToggle, 0, Qt.AlignTop)

        self._installLanguageButton()

        # 把 Fluent 的 stackedWidget 收进一个容器：上面是标签栏行，下面是页面。
        # widgetLayout 已经带了 48px 的上边距（给标题栏让位），所以标签栏正好
        # 落在标题栏下方。
        self.widgetLayout.removeWidget(self.stackedWidget)
        self.contentHost = QWidget(self)
        host = QVBoxLayout(self.contentHost)
        host.setContentsMargins(0, 0, 0, 0)
        host.setSpacing(0)
        host.addWidget(self.tabRow)
        host.addWidget(self.stackedWidget, 1)
        self.widgetLayout.addWidget(self.contentHost)

        # 左侧导航底部的壳切换入口。紧凑模式下导航整体隐藏，所以标签栏那一侧
        # 也必须有一个入口。
        #
        # ``text`` / ``tooltip`` 一个用 ``tr()`` 一个不用，不是笔误：Fluent 的导航项
        # 文字进的是 ``NavigationWidget``（非接缝控件，i18n 拦不到），必须自己翻；
        # 而提示语最终走 ``QWidget.setToolTip``，那是被拦截的入口，给它**英文原文**
        # 就行 —— 喂译文反而会把登记表写坏（见 ui/i18n/hooks.py 的 _record）。
        #
        # 文案写**字面量**而不是类常量：抽取工具按字面量找文案，写成常量它看不见，
        # 这条就会永远停在英文（踩过一次）。
        self.navigationInterface.addItem(
            routeKey="xlchemyShellMode",
            icon=FluentIcon.TILES,
            text=tr("Compact mode"),
            onClick=self.toggleShellMode,
            position=NavigationItemPosition.BOTTOM,
            tooltip="Use the top tab strip",
        )

        self.stackedWidget.currentChanged.connect(self._syncTabBar)
        self._applyShellMode(resize=False)

    def addShellTab(self, routeKey: str, label: str, icon: FluentIcon) -> None:
        """Registers a page in the top tab strip."""
        self.tabBar.addTab(
            routeKey, label, icon, onClick=lambda: self._switchToRoute(routeKey)
        )

    def _syncShellToggleToolTip(self, nav_mode: bool) -> None:
        """设置壳切换按钮的提示语。

        传的是**英文原文**：``setToolTip`` 是 i18n 拦得到的入口，它负责翻译并把
        原文登记下来，切语言时自己会重翻。
        """
        self.shellToggle.setToolTip(
            "Use the top tab strip" if nav_mode else "Use the side navigation"
        )

    def _installLanguageButton(self) -> None:
        """把语言按钮放进自绘标题栏。

        位置：标题文字之后、弹性空白之前。右侧原本是 Fluent 的窗口按钮（macOS 上
        已被系统交通灯取代、处于隐藏），左侧刚让给交通灯，所以贴着标题放最稳。
        """
        layout = getattr(self.titleBar, "hBoxLayout", None)
        if layout is None:
            return

        self.languageButton = LanguageButton(self.titleBar)

        index = layout.count()
        for position in range(layout.count()):
            if layout.itemAt(position).spacerItem() is not None:
                index = position
                break

        layout.insertWidget(index, self.languageButton, 0, Qt.AlignLeft)

    def applyTranslations(self) -> None:
        """重翻**壳自己画**的那几处文字。

        页面里的普通控件由 ``ui.i18n.retranslateAll()`` 统一重翻（它们走接缝、登记
        过原文）；这里补的是接缝拦不到的部分：Fluent 的导航项与顶部标签栏。

        页面标题的原文存在 ``QTabWidget`` 上（``main.py`` 的 ``addTab()`` 给的），
        所以要从容器取，而不是窗口自己 —— 窗口只持有容器的引用。
        """
        tabs = self._tabs
        if tabs is None:
            return

        for index, source in enumerate(tabs.pageLabels()):
            display = tr(source)
            self.tabBar.setTabText(index, display)

            item = self.navigationInterface.widget(tabs.pages()[index].objectName())
            if item is not None and hasattr(item, "setText"):
                item.setText(display)
                # 导航项把 tooltip 也设成了同一句话；那条是被拦截的入口，登记的
                # 是翻译前的原文，重翻由 i18n 的通用重翻负责，这里不用管。

        shell_item = self.navigationInterface.widget("xlchemyShellMode")
        if shell_item is not None and hasattr(shell_item, "setText"):
            shell_item.setText(tr("Compact mode"))

        self._syncShellToggleToolTip(self._shell_mode is ShellMode.NAV)

    def notifyPagesInstalled(self) -> None:
        """Called once every page is registered; safe to size the window now."""
        self._pages_installed = True
        self._installSettingsRow()
        self._applyShellMode(resize=True)

    def _installSettingsRow(self) -> None:
        """把语言选择行注入设置页。

        设置页是上游文件，一行都不改 —— 注入发生在运行时，找不到预期结构就静默
        跳过（标题栏那个按钮仍然能切语言）。见 ui/fluent/langmenu.py。
        """
        for page in self.installedPages():
            if hasattr(page, "settings_lt"):
                installSettingsRow(page)
                return

    def releaseHeightCaps(self) -> None:
        """Lets pages grow past the height upstream pinned them to.

        ``main.py`` 里有这么两行::

            MAX_HEIGHT = 320
            self.output_tab.setMaximumSize(MAX_WIDTH, MAX_HEIGHT)

        那个 320 是按**上游 QSS 的紧凑密度**算的（12px 字号、~23px 控件）。Fluent
        的控件更高，同一份布局要 ~440px；被钉在 320 之后行高会被压到个位数、控件
        互相重叠。所以这里放开**高度**上限，让窗口按页面自己的需求长高；宽度上限
        保留（它只防横向拉伸，不挤压任何东西）。

        注意时机：上游是在 ``setCentralWidget()`` **之后**那一行才钉上限的，所以
        不能在安装页面时释放（那时钉子还没钉上）。这里挂到首次 show/resize 上，
        按值判断、幂等，可以随便重复调用。
        """
        for page in self.installedPages():
            if page.maximumHeight() < QWIDGETSIZE_MAX:
                page.setMaximumHeight(QWIDGETSIZE_MAX)

    def setCentralWidget(self, widget) -> None:  # noqa: N802 - Qt 命名
        """``main.py`` 直接调用也能工作；正常路径走 ``QTabWidget.attachToWindow``。"""
        if isinstance(widget, QTabWidget):
            self._tabs = widget
            widget.attachToWindow(self)
            return
        super().setCentralWidget(widget)

    # ------------------------------------------------------------- 壳

    def shellMode(self) -> ShellMode:
        return self._shell_mode

    def toggleShellMode(self) -> None:
        self.setShellMode(
            ShellMode.COMPACT if self._shell_mode is ShellMode.NAV else ShellMode.NAV
        )

    def setShellMode(self, mode: ShellMode, persist: bool = True) -> None:
        self._shell_mode = ShellMode(mode)
        self._applyShellMode(resize=False)
        if persist:
            saveShellMode(self._shell_mode)

    def _applyShellMode(self, resize: bool) -> None:
        nav_mode = self._shell_mode is ShellMode.NAV

        # 窗口下限由**页面自己**决定：页面是上游手调的紧凑布局，Fluent 的控件比它
        # 原本假设的高，硬塞会压扁行高。所以先问内容要多大，再定窗口得多大。
        target = self._requiredSize(nav_mode)

        # 顺序很关键：调 ``expand()`` 时阈值必须是 0。
        #
        # ``NavigationPanel.expand()`` 拿 ``minimumExpandWidth`` 跟当前窗口宽度比，
        # 决定进 EXPAND 还是 MENU 模式::
        #
        #     expandWidth = minimumExpandWidth + expandWidth - 322
        #     if window().width() >= expandWidth:  -> EXPAND
        #     else:                                -> MENU（把面板 reparent 到窗口当浮层）
        #
        # 而 MENU 那一步**不可逆**：面板从此成了窗口的直属子控件，不再随导航界面一起
        # 隐藏/禁用。表现出来就是切到紧凑模式后侧栏还画在内容上面，把标签栏和页面
        # 左边裁掉一块（也会让转换期间「禁用导航」失效）。
        #
        # 麻烦在于调用的时机：``_setupShell()`` / ``notifyPagesInstalled()`` 都发生在
        # 窗口 show() 之前，``window().width()`` 还是上游那个 700x352，拿它跟「页面
        # 算出来的 933」比就会误判成 MENU。所以这里把阈值临时压到 0，让 expand() 无
        # 条件走 EXPAND，之后再恢复成真实阈值（它管的是「窗口变窄时自动收起」）。
        self.navigationInterface.setMinimumExpandWidth(0)

        self.navigationInterface.setVisible(nav_mode)
        self._syncNavigationPanel(nav_mode)
        self.tabRow.setVisible(not nav_mode)

        if nav_mode:
            self.navigationInterface.expand(useAni=False)
        self._syncShellToggleToolTip(nav_mode)

        self.setMinimumSize(target)

        # 导航的「自动展开阈值」跟窗口下限对齐：窗口不可能比 target 更窄，于是
        # 导航永远是展开的，不会因为一次拖拽就把图标挤成蚂蚁。
        self.navigationInterface.setMinimumExpandWidth(target.width())

        # 上游 setupWindow() 里的 resize(700, 352) 是紧凑尺寸；导航壳放不下。
        # 只在窗口还是那个默认尺寸时调整，不动用户自己拖出来的尺寸。
        if resize and self.size() == UPSTREAM_DEFAULT_SIZE:
            self.resize(
                max(target.width(), self.width()), max(target.height(), self.height())
            )

        self._positionTitleBar(nav_mode)
        self.titleBar.raise_()

    def _requiredSize(self, nav_mode: bool) -> QSize:
        """Returns the smallest window that fits every page without squeezing it."""
        content = self.contentSize()
        chrome = self._chromeSize(nav_mode)
        return QSize(content.width() + chrome.width(), content.height() + chrome.height())

    def contentSize(self) -> QSize:
        """Returns the largest sizeHint across all installed pages."""
        width = height = 0
        for page in self.installedPages():
            hint = page.sizeHint()
            width = max(width, hint.width())
            height = max(height, hint.height())
        return QSize(width, height)

    def installedPages(self) -> list[QWidget]:
        """Returns the page widgets currently living in the window's stack."""
        stack = self.stackedWidget
        return [stack.widget(i) for i in range(stack.count())]

    def _chromeSize(self, nav_mode: bool) -> QSize:
        """Returns the space the window chrome takes around the page area.

        左边导航展开后的宽度 / 顶部标签栏那行的高度，再加上自绘标题栏的高度。
        """
        title = self.titleBar.height() or 48
        if nav_mode:
            return QSize(NAV_EXPAND_WIDTH, title)
        return QSize(0, title + max(self.tabRow.sizeHint().height(), TAB_ROW_HEIGHT))

    def _positionTitleBar(self, nav_mode: bool) -> None:
        offset = TITLE_BAR_NAV_OFFSET if nav_mode else 0
        if _IS_MACOS:
            # macOS 上标题栏左边永远是交通灯的地盘，跟有没有侧栏无关。
            offset = max(offset, TITLE_BAR_LEFT_INSET)
        self.titleBar.move(offset, 0)
        self.titleBar.resize(self.width() - offset, self.titleBar.height())

    # ------------------------------------------------------- macOS 交通灯

    def _navigationPanel(self):
        """Returns the actual navigation panel widget, or None.

        ``NavigationInterface`` 只是外壳，内容全在它内部的 ``panel`` 上。正常情况
        panel 是 interface 的子控件，hide/disable 会自然继承；但 qfluentwidgets 在
        MENU 显示模式下会把 panel **reparent 到窗口**当浮层，那时候继承就断了，
        得单独处理。``_applyShellMode()`` 已经尽量不让它走到那一步，这里留个兜底。
        """
        return getattr(self.navigationInterface, "panel", None)

    def _syncNavigationPanel(self, nav_mode: bool) -> None:
        """Keeps the navigation panel's visibility in step with the shell mode."""
        panel = self._navigationPanel()
        if panel is None:
            return

        panel.setVisible(nav_mode)
        if nav_mode:
            # panel 若是窗口的直属子控件，它的高度不会跟着导航界面走。
            panel.setFixedHeight(self.height())

    def _reserveTrafficLightZone(self) -> None:
        """把窗口左上角那块让给 macOS 的原生交通灯。

        两个动作：

        * 自绘标题栏（``FluentTitleBar``）本身挪到交通灯右边 —— 见
          ``_positionTitleBar()``，它每次 resize 都会重算，这里不用管。
        * 左侧导航的顶部留白加大，让它的第一个按钮（``←`` / ``≡``）落在交通灯
          下面，而不是被交通灯压住。
        """
        if not _IS_MACOS:
            return

        panel = getattr(self.navigationInterface, "panel", None)
        layout = getattr(panel, "vBoxLayout", None)
        if layout is None:
            return

        margins = layout.contentsMargins()
        if margins.top() >= NAV_TOP_INSET:
            return
        layout.setContentsMargins(
            margins.left(), NAV_TOP_INSET, margins.right(), margins.bottom()
        )

    def systemTitleBarRect(self, size: QSize) -> QRect:  # noqa: N802 - Qt 命名
        """告诉 ``qframelesswindow`` 该把 macOS 的交通灯摆在哪。

        基类（``FluentWindowBase``）给的是窗口右上角 ``QRect(width - 75, 8, 75, h)``；
        这里纠回左上角。理由见文件头 ``TRAFFIC_LIGHT_ZONE`` 那段注释。
        """
        if not _IS_MACOS:
            return super().systemTitleBarRect(size)
        return QRect(
            TRAFFIC_LIGHT_ZONE.left(),
            0 if self.isFullScreen() else 8,
            TRAFFIC_LIGHT_ZONE.width(),
            size.height(),
        )

    def setShellEnabled(self, enabled: bool) -> None:
        """Disables the chrome (nav + tab strip) while a conversion runs."""
        self.navigationInterface.setEnabled(enabled)
        panel = self._navigationPanel()
        if panel is not None:
            # 面板被 reparent 到窗口时不再是导航界面的子控件，enabled 传不下去。
            panel.setEnabled(enabled)
        self.tabBar.setEnabled(enabled)
        self.shellToggle.setEnabled(enabled)

    # --------------------------------------------------------- 导航同步

    def _syncTabBar(self, index: int) -> None:
        widget = self.stackedWidget.widget(index)
        if widget is not None and widget.objectName():
            self.tabBar.setCurrentTab(widget.objectName())

    def _switchToRoute(self, routeKey: str) -> None:
        widget = self.findChild(QWidget, routeKey)
        if widget is not None:
            self.switchTo(widget)

    # ------------------------------------------------------------- 事件

    def showEvent(self, event) -> None:  # noqa: N802
        # 上游在 setCentralWidget() 之后才给页面钉高度上限，所以这里（窗口真正要
        # 显示的时候）才是释放它的最早可靠时机。幂等，重复调用无副作用。
        self.releaseHeightCaps()
        super().showEvent(event)

    def resizeEvent(self, event) -> None:  # noqa: N802
        super().resizeEvent(event)
        self.releaseHeightCaps()
        nav_mode = self._shell_mode is ShellMode.NAV
        self._positionTitleBar(nav_mode)
        if nav_mode:
            # 导航面板若被 reparent 到窗口，它的高度不会自己跟上来。
            self._syncNavigationPanel(True)
