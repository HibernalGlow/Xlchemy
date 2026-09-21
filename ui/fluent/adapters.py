"""把 qfluentwidgets 的控件包装成上游认得的 Qt 控件。

上游代码是按原生 Qt 类的用法写的，例如 ``QPushButton("Reset", clicked=fn)``、
``Slider(Qt.Horizontal)``、``QLabel("Scale to")``。qfluentwidgets 里同名的控件不吃
这些参数，直接替换会在运行期抛 TypeError。这里逐个补齐签名差异，让接缝真的能
「换类不换用法」。

**类名就是 Qt 类名。** 这不是洁癖：``ui/lib/widget_manager.py`` 的
``_getWidgetSubclass()`` 是靠 ``cls.__name__`` 反过来查表的::

    for w in (QCheckBox, QSpinBox, QComboBox, ...):
        if isinstance(widget, w):
            return w.__name__          # ← 拿这个名字去 match "QCheckBox" 等字面量

也就是说名字本身就是**契约的一部分**。所以这里的类一律叫 ``QCheckBox`` 这种
上游认得的名字，而不是 ``CheckBox``。

两个坑，值得先看清楚再读下面的代码：

**坑一，重载派发。** ``PushButton`` / ``CheckBox`` / ``RadioButton`` / ``Label``
的 ``__init__`` 是用 ``singledispatchmethod`` 写的，按**第一个位置参数的类型**
重载，其中 ``(text, parent)`` 那一支内部是这行::

    @__init__.register
    def _(self, text: str, parent: QWidget = None):
        self.__init__(parent)      # ← 实例调用，会派发回子类
        self.setText(text)

注意 ``self.__init__(...)`` 是**实例**调用。子类只要覆写 ``__init__``，这句就会
重新进入子类的实现：``PushButton("Reset")`` 会把父窗口 ``None`` 当成 ``text`` 再走
一遍，撑成 ``TypeError``；``Label`` 那条更狠，直接无限递归到 ``RecursionError``。

所以这里的包装类**不覆写 ``__init__`` 的语义**，而是用 :func:`_baseInit` 显式调用
基类的「默认分支」——从**类**上取 ``__init__``，派发依据变成 ``type(self)``，而它
永远不是 ``str`` / ``Qt.Orientation`` / ``QIcon``，于是稳定落到默认分支，全程不重入。

**坑二，默认方向。** Fluent 的 ``Slider`` 是竖的，Qt 的 ``QSlider`` 是横的，而上游
（``ui/widgets/slider.py``）的点击换算是按横向宽度算的，必须把默认值掰回来。
"""

from __future__ import annotations

from typing import Any

from PySide6.QtCore import Qt
from PySide6.QtWidgets import QWidget

from qfluentwidgets import (
    BodyLabel as _BodyLabel,
    CheckBox as _CheckBox,
    DoubleSpinBox as _DoubleSpinBox,
    LineEdit as _LineEdit,
    PushButton as _PushButton,
    RadioButton as _RadioButton,
    Slider as _Slider,
    SpinBox as _SpinBox,
)

from .sizing import ClassMinWidthMixin


def _splitCtorArgs(
    args: tuple, kwargs: dict[str, Any], *, allows_icon: bool = False
) -> tuple[str | None, QWidget | None, Any, dict[str, Any]]:
    """Splits Qt's positional constructor overloads into ``(text, parent, icon, signals)``.

    Qt 给这一族控件都准备了两套构造：``QPushButton(parent)`` 与
    ``QPushButton(text, parent)``；按钮还多一个 ``QPushButton(icon, text, parent)``。
    上游两边都在用——``QPushButton(self)`` 与 ``QPushButton("Reset")``——而
    qfluentwidgets 只认后者。所以这里按 Qt 自己的规则认第一个位置参数：

    * 是 ``QWidget`` → 当父窗口；
    * 是 ``str``（或 ``allows_icon`` 下不是字符串）→ 当文字（或图标）。

    剩下的按 ``text`` / ``parent`` / ``icon`` 的顺序吃干（或从同名关键字参数取）。
    """
    parent = kwargs.pop("parent", None)
    text = kwargs.pop("text", None)
    icon = kwargs.pop("icon", None)
    rest = list(args)

    if rest and isinstance(rest[0], QWidget):
        parent = rest.pop(0)
    elif allows_icon and rest and not isinstance(rest[0], str):
        icon = rest.pop(0)

    if rest:
        text = rest.pop(0)
    if rest:
        parent = rest.pop(0)
    if rest:
        icon = rest.pop(0)
    if rest:
        raise TypeError(f"too many positional arguments ({len(args)})")

    return text, parent, icon, kwargs


def _baseInit(cls: type, self: QWidget, parent: QWidget | None = None) -> None:
    """Runs `cls`'s default constructor branch, bypassing its overload dispatch.

    Accessing ``__init__`` on the *class* makes ``singledispatchmethod`` dispatch on
    ``type(self)`` instead of on the first argument, which always lands on the
    default branch. See the module docstring for why that matters.
    """
    cls.__init__(self, parent)  # type: ignore[misc]


def _connectSignals(obj: QWidget, signals: dict[str, Any]) -> None:
    """Connects Qt-style ``**signals`` keyword arguments."""
    for name, slot in signals.items():
        signal = getattr(obj, name, None)
        if signal is None or not hasattr(signal, "connect"):
            raise TypeError(
                f"{type(obj).__name__}() got an unexpected keyword argument '{name}'"
            )
        signal.connect(slot)


class QPushButton(_PushButton):
    """``QPushButton([text][, parent][, icon], **signals)``。"""

    def __init__(self, *args: Any, **kwargs: Any):
        text, parent, icon, signals = _splitCtorArgs(args, kwargs, allows_icon=True)
        _baseInit(_PushButton, self, parent)
        if text:
            self.setText(text)
        if icon is not None:
            self.setIcon(icon)
        _connectSignals(self, signals)


class QCheckBox(_CheckBox):
    """``QCheckBox([text][, parent], **signals)``。"""

    def __init__(self, *args: Any, **kwargs: Any):
        text, parent, _, signals = _splitCtorArgs(args, kwargs)
        _baseInit(_CheckBox, self, parent)
        if text:
            self.setText(text)
        _connectSignals(self, signals)


class QRadioButton(_RadioButton):
    """``QRadioButton([text][, parent], **signals)``。"""

    def __init__(self, *args: Any, **kwargs: Any):
        text, parent, _, signals = _splitCtorArgs(args, kwargs)
        _baseInit(_RadioButton, self, parent)
        if text:
            self.setText(text)
        _connectSignals(self, signals)


class QSlider(_Slider):
    """``QSlider(orientation=Qt.Horizontal[, parent], **signals)``。

    ``Slider`` 的重载分支不重入 ``self.__init__``（它走的是 ``super().__init__``），
    所以这个类可以放心地用 ``super()`` 调过去，不需要 :func:`_baseInit`。
    """

    def __init__(
        self,
        orientation: Qt.Orientation = Qt.Horizontal,
        parent: QWidget | None = None,
        **signals: Any,
    ):
        super().__init__(orientation, parent)
        _connectSignals(self, signals)


class QSpinBox(ClassMinWidthMixin, _SpinBox):
    """``QSpinBox([parent], **signals)``。"""

    def __init__(self, *args: Any, **kwargs: Any):
        _, parent, _, signals = _splitCtorArgs(args, kwargs)
        _baseInit(_SpinBox, self, parent)
        _connectSignals(self, signals)


class QDoubleSpinBox(ClassMinWidthMixin, _DoubleSpinBox):
    """``QDoubleSpinBox([parent], **signals)``。"""

    def __init__(self, *args: Any, **kwargs: Any):
        _, parent, _, signals = _splitCtorArgs(args, kwargs)
        _baseInit(_DoubleSpinBox, self, parent)
        _connectSignals(self, signals)


class QLineEdit(_LineEdit):
    """``QLineEdit([text][, parent], **signals)``。

    上游只用到 ``QLineEdit()``；这里按 Qt 的签名把 ``text`` / ``parent`` 都接住。
    """

    def __init__(self, *args: Any, **kwargs: Any):
        text, parent, _, signals = _splitCtorArgs(args, kwargs)
        super().__init__(parent)
        if text:
            self.setText(text)
        _connectSignals(self, signals)


class QLabel(ClassMinWidthMixin, _BodyLabel):
    """``QLabel([text][, parent], **signals)``。

    上游 ``ui/widgets/label.py`` 的 ``StyledLabel`` 会 ``super().__init__()``
    不带参数，这里也要能接住。
    """

    def __init__(self, *args: Any, **kwargs: Any):
        text, parent, _, signals = _splitCtorArgs(args, kwargs)
        _baseInit(_BodyLabel, self, parent)
        if text:
            self.setText(text)
        _connectSignals(self, signals)
