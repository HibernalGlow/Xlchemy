"""复合视图的接缝：按模式决定交回上游原件还是 fluent 增强版。

和 ``ui.fluent.qt`` 同一套路数——上游文件里只改导入行、名字不变：

    from ui.widgets.file_view import FileView   ->   from ui.fluent.views import FileView

``classic`` 模式下这里就是上游那个类本身，增强行为一行都不生效。
"""

from __future__ import annotations

from .mode import CLASSIC, getMode

if getMode() == CLASSIC:
    from ui.widgets.file_view import FileView
else:
    from .filetools import FileView

__all__ = ["FileView"]
