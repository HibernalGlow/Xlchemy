"""Fluent 控件。

大部分控件直接复用 qfluentwidgets（映射见 ``qt.py``）。这里只放三类：

1. **必须保住 Qt 语义的控件。** 上游 ``ui/lib/widget_manager.py`` 用
   ``isinstance`` 判定控件类型来决定怎么存取状态。qfluentwidgets 的 ``ComboBox``
   继承的是 ``QPushButton`` 而不是 ``QComboBox``，直接换会**静默**丢掉所有下拉框
   的持久化。所以下拉框自己做：真 ``QComboBox``，外观直接套改写后的 Fluent QSS。
2. **qfluentwidgets 没有对应物的控件。** ``QGroupBox`` 在这里变成 Fluent 卡片
   （上游只把它当带标题的分区用，没有调用任何 QGroupBox 专有 API）。
3. **需要按项目习惯收窄默认值的控件。**

和 ``adapters.py`` 一样，这里的类**直接用 Qt 的类名**：``ui/lib/widget_manager.py``
的 ``_getWidgetSubclass()`` 拿 ``cls.__name__`` 去 match ``"QComboBox"`` /
``"QTextEdit"`` 这些字面量，名字一改，控件的状态持久化就会静默失效。
"""

from __future__ import annotations

import re

from PySide6.QtCore import QEvent, QPoint, QRectF, Qt
from PySide6.QtGui import QAction, QColor, QFont, QIcon, QPainter
from PySide6.QtWidgets import QComboBox as _QtComboBox, QLabel, QListView, QWidget

from qfluentwidgets import (
    FluentIcon,
    IndicatorMenuItemDelegate,
    MenuAnimationType,
    RoundMenu,
    TextEdit as _FluentTextEdit,
    drawIcon,
    isDarkTheme,
    qconfig,
)
from qfluentwidgets.common.style_sheet import FluentStyleSheet, Theme, getStyleSheet

from . import theme as fluent_theme
from .sizing import ClassMinWidthMixin

# Fluent 控件的标准高度。上游 QSS 把控件压到 15px 高，那个密度在 Fluent 下会把
# 圆角和内边距挤变形，所以按 Fluent 的 32/33px 走。
CONTROL_HEIGHT = 32
COMBO_HEIGHT = 33
TEXT_EDIT_HEIGHT = 64


def onThemeChanged(callback) -> None:
    """Runs `callback` whenever the Fluent theme or accent color changes."""
    qconfig.themeChanged.connect(lambda *_: callback())
    qconfig.themeColorChanged.connect(lambda *_: callback())


_ARROW_ICONS: dict[tuple[str, bool], QIcon] = {}


def arrowIcon(color: QColor, enabled: bool) -> QIcon:
    """`FluentIcon.ARROW_DOWN` tinted for the current palette, built once per look.

    ``icon(color=...)`` re-reads and rewrites the SVG source on every call, and
    this runs from ``paintEvent``.
    """
    key = (color.name(), enabled)
    icon = _ARROW_ICONS.get(key)

    if icon is None:
        tinted = QColor(color)
        if not enabled:
            tinted.setAlpha(90)
        icon = FluentIcon.ARROW_DOWN.icon(color=tinted)
        _ARROW_ICONS[key] = icon

    return icon


def retargetQss(qss: str, names: set[str], target: str) -> str:
    """Rewrites Fluent's stylesheet so it applies to `target` instead of `names`.

    Fluent 的 QSS 按控件类名写选择器（``ComboBox``）。换成真 Qt 类名
    （``QComboBox``）之后，原生控件就能拿到**一模一样**的悬停/按下/禁用态，
    而不是手写一份必然会随上游漂移的复制品。
    """
    out: list[str] = []

    for chunk in qss.split("}"):
        if "{" not in chunk:
            out.append(chunk)
            continue

        head, body = chunk.split("{", 1)
        rewritten: list[str] = []

        for part in head.split(","):
            token = part.strip()
            if not token:
                continue
            base = re.split(r"[:[]", token, maxsplit=1)[0].strip()
            if base in names:
                rewritten.append(token.replace(base, target, 1))

        # 选择器都不匹配的整块丢掉：Fluent 的 ``ComboBox`` 规则本来就匹配不到
        # QComboBox，留着只会让两边规则互相污染。
        out.append(", ".join(rewritten) + "{" + body if rewritten else "")

    return "}".join(out)


class QComboBox(ClassMinWidthMixin, _QtComboBox):
    """A real ``QComboBox`` wearing Fluent's clothes.

    用真 QComboBox 换来三件事：

    * ``WidgetManager`` 的 ``isinstance(widget, QComboBox)`` 仍成立，下拉框状态
      照常保存/加载；
    * 上游 ``ui/widgets/combobox.py`` 里的 ``view()`` / ``showPopup()`` 覆写照常
      工作；
    * 弹出的浮层换成 Fluent 的圆角菜单（带选中指示条与展开动画）。

    签名只有 ``(parent)``：选项由上游 ``ui/widgets/combobox.py`` 的 ``ComboBox``
    自己 ``addItems``（它是 ``super().__init__(parent)`` 这样调的）。
    """

    def __init__(self, parent: QWidget | None = None):
        super().__init__(parent)

        self.setFixedHeight(COMBO_HEIGHT)
        self.setCursor(Qt.PointingHandCursor)
        self.setMaxVisibleItems(10)

        # 保留原生视图：上游会用 ``self.view()`` 量行高来决定弹层高度。它不参与
        # 显示（我们走 RoundMenu），但必须存在且持有模型。
        self.setView(QListView(self))

        self._menu = None
        self._applyFluentStyle()
        onThemeChanged(self._applyFluentStyle)

    # ------------------------------------------------------------------ 外观

    def _applyFluentStyle(self) -> None:
        style = getattr(FluentStyleSheet, "COMBO_BOX", None)
        if style is None:
            return

        qss = getStyleSheet(style, Theme.DARK if isDarkTheme() else Theme.LIGHT)
        qss = retargetQss(qss, {"ComboBox", "ModelComboBox"}, "QComboBox")

        # 箭头由 paintEvent 画（Fluent 用图标而不是 QSS 的 image 规则）。
        self.setStyleSheet(qss + "\nQComboBox::drop-down { border: none; width: 0px; }")
        self.update()

    def paintEvent(self, event) -> None:
        super().paintEvent(event)

        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)

        size = 10
        x = self.width() - size - 11
        y = (self.height() - size) / 2

        color = self.palette().color(self.foregroundRole())
        drawIcon(arrowIcon(color, self.isEnabled()), painter, QRectF(x, y, size, size))
        painter.end()

    # ------------------------------------------------------------------ 弹层

    def showPopup(self) -> None:
        if self._menu is not None or self.count() == 0:
            return

        menu = self._createMenu()
        if menu is None:
            return

        self._menu = menu
        menu.closedSignal.connect(self._onMenuClosed)
        menu.exec(self._menuPosition(menu), aniType=self._menuAnimationType(menu))

    def hidePopup(self) -> None:
        if self._menu is not None:
            self._menu.close()

    def _createMenu(self) -> RoundMenu:
        menu = RoundMenu(title="", parent=self)
        menu.view.setViewportMargins(0, 2, 0, 6)
        menu.view.setVerticalScrollBarPolicy(Qt.ScrollBarAsNeeded)
        menu.view.setItemDelegate(IndicatorMenuItemDelegate())
        menu.view.setObjectName("comboListWidget")
        menu.setItemHeight(33)

        model = self.model()
        for row in range(self.count()):
            action = QAction(self.itemText(row), menu)

            icon = self.itemIcon(row)
            if not icon.isNull():
                action.setIcon(icon)

            action.setEnabled(bool(model.flags(model.index(row, 0)) & Qt.ItemIsEnabled))
            action.triggered.connect(lambda _checked=False, row=row: self._select(row))
            menu.addAction(action)

        if menu.view.width() < self.width():
            menu.view.setMinimumWidth(self.width())
            menu.adjustSize()

        menu.setMaxVisibleItems(self.maxVisibleItems())
        menu.setAttribute(Qt.WA_DeleteOnClose)

        actions = menu.actions()
        if 0 <= self.currentIndex() < len(actions):
            menu.setDefaultAction(actions[self.currentIndex()])

        return menu

    def _menuPosition(self, menu: RoundMenu) -> QPoint:
        """Centers the popup on the control, like Fluent does."""
        inset = menu.layout().contentsMargins().left()
        x = self.width() // 2 - menu.width() // 2 + inset
        return self.mapToGlobal(QPoint(x, self.height()))

    def _menuAnimationType(self, menu: RoundMenu) -> MenuAnimationType:
        """Picks drop-down or pull-up depending on which shows more items.

        注意名字里必须带 ``Menu``：这是本类的**自有**方法，不能叫 ``_animType``
        —— 那是 qfluentwidgets 基类可能用到的名字，一旦重名就会把基类的实现顶掉，
        表现为「下拉框点不开」这类只在运行到弹层时才暴露的故障。
        """
        pos = self._menuPosition(menu)
        down = menu.view.heightForAnimation(pos, MenuAnimationType.DROP_DOWN)
        up = menu.view.heightForAnimation(
            self.mapToGlobal(QPoint(pos.x(), 0)), MenuAnimationType.PULL_UP
        )
        return MenuAnimationType.DROP_DOWN if down >= up else MenuAnimationType.PULL_UP

    def _select(self, row: int) -> None:
        if row == self.currentIndex():
            return

        previous = self.currentText()
        self.setCurrentIndex(row)

        # QComboBox 只在文本真的变化时才发 currentTextChanged。上游好几个联动
        # 逻辑挂在这个信号上，这里补发一次，保证行为一致。
        if self.currentText() == previous:
            self.currentTextChanged.emit(self.currentText())

    def _onMenuClosed(self) -> None:
        self._menu = None


class QTextEdit(_FluentTextEdit):
    """Fluent 的多行输入，但按项目的用量收窄默认高度。"""

    def __init__(self, text: str = "", parent=None):
        super().__init__(parent)
        if text:
            self.setPlainText(text)
        self.setFixedHeight(TEXT_EDIT_HEIGHT)


class QGroupBox(QWidget):
    """Fluent 卡片式的分组框，替代 ``QGroupBox``。

    上游把 ``QGroupBox("Conversion")`` 当带标题的分区用。这里用 QWidget 把卡片
    画出来，顺手绕开 QGroupBox 那套由 style 决定的内容区几何——那会让卡片边框
    和内容对不齐。

    标题是画在卡片顶部的，所以内容布局必须让出 ``TITLE_HEIGHT``。麻烦在于上游
    有两套写法，**只有一套能把边距塞进去**：

    * ``layout = QVBoxLayout(); grp.setLayout(layout)`` —— 会走到本类的
      :meth:`setLayout`，直接改边距即可；
    * ``layout = QVBoxLayout(grp)`` —— ``QLayout`` 的构造函数是在 **C++ 里**调
      ``QWidget::setLayout`` 的，**不会**派发到 Python 覆写（``setLayout`` 不是
      虚函数），所以这条路上 :meth:`setLayout` 根本不会被调用。

    第二种写法在 ``output_tab.py`` 里到处都是。与其依赖调用方，不如让卡片自己
    在拿到 ``LayoutRequest`` 时把边距补齐——那时布局一定已经装在身上了。
    """

    TITLE_HEIGHT = 34

    # 内容区四周的留白。左边多给一点，跟标题的起始位置对齐。
    SIDE_MARGIN = 14
    BOTTOM_MARGIN = 12

    def __init__(self, title: str = "", parent: QWidget | None = None):
        super().__init__(parent)
        # 走 ``setTitle`` 而不是直接写 ``_title``：i18n 的拦截挂在 ``setTitle`` 上，
        # 上游的 ``QGroupBox("Conversion")`` 必须先经过它才会被翻译
        # （见 ui/i18n/hooks.py 的 ``_TEXT_TARGETS``）。
        self._title = ""
        self.setTitle(title)
        self.setContentsMargins(0, 0, 0, 0)
        self.setAttribute(Qt.WA_StyledBackground, True)
        onThemeChanged(self.update)

    def title(self) -> str:
        return self._title

    def setTitle(self, title: str) -> None:
        self._title = title
        self.update()

    def setLayout(self, layout) -> None:
        """Installs `layout` and insets it below the painted title."""
        super().setLayout(layout)
        self._applyInsets()

    def _applyInsets(self) -> None:
        """Reserves the header space inside the layout, once it exists."""
        layout = self.layout()
        if layout is None:
            return

        wanted = (self.SIDE_MARGIN, self.TITLE_HEIGHT, self.SIDE_MARGIN, self.BOTTOM_MARGIN)
        margins = layout.contentsMargins()
        current = (margins.left(), margins.top(), margins.right(), margins.bottom())
        if current == wanted:
            return

        # 只在真的不一样时才写：``setContentsMargins`` 会再发一次 LayoutRequest，
        # 靠上面这个相等判断收敛。
        layout.setContentsMargins(*wanted)
        layout.setSpacing(6)

    def event(self, event) -> bool:
        if event.type() == QEvent.LayoutRequest:
            self._applyInsets()
        return super().event(event)

    def paintEvent(self, event) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)

        # Fluent 的 ``CardWidget`` 就是「底色 + 极淡描边」。拿主题里的 border 色
        # 压到低透明度，卡片在任何一套主题下都能跟背景区分开。
        fill = QColor(fluent_theme.getBorderColor())
        fill.setAlpha(58)

        rect = QRectF(self.rect()).adjusted(0.5, 0.5, -0.5, -0.5)
        painter.setPen(Qt.NoPen)
        painter.setBrush(fill)
        painter.drawRoundedRect(rect, 6, 6)

        if self._title:
            font = QFont(self.font())
            font.setBold(True)
            painter.setFont(font)
            painter.setPen(QColor(fluent_theme.getFontColor()))
            painter.drawText(
                QRectF(14, 0, self.width() - 28, self.TITLE_HEIGHT),
                int(Qt.AlignLeft | Qt.AlignVCenter),
                self._title,
            )

        painter.end()


class SectionLabel(QLabel):
    """卡片内/页面内的小节标题。"""

    def __init__(self, text: str = "", parent=None):
        super().__init__(text, parent)
        font = QFont(self.font())
        font.setBold(True)
        self.setFont(font)
        self.setStyleSheet("background: transparent;")
        onThemeChanged(self._refresh)
        self._refresh()

    def _refresh(self) -> None:
        self.setStyleSheet(
            f"color: {fluent_theme.getFontColor()}; background: transparent;"
        )
