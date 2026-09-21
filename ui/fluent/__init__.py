"""Fluent UI 层。

这个包是 fork 对上游界面做的全部改动，周围包着一个刻意的约束：**上游文件只改
导入行**。具体地说：

* ``ui/*.py`` 里的 ``from PySide6.QtWidgets import ...`` 换成
  ``from ui.fluent.qt import ...``，名字不变、逻辑不变；
* ``ui/theme/theme_manager.py`` 里 ``setTheme`` 多一次「是否由 Fluent 接管」的
  询问；
* ``main.py`` 的窗口与容器两类由接缝决定。

这样上游继续演进时，合并冲突被限制在少数几行导入上；而 ``XLCHEMY_UI=classic``
可以让整条接缝退化成原生 Qt，界面回到上游原样，用来做对照。

**本模块故意不导入任何子模块**：``classic`` 模式下不该碰 qfluentwidgets。想拿
那些类请显式导入 ``ui.fluent.qt`` / ``ui.fluent.shell``。
"""

from __future__ import annotations

from .mode import CLASSIC, FLUENT, getMode, isFluent, setMode

__all__ = ["CLASSIC", "FLUENT", "getMode", "isFluent", "setMode"]
