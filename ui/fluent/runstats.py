"""运行统计面板与「移除已完成」，挂在壳的自绘标题栏上。

刻意只做两件事：把无 Qt 的层算好的数字摆出来，以及把「已判定的行」交给
``FileView.removePaths()``。统计口径一律在 ``data/analysis.py`` 里，这里不重算，
所以 PySide6 界面、后续 Fluent 改版、命令行报告都能共用同一套数。

按钮挂在标题栏而不是标签栏行：``_installLanguageButton()`` 已经验证过那里是
稳定位置（右侧窗口按钮在 macOS 上被交通灯取代、处于隐藏）。

``self.controller`` / ``self.input_tab`` 在 ``_setupShell()`` 时还不存在，所以
全部在点击那一刻再取 —— 不在装配期建立顺序依赖。
"""

from __future__ import annotations

import logging
from typing import Optional

from PySide6.QtCore import Qt
from PySide6.QtWidgets import QGridLayout, QLabel
from qfluentwidgets import FluentIcon, MessageBoxBase, ToolButton

from data.analysis import build_input_snapshot, build_output_snapshot
from data.file_list import reported_paths
from ui.i18n import tr

logger = logging.getLogger(__name__)

SECTION_INPUT = "Input"
SECTION_OUTPUT = "Output"


def _fileView(window):
    return getattr(getattr(window, "input_tab", None), "file_view", None)


def _snapshot(window):
    controller = getattr(window, "controller", None)
    if controller is None:
        return None
    return controller.getRunSnapshot()


def collectStats(window):
    """Return (InputSnapshot, OutputSnapshot) for the last run, or (None, None)."""
    snapshot = _snapshot(window)
    if snapshot is None or not snapshot.records:
        return (None, None)

    paths = [record.path for record in snapshot.records if record.path]
    return (build_input_snapshot(paths), build_output_snapshot(snapshot))


def completedPaths(window) -> list:
    """Paths the last run already reported on (converted / skipped / failed)."""
    snapshot = _snapshot(window)
    if snapshot is None:
        return []
    return reported_paths(snapshot)


def removeCompleted(window) -> int:
    """Drop the rows the last run already reported on. Returns the count removed."""
    view = _fileView(window)
    if view is None:
        logger.warning("[runstats] No file view to prune")
        return 0

    paths = completedPaths(window)
    if not paths:
        logger.info("[runstats] Nothing reported on yet, list left as is")
        return 0

    removed = view.removePaths(paths)
    logger.info(f"[runstats] Removed {removed} completed row(s)")
    return removed


class RunStatsDialog(MessageBoxBase):
    """两段式统计：输入快照 + 输出快照，行内容直接来自 as_rows()。"""

    def __init__(self, window, parent: Optional[QLabel] = None):
        super().__init__(window)

        inputs, outputs = collectStats(window)
        self.viewLayout.setSpacing(10)

        if inputs is None or outputs is None:
            self.viewLayout.addWidget(QLabel(tr("No conversion has run yet."), self))
        else:
            self._addSection(SECTION_INPUT, inputs.as_rows())
            self._addSection(SECTION_OUTPUT, outputs.as_rows())

        self.yesButton.setText(tr("Close"))
        self.cancelButton.hide()
        self.buttonLayout.insertStretch(0, 1)

    def _addSection(self, title: str, rows) -> None:
        header = QLabel(tr(title), self)
        header.setObjectName("titleLabel")
        self.viewLayout.addWidget(header)

        grid = QGridLayout()
        grid.setHorizontalSpacing(18)
        grid.setVerticalSpacing(3)
        for index, (label, value) in enumerate(rows):
            grid.addWidget(QLabel(tr(label), self), index, 0, Qt.AlignLeft)
            grid.addWidget(QLabel(str(value), self), index, 1, Qt.AlignRight)
        self.viewLayout.addLayout(grid)


class RunStatsButton(ToolButton):
    """标题栏上的统计入口。"""

    def __init__(self, window, parent=None):
        super().__init__(parent)
        self._window = window
        self.setIcon(FluentIcon.INFO)
        self.setFixedSize(32, 32)
        # 喂英文原文：setToolTip 被 i18n 拦截，它自己会翻并登记原文。
        self.setToolTip("Run Statistics")
        self.clicked.connect(self._show)

    def _show(self) -> None:
        RunStatsDialog(self._window, self).exec()


class RemoveCompletedButton(ToolButton):
    """把上一轮已经判定的行从列表里去掉。"""

    def __init__(self, window, parent=None):
        super().__init__(parent)
        self._window = window
        self.setIcon(FluentIcon.REMOVE_FROM)
        self.setFixedSize(32, 32)
        self.setToolTip("Remove Completed From List")
        self.clicked.connect(self._prune)

    def _prune(self) -> None:
        removed = removeCompleted(self._window)
        if not removed:
            logger.info("[runstats] Remove Completed: nothing to do")
