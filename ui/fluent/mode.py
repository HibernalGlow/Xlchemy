"""UI 模式开关。

本项目在 fork 里把界面迁移到 Fluent 设计，但上游 (JacobDev1/xl-converter) 的
界面还会持续演进。为了两者都能要，`ui/fluent/` 提供一层可关闭的接缝：

* ``fluent``  —— 使用 qfluentwidgets 控件与 Fluent 版面（默认）。
* ``classic`` —— 接缝全部退化为原生 Qt 行为，与上游界面逐像素一致。

模式必须在导入任何 UI 模块之前确定，因为这决定了 ``ui/fluent/qt.py`` 导出的是
Fluent 控件还是原生 Qt 类。
"""

from __future__ import annotations

import os

MODE_ENV_VAR = "XLCHEMY_UI"

FLUENT = "fluent"
CLASSIC = "classic"

_VALID_MODES = (FLUENT, CLASSIC)
_DEFAULT_MODE = FLUENT

_mode: str | None = None


def isFluent() -> bool:
    """Returns True when the Fluent UI layer is active."""
    return getMode() == FLUENT


def getMode() -> str:
    """Returns the active UI mode. Cached after the first call."""
    global _mode
    if _mode is None:
        raw = os.environ.get(MODE_ENV_VAR, _DEFAULT_MODE).strip().lower()
        _mode = raw if raw in _VALID_MODES else _DEFAULT_MODE
    return _mode


def setMode(mode: str) -> None:
    """Overrides the UI mode. Must be called before the UI modules are imported."""
    global _mode
    mode = str(mode).strip().lower()
    if mode not in _VALID_MODES:
        raise ValueError(f"Unknown UI mode \"{mode}\". Expected one of {_VALID_MODES}.")
    _mode = mode
