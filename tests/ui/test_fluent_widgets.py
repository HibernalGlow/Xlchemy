"""Fluent 接缝的控件层 —— 只盯「必须真的走一遍路径才会暴露」的故障。

背景（真实踩过，P0）：``QComboBox.showPopup()`` 里调 ``self._animType(menu)``，
而同在 ``ui/fluent/widgets.py`` 的 ``_animType`` 只定义成 ``(self)`` —— 参数对不上。
后果不是某处小毛病，而是 fluent 壳下**每一个**下拉框点开都抛 ``TypeError``、菜单
根本建不起来，用户看到的就是「下拉框点不开」。当时整套测试全绿，因为**没有任何
一个用例真的调用过 ``showPopup()``**。

所以这里盯两件事：

1. **弹层那条路径要真的走一遍。** 接缝覆写了基类的哪个方法，就得真的跑一次那条路径；
   光靠「类能实例化」「文本能读出来」是发现不了这个 bug 的。
2. **接缝类不得定义与基类同名的私有方法。** 那种覆盖不报错，只在基类自己调用它时
   静默跑偏 —— 这是同一个 bug 的另一半成因（当时它叫 ``_animType``，与基类的
   弹层逻辑撞名，现已改名 ``_menuAnimationType``）。
"""

import importlib
import inspect
import pkgutil

import pytest


# ------------------------------------------------------- 弹层：真的走一遍

def test_combo_popup_actually_builds_a_menu(app):
    """弹一次下拉框。修复前这里抛 TypeError，弹层永远建不起来。"""
    from ui.fluent.qt import QComboBox

    combo = QComboBox()
    combo.addItems(["Alpha", "Beta", "Gamma"])
    assert combo.count() == 3

    combo.showPopup()  # ← 回归点

    assert combo._menu is not None, "下拉框的弹层没建起来"

    combo.hidePopup()


def test_combo_popup_is_a_noop_when_already_open_or_empty(app):
    """空下拉框不该弹层；已经开着的也不该重复建。"""
    from ui.fluent.qt import QComboBox

    empty = QComboBox()
    empty.showPopup()
    assert empty._menu is None

    combo = QComboBox()
    combo.addItems(["Alpha"])
    combo.showPopup()
    opened = combo._menu
    combo.showPopup()  # 第二次不该换掉同一个弹层
    assert combo._menu is opened

    combo.hidePopup()


# ------------------------------------------------------- 撞名：静态守卫

def _seamClasses():
    """遍历 ui/fluent 下每个模块里「本模块定义」的类。"""
    import ui.fluent as package

    for info in pkgutil.iter_modules(package.__path__):
        if info.name.startswith("_"):
            continue
        try:
            module = importlib.import_module(f"ui.fluent.{info.name}")
        except Exception:  # noqa: BLE001 - 有些模块 import 要完整运行时，跳过
            continue
        for name, obj in vars(module).items():
            if inspect.isclass(obj) and obj.__module__ == module.__name__:
                yield f"{info.name}.{name}", obj


def test_seam_classes_do_not_shadow_baseclass_private_methods():
    """接缝类不得定义与基类同名的私有方法。

    公开方法（``showPopup`` / ``paintEvent`` / ``addItems`` …）的覆写是**有意**的，
    不在此列。只盯单下划线开头的内部方法：那本该是各管各的，重名一定意味着
    有人无意中把基类的实现顶掉了。
    """
    offenders = []

    for label, cls in _seamClasses():
        own = {
            name
            for name, member in vars(cls).items()
            if name.startswith("_") and not name.startswith("__") and callable(member)
        }
        if not own:
            continue
        # 只看接缝层之外的基类（ui.fluent 内部互相继承是有意的）
        bases = [b for b in cls.__mro__[1:] if not b.__module__.startswith("ui.fluent")]
        if not bases:
            continue
        inherited = {
            name
            for name in dir(bases[0])
            if name.startswith("_") and not name.startswith("__")
        }
        for name in sorted(own & inherited):
            offenders.append(f"{label}.{name} 盖住了 {bases[0].__name__}.{name}")

    assert not offenders, (
        "这些私有方法把基类的同名方法顶掉了，基类自己调用时会静默跑偏：\n  "
        + "\n  ".join(offenders)
    )


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-v"]))


# ------------------------------------------------- 箭头图标：别每次重绘都重建

def test_arrowIcon_builds_once_per_appearance(app):
    """``paintEvent`` 里现做 icon() 会重读并重写 SVG 源，每次重绘都付一遍。"""
    from unittest.mock import MagicMock, patch
    from PySide6.QtGui import QColor

    import ui.fluent.widgets as widgets

    widgets._ARROW_ICONS.clear()
    fake = MagicMock(name="FluentIcon")
    fake.ARROW_DOWN.icon.side_effect = lambda color: f"icon-{color.name()}-{color.alpha()}"

    with patch.object(widgets, "FluentIcon", fake):
        color = QColor(10, 20, 30)
        first = widgets.arrowIcon(color, True)
        second = widgets.arrowIcon(color, True)
        disabled = widgets.arrowIcon(color, False)

    assert first == second
    assert fake.ARROW_DOWN.icon.call_count == 2, "同一副外观只应该造一次图标"
    assert disabled != first
    # 禁用态仍然是 90 alpha，和改动前 paintEvent 里的写法一致
    assert fake.ARROW_DOWN.icon.call_args_list[1].kwargs["color"].alpha() == 90
    assert fake.ARROW_DOWN.icon.call_args_list[0].kwargs["color"].alpha() == 255


def test_arrowIcon_returns_a_real_qicon_per_color(app):
    from PySide6.QtGui import QColor, QIcon

    import ui.fluent.widgets as widgets

    widgets._ARROW_ICONS.clear()
    black = widgets.arrowIcon(QColor("black"), True)
    white = widgets.arrowIcon(QColor("white"), True)

    assert isinstance(black, QIcon)
    assert black is widgets.arrowIcon(QColor("black"), True)
    assert black is not white
