from unittest.mock import patch, call

import pytest
from PySide6.QtWidgets import QApplication
from PySide6.QtCore import Qt, QPointF, QPoint
from PySide6.QtGui import QMouseEvent, QCursor

from ui.widgets.scroll_area import ScrollArea

# Fluent 接缝下不能直接读 *ScrollBarPolicy()：委托在建自定义滚动条时就把原生 policy
# 永久钉成 AlwaysOff（自定义条接管绘制，见 qfluentwidgets scroll_bar.py:217-221、
# :663-669），请求的策略只记在 ScrollBar._isForceHidden 上。classic 模式没有委托，
# 原生 policy 就是真相。两种模式都断言同一件事：这根条到底还可不可用。
def _bar_enabled(scroll, orient: Qt.Orientation) -> bool:
    delegate = getattr(scroll, "delegate", None)
    if delegate is None:
        policy = (
            scroll.verticalScrollBarPolicy()
            if orient == Qt.Vertical
            else scroll.horizontalScrollBarPolicy()
        )
        return policy != Qt.ScrollBarAlwaysOff

    bar = delegate.vScrollBar if orient == Qt.Vertical else delegate.hScrollBar
    return not bar._isForceHidden

@pytest.fixture
def app(qtbot):
    app = QApplication.instance()
    if not app:
        app = QApplication([])

    scroll = ScrollArea()
    qtbot.addWidget(scroll)
    return scroll

def test_init(app):
    assert not _bar_enabled(app, Qt.Horizontal)
    assert _bar_enabled(app, Qt.Vertical)

def test_enable_horizontal_scroll(qtbot):
    scroll_area = ScrollArea(enable_horizontal=True)
    qtbot.addWidget(scroll_area)
    assert _bar_enabled(scroll_area, Qt.Horizontal)

def test_enable_vertical_scroll(qtbot):
    scroll_area = ScrollArea(enable_vertical=False)
    qtbot.addWidget(scroll_area)
    assert not _bar_enabled(scroll_area, Qt.Vertical)

def test_mousePressEvent(app):
    app.mousePressEvent(QMouseEvent(QMouseEvent.MouseButtonPress, QPointF(0, 0), QCursor.pos(), Qt.LeftButton, Qt.LeftButton, Qt.NoModifier))

    assert app.is_dragging
    assert app.cursor().shape() == Qt.ClosedHandCursor

def test_mouseReleaseEvent(app):
    app.mousePressEvent(QMouseEvent(QMouseEvent.MouseButtonPress, QPointF(0, 0), QCursor.pos(), Qt.LeftButton, Qt.LeftButton, Qt.NoModifier))
    app.mouseReleaseEvent(QMouseEvent(QMouseEvent.MouseButtonRelease, QPointF(0, 0), QCursor.pos(), Qt.LeftButton, Qt.LeftButton, Qt.NoModifier))

    assert app.is_dragging == False
    assert app.cursor().shape() == Qt.ArrowCursor

# Why?
# QtWarningMsg: Mouse event "MousePress" not accepted by receiving widget
# QtWarningMsg: Mouse event "MouseMove" not accepted by receiving widget
# def test_mouseMoveEvent_2(app, qtbot):
#     qtbot.mousePress(app, Qt.LeftButton, pos=QPoint(0, 0))
#     qtbot.mouseMove(app, pos=QPoint(0, 100))
#     assert app.last_position.y() == 100

def test_mouseMoveEvent(app):
    app.mousePressEvent(QMouseEvent(QMouseEvent.MouseButtonPress, QPointF(0, 0), QCursor.pos(), Qt.LeftButton, Qt.LeftButton, Qt.NoModifier))
    app.mouseMoveEvent(QMouseEvent(QMouseEvent.MouseMove, QPointF(0, 100), QCursor.pos(), Qt.LeftButton, Qt.LeftButton, Qt.NoModifier))

    assert app.last_position.y() == 100