"""把上游「QSS 时代」的尺寸约定翻译到 Fluent。

上游有一部分尺寸**不在布局里，而在样式表里**——它给控件挂一个动态属性，再让 QSS
按属性选择器定宽::

    self.theme_cmb.setProperty("class", "min_width_cmb")

    /* ui/theme/stylesheet.py */
    QComboBox[class="min_width_cmb"] { min-width: 116px; }

Fluent 模式下我们不套上游的 QSS（两边规则会互相污染），这些属性就成了哑的：主题
下拉框会缩成刚好装下文字的宽度，一排控件看起来长短不齐。

这里把那几个约定直接实现出来，而不是再写一份 QSS——用 Python 定宽不依赖选择器
优先级，也不会被 Fluent 自己的控件样式表盖掉（Fluent 的样式是挂在**控件**上的，
app 级 QSS 在冲突时压不过它）。
"""

from __future__ import annotations

from PySide6.QtCore import QEvent

# 与 ui/theme/stylesheet.py 里的 min-width 逐条对应。改这里之前先去那边对一下，
# 免得两边悄悄漂移。
MIN_WIDTH_BY_CLASS: dict[str, int] = {
    "min_width_l": 84,
    "min_width_cmb": 116,
    "min_width_sb": 84,
}


class ClassMinWidthMixin:
    """让 ``class="min_width_*"`` 这个约定在 Fluent 下继续生效。

    上游是在控件**建好之后**才 ``setProperty`` 的（见 ``settings_tab.setStyles``），
    所以光在构造函数里读一次不够，得盯住 ``DynamicPropertyChange``。
    """

    def syncClassMinWidth(self) -> None:
        """Applies the min-width that the widget's `class` property asks for."""
        width = MIN_WIDTH_BY_CLASS.get(self.property("class"))  # type: ignore[attr-defined]
        if width is not None:
            self.setMinimumWidth(width)  # type: ignore[attr-defined]

    def event(self, event):  # noqa: N802 - Qt 命名
        if event.type() == QEvent.DynamicPropertyChange:
            self.syncClassMinWidth()
        return super().event(event)  # type: ignore[misc]
