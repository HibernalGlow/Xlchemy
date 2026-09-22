"""控件接缝：上游 ``ui/`` 只从这里取 Qt 控件类。

用法就是把上游文件里的 ::

    from PySide6.QtWidgets import (QWidget, QPushButton, ...)

换成 ::

    from ui.fluent.qt import (QWidget, QPushButton, ...)

**名字一个不改**，于是：

* 上游文件到行尾仍是原样，合并上游时最多在这几行上撞一次冲突，而且是「同样的
  一行」；
* ``XLCHEMY_UI=classic`` 时这里全部返回原生 Qt 类，界面与上游逐像素一致，同一套
  代码可以来回对照；
* 将来上游新建的控件也自动走接缝，不需要我们再去补映射。

接缝交出去的类有两个硬约束，改这里之前先读完 ``adapters.py`` 的模块说明：

1. **必须是原生 Qt 类的子类。** ``WidgetManager`` 靠 ``isinstance`` 判定控件类型
   来决定状态怎么存取。凡是 qfluentwidgets 不满足这条的（``ComboBox`` 继承的是
   ``QPushButton``，且没有 ``QGroupBox``），都在 ``widgets.py`` 里自行实现。
2. **``__name__`` 必须是 Qt 的名字。** ``WidgetManager._getWidgetSubclass()`` 拿
   ``cls.__name__`` 去 match ``"QCheckBox"`` / ``"QComboBox"`` 这些字面量，名字一
   偏，控件的状态持久化就会静默失效。所以 ``adapters.py`` / ``widgets.py`` /
   ``dialogs.py`` / ``shell.py`` 里的类一律直接用 Qt 类名。

少数类在这个文件里做了重命名映射（``QScrollArea`` / ``QTreeWidget`` /
``QStyledItemDelegate``）：qfluentwidgets 里对得上号的那个类名不同，但它们既不参与
``isinstance`` 判定、也不参与 ``__name__`` 查表，所以直接别名即可。

**这个文件还负责装 i18n。** 见文件末尾那段：类交出去之前先给文字入口包一层拦截，
于是上游几百处硬编码英文不需要改成 ``tr()``，合并上游时不会多出冲突点。
``XLCHEMY_UI_I18N=0`` 可以关掉。
"""

from __future__ import annotations

import os

# ---------------------------------------------------------------------------
# 与视觉无关的类：两种模式下一律用原生实现。
# 布局、枚举、item 基类这些东西 Fluent 本来就没有替身，也不该有。
# ---------------------------------------------------------------------------
from PySide6.QtWidgets import (
    QAbstractItemView,
    QApplication,
    QButtonGroup,
    QDialog,
    QFileDialog,
    QFormLayout,
    QGridLayout,
    QHBoxLayout,
    QSizePolicy,
    QSpacerItem,
    QStyle,
    # 上游 ``ui/widgets/file_view.py`` 自己实现 ItemDelegate 并 ``setItemDelegate``，
    # 只用到「清掉焦点态 + 交给基类画」。Fluent 的 ``TreeItemDelegate`` 要一个真视图
    # （它会 ``self.parent().horizontalScrollBar()``），而上游是无参构造的，接不上；
    # 而且它自带一套行绘制，会跟 ``FileView`` 的 Fluent 样式表打架。所以保持原生。
    QStyledItemDelegate,
    QTreeWidgetItem,
    QVBoxLayout,
    QWidget,
)

from .mode import CLASSIC, FLUENT, getMode, isFluent, setMode  # noqa: F401 - 对外暴露

if getMode() == CLASSIC:
    # classic 模式：接缝必须是「透明的」。这里的每个名字都指向上游原本用的那个
    # 类，行为逐像素一致。
    from PySide6.QtWidgets import (
        QCheckBox,
        QComboBox,
        QDoubleSpinBox,
        QGroupBox,
        QInputDialog,
        QLabel,
        QLineEdit,
        QMainWindow,
        QMessageBox,
        QProgressDialog,
        QPushButton,
        QRadioButton,
        QScrollArea,
        QSlider,
        QSpinBox,
        QTabWidget,
        QTextEdit,
        QTreeWidget,
    )
else:
    from qfluentwidgets import (
        SmoothScrollArea as QScrollArea,
        TreeWidget as QTreeWidget,
    )

    # 这些模块里的类**就是用 Qt 的类名定义的**，所以这里是纯粹的搬运，没有别名。
    from .adapters import (
        QCheckBox,
        QDoubleSpinBox,
        QLabel,
        QLineEdit,
        QPushButton,
        QRadioButton,
        QSlider,
        QSpinBox,
    )
    from .dialogs import QInputDialog, QMessageBox, QProgressDialog
    from .shell import QMainWindow, QTabWidget
    from .widgets import QComboBox, QGroupBox, QTextEdit

# ---------------------------------------------------------------------------
# i18n：在把类交出去**之前**装好文字拦截。
#
# 位置很讲究。上游拿控件类的唯一入口就是这个接缝，所以在这里给 ``setText`` /
# ``setToolTip`` / ``setWindowTitle`` 包一层，之后任何走接缝建出来的控件都自动
# 经过翻译 —— 上游几百处硬编码英文一个字都不用改，也就不会多出合并冲突点。
#
# 传 ``globals()`` 而不是让 i18n 反向 import 本模块，是为了避免「接缝导入 i18n、
# i18n 又导入接缝」的循环。具体拦截范围与**为什么不翻下拉框**，见 ui/i18n/hooks.py。
if os.environ.get("XLCHEMY_UI_I18N", "1") not in ("0", "false", "no"):
    from ui.i18n import install as _installI18n

    _installI18n(globals())

__all__ = [
    "CLASSIC",
    "FLUENT",
    "QAbstractItemView",
    "QApplication",
    "QButtonGroup",
    "QCheckBox",
    "QComboBox",
    "QDialog",
    "QDoubleSpinBox",
    "QFileDialog",
    "QFormLayout",
    "QGridLayout",
    "QGroupBox",
    "QHBoxLayout",
    "QInputDialog",
    "QLabel",
    "QLineEdit",
    "QMainWindow",
    "QMessageBox",
    "QProgressDialog",
    "QPushButton",
    "QRadioButton",
    "QScrollArea",
    "QSizePolicy",
    "QSlider",
    "QSpacerItem",
    "QSpinBox",
    "QStyle",
    "QStyledItemDelegate",
    "QTabWidget",
    "QTextEdit",
    "QTreeWidget",
    "QTreeWidgetItem",
    "QVBoxLayout",
    "QWidget",
    "getMode",
    "isFluent",
    "setMode",
]
