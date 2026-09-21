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

from PySide6.QtWidgets import QMenu

from core.reveal import reveal
from ui.widgets.file_view import FileView as _UpstreamFileView


def _key(path: str) -> str:
    return os.path.normcase(os.path.normpath(str(path)))


class FileView(_UpstreamFileView):
    """上游列表 + 「在文件管理器中显示 / 从列表移除」。"""

    # ------------------------------------------------------------- 数据

    def allPaths(self) -> list:
        root = self.invisibleRootItem()
        return [root.child(i).text(2) for i in range(root.childCount())]

    def removePaths(self, paths) -> int:
        """Drop rows whose file path matches, keeping list order. Returns the count."""
        wanted = {_key(p) for p in paths}
        if not wanted:
            return 0

        root = self.invisibleRootItem()
        removed = 0
        for i in range(root.childCount() - 1, -1, -1):
            child = root.child(i)
            if _key(child.text(2)) in wanted:
                root.removeChild(child)
                removed += 1
        if removed:
            logging.debug(f"[FileView] Removed {removed} row(s) from the list")
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
        if not targets:
            return

        menu = QMenu(self)
        menu.addAction("Show in Folder", lambda: self._revealFirst(targets))
        menu.addSeparator()
        label = "Remove from List"
        if len(targets) > 1:
            label = f"Remove from List ({len(targets)})"
        menu.addAction(label, lambda: self.removePaths([it.text(2) for it in targets]))
        menu.exec(self.mapToGlobal(pos))

    def _revealFirst(self, targets) -> None:
        if not targets:
            return
        path = targets[0].text(2)
        ok, message = reveal(path)
        if not ok:
            logging.warning(f"[FileView] Reveal failed: {message}")
