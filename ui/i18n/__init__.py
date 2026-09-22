"""i18n：译文目录 + 接缝拦截 + 运行时切换。

用法（自己的代码里）::

    from ui.i18n import tr
    button.setText(tr("Reset"))

上游代码里**什么都不用写** —— 它们走 ``ui.fluent.qt`` 建出来的控件会自动经过
翻译，原理见 :mod:`ui.i18n.hooks`。

为什么不是 ``tr()`` 而是「按原文查表」，请看 :mod:`ui.i18n.catalog` 的说明：核心
约束是**不能给上游文件添合并冲突点**，所以译文必须以英文原文为主键、在控件边界上
生效，而不是在几百个调用点上插桩。

这一层刻意**不在导入期依赖 Qt**（Qt 都是函数内导入），于是抽取/校验工具可以在没有
Qt、没有显示器的环境里直接 ``import ui.i18n``。
"""

from .catalog import (
    SOURCE_TAG,
    Catalog,
    availableTags,
    loadCatalog,
    resolveTag,
)
from .hooks import RECORD_PROPERTY, collectSources, install
from .runtime import (
    ENV_VAR,
    availableLanguages,
    currentLanguage,
    ensureReady,
    onLanguageChanged,
    retranslateAll,
    setLanguage,
    tr,
)

__all__ = [
    "ENV_VAR",
    "RECORD_PROPERTY",
    "SOURCE_TAG",
    "Catalog",
    "availableLanguages",
    "availableTags",
    "collectSources",
    "currentLanguage",
    "ensureReady",
    "install",
    "loadCatalog",
    "onLanguageChanged",
    "resolveTag",
    "retranslateAll",
    "setLanguage",
    "tr",
]
