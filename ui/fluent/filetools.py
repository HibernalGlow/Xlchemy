"""文件列表的增强交互，只存在于 fluent 接缝里。

上游 ``ui/widgets/file_view.py`` 要守住「只改导入行」的约束，所以右键菜单与按
路径批量移除这些行为放在这个子类。``XLCHEMY_UI=classic`` 时 ``ui.fluent.views``
直接交回上游原件，界面回到上游原样。

路径一律取 ``item.text(2)``：上游把绝对路径放在第 3 列，第 1 列的 ``UserRole``
存的是加入时的目录锚点。
"""

from __future__ import annotations

import logging
import os

from PySide6.QtCore import QObject, QSize, Qt, QRunnable, QThreadPool, Signal
from PySide6.QtGui import QIcon, QPixmap
from PySide6.QtWidgets import QMenu

from core.preview import DEFAULT_THUMB_PX, loadPreview
from core.reveal import reveal
from ui.fluent.grouping import GroupingMixin
from ui.widgets.file_view import FileView as _UpstreamFileView

logger = logging.getLogger(__name__)


def _key(path: str) -> str:
    return os.path.normcase(os.path.normpath(str(path)))


class _ThumbSignals(QObject):
    """QRunnable 不能带信号，所以用一个桥对象把结果送回主线程。"""

    ready = Signal(str, object, int)  # path, QImage|None, generation


class _ThumbJob(QRunnable):
    def __init__(self, path: str, max_px: int, generation: int, signals: _ThumbSignals):
        super().__init__()
        self.path = path
        self.max_px = max_px
        self.generation = generation
        self.signals = signals
        self.setAutoDelete(True)

    def run(self) -> None:
        image = loadPreview(self.path, self.max_px)
        self.signals.ready.emit(self.path, image, self.generation)


class FileView(GroupingMixin, _UpstreamFileView):
    """上游列表 + 「在文件管理器中显示 / 从列表移除」+ 缩略图列 + 树/列表切换。"""

    def __init__(self, parent=None):
        super().__init__(parent)

        self._installGroupingState()
        self._thumbs_on = False
        self._thumb_px = DEFAULT_THUMB_PX
        # 每开关一次就 +1：晚到的结果靠它对代次，旧请求直接丢弃。
        self._thumb_generation = 0
        self._thumbSignals = _ThumbSignals(self)
        self._thumbSignals.ready.connect(self._applyThumb)
        self._thumbPool = QThreadPool(self)
        self._thumbPool.setMaxThreadCount(2)

    # ------------------------------------------------------------- 缩略图

    def thumbnailsEnabled(self) -> bool:
        return self._thumbs_on

    def setThumbnailsEnabled(self, enabled: bool) -> None:
        """图标画在第 0 列上：不加列，上游 ``text(2)`` 的那些假设原样成立。"""
        self._thumbs_on = bool(enabled)
        self._thumb_generation += 1

        if not self._thumbs_on:
            for item in self._fileItems():
                item.setIcon(0, QIcon())
            return

        self.setIconSize(QSize(self._thumb_px, self._thumb_px))
        self._requestThumbnails()

    def setThumbnailSize(self, max_px: int) -> None:
        self._thumb_px = max(16, int(max_px))
        if self._thumbs_on:
            self.setIconSize(QSize(self._thumb_px, self._thumb_px))
            self._requestThumbnails()

    def thumbnailSize(self) -> int:
        return self._thumb_px

    def _requestThumbnails(self) -> None:
        generation = self._thumb_generation
        queued = set()
        for item in self._fileItems():
            path = item.text(2)
            if not path or path in queued:
                continue
            queued.add(path)
            job = _ThumbJob(path, self._thumb_px, generation, self._thumbSignals)
            self._thumbPool.start(job)

    def _applyThumb(self, path: str, image, generation: int) -> None:
        if generation != self._thumb_generation or not self._thumbs_on:
            return
        if image is None:
            return  # 解不出来就留空，行本身照常可转换

        icon = QIcon(QPixmap.fromImage(image))
        for item in self._fileItems():
            if item.text(2) == path:
                item.setIcon(0, icon)

    def addItems(self, items) -> None:
        super().addItems(items)
        if self._thumbs_on:
            self._requestThumbnails()

    # ------------------------------------------------------------- 数据

    def allPaths(self) -> list:
        return [item.text(2) for item in self._orderedFiles()]

    def removePaths(self, paths) -> int:
        """Drop rows whose file path matches, keeping list order. Returns the count."""
        wanted = {_key(p) for p in paths}
        if not wanted:
            return 0

        root = self.invisibleRootItem()
        removed = 0
        for item in reversed(self._fileItems()):
            if _key(item.text(2)) in wanted:
                root.removeChild(item)
                removed += 1
        if removed:
            logging.debug(f"[FileView] Removed {removed} row(s) from the list")
            if self.grouped():
                self._rebuildGrouping()   # 目录被清空时标题也要跟着走
        return removed

    # ------------------------------------------------------------- 菜单

    def _menuTargets(self, item):
        """The right-clicked row wins unless it is part of the current selection."""
        selected = self.selectedItems()
        if item is not None and item not in selected:
            return [item]
        return list(selected) or ([item] if item is not None else [])

    def contextMenuEvent(self, event) -> None:
        pos = event.pos() if hasattr(event, "pos") else event.globalPosition().toPoint()
        item = self.itemAt(pos)
        targets = self._menuTargets(item)

        menu = QMenu(self)
        if targets:
            menu.addAction("Show in Folder", lambda: self._revealFirst(targets))
            label = "Remove from List"
            if len(targets) > 1:
                label = f"Remove from List ({len(targets)})"
            menu.addAction(label, lambda: self.removePaths([it.text(2) for it in targets]))
            menu.addSeparator()

        thumbs = menu.addAction("Show Thumbnails")
        thumbs.setCheckable(True)
        thumbs.setChecked(self.thumbnailsEnabled())
        thumbs.toggled.connect(self.setThumbnailsEnabled)

        grouped = menu.addAction("Group By Folder")
        grouped.setCheckable(True)
        grouped.setChecked(self.grouped())
        grouped.toggled.connect(self.setGrouped)

        menu.exec(self.mapToGlobal(pos))

    def _revealFirst(self, targets) -> None:
        if not targets:
            return
        path = targets[0].text(2)
        ok, message = reveal(path)
        if not ok:
            logging.warning(f"[FileView] Reveal failed: {message}")
