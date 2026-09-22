"""列表 / 树两种视图的切换（树 = 按所在目录插分组标题行）。

刻意**不**把文件项 re-parent 到目录节点下面：上游 ``ui/widgets/file_view.py``
里有八处导航逻辑按「每一行都是根的直接子项」写死（``topLevelItem(i)``、
``root.child(0)``、``selectShift`` 逐行 setSelected、Home/End、moveIndex*）。
一旦分层，这些会静默错位 —— 而 ``getItems()`` 是喂给转换队列的唯一来源，错一行
就是少转或多转一张图。

所以树模式只做一件事：在每个目录的第一行前面插一条**不可选中**的分组标题。
文件项的层级不变，上游逻辑原样可用；代价是要在少数几处把标题行滤掉，集中在
本模块里。
"""

from __future__ import annotations

import os

from PySide6.QtCore import Qt
from PySide6.QtWidgets import QTreeWidgetItem

FOLDER_MARK = Qt.UserRole + 3
FOLDER_TEXT_COLUMN = 0


def isFolderItem(item) -> bool:
    return bool(item and item.data(FOLDER_TEXT_COLUMN, FOLDER_MARK))


class GroupingMixin:
    """混在 ``FileView`` 前面用，负责分组标题的插入与过滤。"""

    def _installGroupingState(self) -> None:
        self._grouped = False
        self._preGroupFiles: list = []

    def grouped(self) -> bool:
        return getattr(self, "_grouped", False)

    # ------------------------------------------------------------- 遍历

    def _fileItems(self) -> list:
        """所有真正的文件行（跳过分组标题）。"""
        root = self.invisibleRootItem()
        return [
            root.child(i) for i in range(root.childCount())
            if not isFolderItem(root.child(i))
        ]

    # ------------------------------------------------------------- 切换

    def setGrouped(self, enabled: bool) -> None:
        if not hasattr(self, "_grouped"):
            self._installGroupingState()

        enabled = bool(enabled)
        if enabled and not self._grouped:
            # 分组会按目录把行聚到一块，行序就变了；而 order == "Original" 时
            # 行序就是转换顺序，所以先记下切换前的顺序，退回列表时还原。
            self._preGroupFiles = self._fileItems()
        self._grouped = enabled
        self.setRootIsDecorated(enabled)
        self._rebuildGrouping()

    def toggleGrouped(self) -> bool:
        self.setGrouped(not self.grouped())
        return self.grouped()

    def _orderedFiles(self) -> list:
        """文件行的「队列顺序」：分组期间也按切换前的顺序，新加的排在末尾。

        视图怎么排是视图的事，``getItems()`` 喂给转换的顺序不能因为切了个
        视图就变 —— order == "Original" 时行序就是处理顺序。
        """
        files = self._fileItems()
        if not self._grouped or not self._preGroupFiles:
            return files
        remembered = [item for item in self._preGroupFiles if item in files]
        extras = [item for item in files if item not in remembered]
        return remembered + extras

    def _rebuildGrouping(self) -> None:
        """按当前顺序重排：同目录的文件聚到一起，每组前插一条标题。

        目录的出现顺序按「该目录第一次出现」定，目录内保持原有行序 —— 所以分组
        本身不会推翻 ``sortByOrder`` 的结果，只是把同一目录的行收到一块。
        """
        root = self.invisibleRootItem()
        files = self._fileItems()

        for item in list(files):
            root.takeChild(root.indexOfChild(item))
        self._dropFolderHeaders()

        if not self._grouped:
            # 这里必须用上面捕获的 files：此刻子项已经被 takeChild 摘走，再查一次
            # 树只会拿到空表。
            remembered = [item for item in self._preGroupFiles if item in files]
            extras = [item for item in files if item not in remembered]
            root.addChildren(remembered + extras)
            return

        buckets: dict = {}
        for item in files:
            buckets.setdefault(os.path.dirname(item.text(2)), []).append(item)

        ordered: list = []
        for folder, members in buckets.items():
            ordered.append(self._makeHeader(folder))
            ordered.extend(members)
        root.addChildren(ordered)

    def _makeHeader(self, folder: str) -> QTreeWidgetItem:
        header = QTreeWidgetItem((folder or "/", "", ""))
        header.setData(FOLDER_TEXT_COLUMN, FOLDER_MARK, True)
        # 只留 Enabled：不可选中、不可编辑，键盘走位与批量选择都会跳过它。
        header.setFlags(Qt.ItemIsEnabled)
        return header

    def _dropFolderHeaders(self) -> None:
        root = self.invisibleRootItem()
        for i in range(root.childCount() - 1, -1, -1):
            child = root.child(i)
            if isFolderItem(child):
                root.removeChild(child)

    # --------------------------------------------------- 上游那几处的过滤

    def getItems(self):
        """喂给转换队列的来源：只出文件行，且顺序不随视图切换而变。"""
        return [
            (child.text(2), child.data(0, Qt.UserRole))
            for child in self._orderedFiles()
        ]

    def removeDuplicates(self):
        unique_items = set()
        root = self.invisibleRootItem()
        for item in reversed(self._fileItems()):
            path = item.text(2)
            if path in unique_items:
                root.removeChild(item)
            else:
                unique_items.add(path)

    def sortByOrder(self, order: str) -> None:
        """排完再重插标题，否则标题会和它下面那组走散。"""
        super().sortByOrder(order)
        if self.grouped():
            self._rebuildGrouping()

    def addItems(self, items) -> None:
        super().addItems(items)
        if self.grouped():
            self._rebuildGrouping()
