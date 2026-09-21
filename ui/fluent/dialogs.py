"""Fluent 化的对话框，顶上上游用的那三个 Qt 类。

上游 ``ui/dialogs/message_box.py`` / ``progress_dlg.py`` / ``preset_widget.py`` 里
的**逻辑**一行不动，只是它们 new 出来的 Qt 类由接缝换成了这里的实现：

===================  ==============================================
上游用的类              这里的实现
===================  ==============================================
``QMessageBox``       ``QMessageBox`` —— 遮罩 + 圆角卡片
``QProgressDialog``   ``QProgressDialog`` —— 无边框卡片（可被 move）
``QInputDialog``      ``QInputDialog`` —— 只要 ``getText``
===================  ==============================================

和 ``adapters.py`` / ``widgets.py`` 一样，**类名保持上游认得的 Qt 名字**，这样
``QMessageBox.StandardButton.Ok`` 这种写法在上游代码里一个字都不用改。

关键是调用契约必须一致：``exec()`` 的返回值、``StandardButton`` 的位运算、
``canceled`` 信号、``wasCanceled()`` 这些都不能变，否则上游逻辑会静默跑偏。
"""

from __future__ import annotations

import enum
from typing import Optional

from PySide6.QtCore import QPoint, Qt, Signal
from PySide6.QtGui import QColor, QIcon, QPainter
from PySide6.QtWidgets import (
    QDialog,
    QFrame,
    QHBoxLayout,
    QLabel,
    QVBoxLayout,
    QWidget,
)

from qfluentwidgets import (
    BodyLabel,
    LineEdit,
    PrimaryPushButton,
    ProgressBar,
    PushButton,
    SubtitleLabel,
)
from qfluentwidgets.common.style_sheet import FluentStyleSheet

from . import theme as fluent_theme

# 卡片外围留出的透明边，用来落投影。
SHADOW_MARGIN = 18


class StandardButton(enum.Flag):
    """``QMessageBox.StandardButton`` 的最小等价物（只要位运算与相等比较）。"""

    NoButton = 0
    Ok = enum.auto()
    Yes = enum.auto()
    No = enum.auto()
    Cancel = enum.auto()


def _maskColor() -> QColor:
    """Returns the dimming color drawn behind a modal card."""
    return QColor(0, 0, 0, 102) if fluent_theme.isDarkTheme() else QColor(255, 255, 255, 128)


class _CardDialog(QDialog):
    """无边框圆角卡片对话框。

    ``masked=True`` 时按 Fluent 的做法把对话框窗口撑满父窗口、铺一层遮罩、卡片
    居中——这就是 Fluent 的 MessageBox 观感。``masked=False`` 时是一张浮在父窗口
    上的独立卡片（进度条用它，因为上游会自己 ``move()`` 定位）。
    """

    def __init__(self, parent: Optional[QWidget] = None, masked: bool = False):
        super().__init__(parent.window() if parent is not None else None)

        self._masked = masked and self.parentWidget() is not None

        self.setWindowFlag(Qt.Dialog, True)
        self.setWindowFlag(Qt.FramelessWindowHint, True)
        self.setAttribute(Qt.WA_TranslucentBackground, True)
        self.setModal(True)

        outer = QVBoxLayout(self)
        outer.setContentsMargins(*(SHADOW_MARGIN,) * 4)

        self.card = QFrame(self, objectName="centerWidget")
        outer.addWidget(self.card, 1, Qt.AlignCenter)

        # 只把 Fluent 的对话框样式应用到卡片上：整份 sheet 里的 ``QDialog`` 规则
        # 会把对话框自身的矩形涂成不透明，投影就没地方落了。
        FluentStyleSheet.DIALOG.apply(self.card)

        self.body = QVBoxLayout(self.card)
        self.body.setContentsMargins(24, 24, 24, 24)
        self.body.setSpacing(14)

    # ------------------------------------------------------------------ 布局

    def addButtons(self, *buttons: QWidget) -> QHBoxLayout:
        """Appends a right-aligned button row."""
        row = QHBoxLayout()
        row.setSpacing(12)
        row.addStretch()
        for button in buttons:
            row.addWidget(button)
        self.body.addLayout(row)
        return row

    # ------------------------------------------------------------------ 定位

    def paintEvent(self, event) -> None:
        if self._masked:
            painter = QPainter(self)
            painter.fillRect(self.rect(), _maskColor())
            painter.end()

    def _place(self) -> None:
        """Sizes/moves the dialog the way Fluent does."""
        self.adjustSize()

        parent = self.parentWidget()
        if parent is None:
            return

        geometry = parent.frameGeometry()
        if self._masked:
            # 盖住整个父窗口，卡片由布局居中。
            self.setGeometry(geometry)
            return

        self.move(
            QPoint(
                geometry.x() + (geometry.width() - self.width()) // 2,
                geometry.y() + (geometry.height() - self.height()) // 2,
            )
        )

    def exec(self) -> int:
        self._place()
        return super().exec()


class QMessageBox(_CardDialog):
    """``QMessageBox`` 的替身：``message_box.info`` / ``confirm`` 照原样调用。"""

    # 上游可能挂 ``canceled``；保持名字与语义一致。
    canceled = Signal()

    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(parent, masked=True)

        self._icon: QIcon | None = None
        self._buttons = StandardButton.Ok
        self._result = StandardButton.NoButton

        self.card.setMinimumWidth(360)
        self.card.setMaximumWidth(460)

        self.titleLabel = QLabel(self.card)
        self.titleLabel.setObjectName("titleLabel")
        self.contentLabel = BodyLabel("", self.card)
        self.contentLabel.setObjectName("contentLabel")
        self.contentLabel.setWordWrap(True)

        self.detailsLabel = BodyLabel("", self.card)
        self.detailsLabel.setObjectName("contentLabel")
        self.detailsLabel.setWordWrap(True)
        self.detailsLabel.setVisible(False)

        self.body.addWidget(self.titleLabel)
        self.body.addWidget(self.contentLabel)
        self.body.addWidget(self.detailsLabel)

        self.buttonGroup = QFrame(self.card, objectName="buttonGroup")
        self.buttonLayout = QHBoxLayout(self.buttonGroup)
        self.buttonLayout.setContentsMargins(16, 12, 16, 12)
        self.buttonLayout.setSpacing(10)
        self.body.addWidget(self.buttonGroup)

    # ------------------------------------------------------- Qt API 兼容层

    def setWindowTitle(self, title: str) -> None:  # noqa: N802 - Qt 命名
        if hasattr(self, "titleLabel"):
            self.titleLabel.setText(title)
        super().setWindowTitle(title)

    def setWindowIcon(self, icon: QIcon) -> None:  # noqa: N802
        # Fluent 的对话框不画标题栏图标，收下即可。
        self._icon = icon

    def setText(self, text: str) -> None:  # noqa: N802
        self.contentLabel.setText(text)

    def setDetailedText(self, text: str | None) -> None:  # noqa: N802
        self.detailsLabel.setText(text or "")
        self.detailsLabel.setVisible(bool(text))

    def setInformativeText(self, text: str) -> None:  # noqa: N802
        self.setDetailedText(text)

    def setStandardButtons(self, buttons: StandardButton) -> None:  # noqa: N802
        self._buttons = buttons

    def setIcon(self, icon) -> None:  # noqa: N802 - 上游没用到，留着防将来
        pass

    # ------------------------------------------------------------- 执行

    def exec(self) -> StandardButton:
        self._buildButtons()
        super().exec()
        return self._result

    def _buildButtons(self) -> None:
        while self.buttonLayout.count():
            item = self.buttonLayout.takeAt(0)
            widget = item.widget()
            if widget is not None:
                widget.deleteLater()

        self.buttonLayout.addStretch()

        if self._buttons & (StandardButton.Yes | StandardButton.No):
            no_button = PushButton("No", self.buttonGroup)
            no_button.clicked.connect(lambda: self._finish(StandardButton.No))
            yes_button = PrimaryPushButton("Yes", self.buttonGroup)
            yes_button.clicked.connect(lambda: self._finish(StandardButton.Yes))
            self.buttonLayout.addWidget(no_button)
            self.buttonLayout.addWidget(yes_button)
            yes_button.setFocus()
        else:
            ok_button = PrimaryPushButton("OK", self.buttonGroup)
            ok_button.clicked.connect(lambda: self._finish(StandardButton.Ok))
            self.buttonLayout.addWidget(ok_button)
            ok_button.setFocus()

    def _finish(self, button: StandardButton) -> None:
        self._result = button
        if button is StandardButton.No:
            self.canceled.emit()
        self.accept()


# 上游把枚举写成 ``QMessageBox.StandardButton.Ok``（既是类型标注也是取值），所以
# 替身身上必须挂得住这个属性——否则 import 期就 AttributeError。
QMessageBox.StandardButton = StandardButton


class QProgressDialog(QDialog):
    """``QProgressDialog`` 的替身，接住上游用到的全部方法。

    这里**不铺遮罩**：上游 ``progress_dlg.py`` 会自己 ``move()`` 定位到父窗口
    中央，遮罩会把整个窗口盖住、让居中失去意义。
    """

    canceled = Signal()

    def __init__(
        self,
        labelText: str = "",
        cancelButtonText: str | None = None,
        minimum: int = 0,
        maximum: int = 100,
        parent: Optional[QWidget] = None,
    ):
        super().__init__(parent)
        self._canceled = False
        self._cancelable = cancelButtonText is not None

        self.setWindowFlag(Qt.Dialog, True)
        self.setWindowFlag(Qt.FramelessWindowHint, True)
        self.setAttribute(Qt.WA_TranslucentBackground, True)

        outer = QVBoxLayout(self)
        outer.setContentsMargins(*(SHADOW_MARGIN,) * 4)
        self.card = QFrame(self, objectName="centerWidget")
        outer.addWidget(self.card)
        FluentStyleSheet.DIALOG.apply(self.card)

        self.body = QVBoxLayout(self.card)
        self.body.setContentsMargins(24, 22, 24, 22)
        self.body.setSpacing(14)

        self.titleLabel = SubtitleLabel("", self.card)
        self.body.addWidget(self.titleLabel)

        self.textLabel = BodyLabel(labelText or "", self.card)
        self.textLabel.setWordWrap(True)
        self.body.addWidget(self.textLabel)

        self.bar = ProgressBar(self.card)
        self.bar.setRange(minimum, maximum)
        self.body.addWidget(self.bar)

        self.cancelButton = None
        if self._cancelable:
            row = QHBoxLayout()
            row.addStretch()
            self.cancelButton = PushButton(cancelButtonText, self.card)
            self.cancelButton.clicked.connect(self._onCancel)
            row.addWidget(self.cancelButton)
            self.body.addLayout(row)

        self.setFixedWidth(500)

    # --------------------------------------------------------- 上游契约

    def setWindowTitle(self, title: str) -> None:  # noqa: N802
        self.titleLabel.setText(title)
        super().setWindowTitle(title)

    def setWindowIcon(self, icon: QIcon) -> None:  # noqa: N802
        pass

    def setWindowFlags(self, flags) -> None:  # noqa: N802
        # 上游要的是「无标题栏的模态对话框」。强制无边框，别让原生标题栏回来。
        super().setWindowFlags((flags | Qt.FramelessWindowHint) & ~Qt.WindowTitleHint)

    def setLabelText(self, text: str) -> None:  # noqa: N802
        self.textLabel.setText(text)

    def setValue(self, value: int) -> None:  # noqa: N802
        self.bar.setValue(value)

    def setRange(self, minimum: int, maximum: int) -> None:  # noqa: N802
        self.bar.setRange(minimum, maximum)

    def wasCanceled(self) -> bool:  # noqa: N802
        return self._canceled

    def _onCancel(self) -> None:
        self._canceled = True
        self.canceled.emit()
        self.close()


class QInputDialog:
    """``QInputDialog`` 的最小替身——上游只用到 ``getText``。"""

    @staticmethod
    def getText(  # noqa: N802
        parent: Optional[QWidget],
        title: str,
        label: str,
        text: str = "",
        flags=Qt.WindowFlags(),
        inputMethodHints=Qt.ImhNone,
    ) -> tuple[str, bool]:
        dialog = _CardDialog(parent, masked=True)
        dialog.setWindowTitle(title)
        dialog.card.setMinimumWidth(360)

        dialog.body.addWidget(BodyLabel(label, dialog.card))
        edit = LineEdit(dialog.card)
        edit.setText(text)
        dialog.body.addWidget(edit)

        cancel = PushButton("Cancel", dialog.card)
        ok = PrimaryPushButton("OK", dialog.card)
        dialog.addButtons(cancel, ok)

        accepted = {"value": False}
        cancel.clicked.connect(dialog.reject)

        def _accept() -> None:
            accepted["value"] = True
            dialog.accept()

        ok.clicked.connect(_accept)
        edit.returnPressed.connect(_accept)

        edit.setFocus()
        edit.selectAll()
        dialog.exec()

        return edit.text(), accepted["value"]
