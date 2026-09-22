"""接缝拦截：在控件「设置文字」的那一刻查表翻译。

上游有 200 多处面向用户的文案，全部是硬编码的英文。要让它们变中文，常规做法是
在每一处包一层 ``tr()`` —— 但那会给上游文件添 200 多个合并冲突点，而且上游每次
改文案都会再撞一次。所以这里换个位置插手：**不去改调用点，去改控件本身**。

上游拿到控件类的唯一入口是接缝 ``ui.fluent.qt``（``from ui.fluent.qt import QLabel``）。
于是只要在接缝把类交出去之前，把 ``setText`` / ``setToolTip`` / ``setWindowTitle``
这几个方法包一层，之后**任何**走接缝建出来的控件都自动经过翻译 —— 上游一行不动。

三条纪律，改这里之前先读：

**一，只挂在「纯展示」的入口上。** 上游把不少控件的**文本当数据用**::

    if self.format_cmb.currentText() == "JPEG XL": ...
    setTheme(self.theme_cmb.currentText())
    widget_states[key] = self.widgets[key].currentText()

所以 ``QComboBox.addItem/addItems``、``QLineEdit.setText``、
``QTreeWidgetItem.setText`` 这些**一律不碰** —— 一旦翻了，比较逻辑立刻失配，
而且失败方式是静默的（设置读不回来、格式判断走错分支）。``_TEXT_TARGETS`` 里只
放标签类控件：它们只被画出来、从不被读回去做判断。

**二，查询是精确匹配。** 表里没有的原文原样返回，所以 ``f".{ext.upper()}"`` 这种
运行时拼出来的串（``.PNG``）不会被误伤，没翻译的句子也只是保持英文。

**三，原文要登记。** 文本是在「设置的那一刻」就翻好的，切语言时旧文字不会自己
变。所以每次拦截都顺手把**英文原文**记在控件自己的动态属性上，切语言时照着原文
重翻一遍（:func:`reapply`）。记在动态属性而不是 Python 字典里，是因为 PySide 的
包装对象可能被回收重建，而 C++ 对象上的动态属性不会跟着丢。

**四，构造文本要单独补一刀。** 原生 Qt 把 ``QLabel("Theme")`` 的文字设在 C++ 侧，
**不经过** ``setText``，所以光拦 setter 对「构造出来那批」无效 —— classic 模式下
整屏都会是英文。:func:`install` 因此拿抽取工具那张 ``CTOR_TEXT_INDEX`` 表把
``__init__`` 也包了一层：先照原样构造，再显式调一次被包裹的 setter（登记 + 翻译）。
两模式行为因此一致，位置定义也只有一份。
"""

from __future__ import annotations

import functools
import json
import logging
from typing import Any, Mapping, Optional

from .runtime import tr

logger = logging.getLogger(__name__)

#: 登记用的动态属性名。值是 JSON 串：``{方法名: 原文}``。原文通常是字符串，但表头
#: 那种走的是**整串**（``list[str]``），所以值的类型是 ``Any``。
RECORD_PROPERTY = "_xlI18n"

#: 「文本就是显示内容」的控件与方法。**不要**往里加 QComboBox / QLineEdit /
#: QTreeWidgetItem —— 理由见模块说明第一条。
_TEXT_TARGETS: dict[str, tuple[str, ...]] = {
    "QLabel": ("setText",),
    "QPushButton": ("setText",),
    "QCheckBox": ("setText",),
    "QRadioButton": ("setText",),
    "QGroupBox": ("setTitle",),
    "QTextEdit": ("setPlaceholderText",),
    # 这两个控件**只**开放占位符：``setText`` / ``addItem`` 装的是数据，不能碰。
    "QLineEdit": ("setPlaceholderText",),
    "QComboBox": ("setPlaceholderText",),
    # 这两个类**自己覆写**了 setWindowTitle，所以必须把方法挂在**它们自己**身上才
    # 拦得住（挂基类会被覆写挡住）。它们内部又会调 ``super().setWindowTitle()``，
    # 于是同一句会经过两个包裹入口 —— 由 :func:`_isAlreadyTranslated` 保证幂等。
    "QMessageBox": ("setText", "setInformativeText", "setDetailedText", "setWindowTitle"),
    "QProgressDialog": ("setLabelText", "setWindowTitle"),
    "QInputDialog": ("setLabelText",),
}

#: 任何控件都有的两个「纯展示」入口，直接挂到基类上，一网打尽。
_ANY_WIDGET_TARGETS: tuple[str, ...] = ("setToolTip", "setWindowTitle")

#: 给 ``ui.i18n.extract`` 复用的公开别名 —— 抽取工具必须和运行时拦截**用同一份
#: 面定义**，否则「抽取到的」和「真的会被翻的」会悄悄漂移。
TEXT_TARGETS: dict[str, tuple[str, ...]] = _TEXT_TARGETS
ANY_WIDGET_TARGETS: tuple[str, ...] = _ANY_WIDGET_TARGETS

#: 构造函数里「第几个位置参数是给人看的字」。这些类的构造文本会被 ``setText`` /
#: ``setTitle`` 接住，所以构造那一跳也算在面上。
#:
#: 刻意**不含** ``QTextEdit`` / ``QLineEdit`` / ``QComboBox`` —— 它们的构造文本
#: 是用户数据（ExifTool 参数、路径、下拉项），不是显示文案。
CTOR_TEXT_INDEX: dict[str, tuple[int, ...]] = {
    "QLabel": (0,),
    "QPushButton": (0,),
    "QCheckBox": (0,),
    "QRadioButton": (0,),
    "QGroupBox": (0,),
}

#: 只作为 setter 参与拦截的方法名（由 ``TEXT_TARGETS`` 展开而来）。
SETTER_METHODS: frozenset[str] = frozenset(
    method for methods in _TEXT_TARGETS.values() for method in methods
) | frozenset(_ANY_WIDGET_TARGETS)

#: 参数是**一串**展示文字（而不是单个字符串）的方法。目前只有表头：
#:
#:     self.setHeaderLabels(("File Name", "Ext.", "Location"))
#:
#: 它既不符合「第 1 个位置参数是字符串」的 setter 形状（整串当一个句子翻会查不到），
#: 也不能不翻（列标题是界面上明晃晃的文字）。所以要**逐个翻、整串登记**。登记整串
#: 而不是逐个，是为了切语言时能照原样整串重放（``setHeaderLabels`` 是"全部替换"语义，
#: 逐个登记反而会让重放变成追加/覆盖不一致）。
_SEQUENCE_TEXT_TARGETS: dict[str, tuple[str, ...]] = {
    "QTreeWidget": ("setHeaderLabels",),
}

#: 给 ``ui.i18n.extract`` 复用的公开别名（理由同 ``TEXT_TARGETS``）。
SEQUENCE_TEXT_TARGETS: dict[str, tuple[str, ...]] = _SEQUENCE_TEXT_TARGETS

#: 「一串展示文字」方法里，那一串在第几个位置参数上（由上面的表展开）。抽取工具靠它
#: 知道该把哪个参数当**元组**去逐个收，而不是当成一个字符串字面量。
SEQUENCE_TEXT_INDEX: dict[str, tuple[int, ...]] = {
    method: (0,) for methods in _SEQUENCE_TEXT_TARGETS.values() for method in methods
}

#: 「间接入口」：文案不在 setter 的第 1 个位置参数上，得按调用签名去取。
#:
#: * 对话框静态方法 —— 上游 ``ui/dialogs/message_box.py`` 的形状是
#:   ``info(parent, title, text, detailed_text)``。这些参数最终会落到
#:   ``QMessageBox.setWindowTitle`` / ``setText`` / ``setDetailedText`` 上，所以
#:   运行时是被接住的 —— 这里只是让抽取工具也能看见它们。
#: * ``addTab`` —— 页面标题。``QTabWidget.addTab(widget, label)`` 与
#:   ``TabBar.addTab(routeKey, text, icon)`` 的文案都在第 2 个参数上；它既不是
#:   setter 也不是构造，而且标题进的是 Fluent 导航项/标签栏（接缝拦不到），
#:   所以运行时由 ``QMainWindow.applyTranslations`` 显式翻译。
CALL_TEXT_INDEX: dict[str, tuple[int, ...]] = {
    "info": (1, 2, 3),
    "confirm": (1, 2, 3),
    "warning": (1, 2, 3),
    "critical": (1, 2, 3),
    "question": (1, 2, 3),
    "getText": (1, 2, 3, 4),
    "addTab": (1,),
}

_installed = False


def install(namespace: Mapping[str, Any]) -> None:
    """把拦截装到 `namespace` 里的控件类上。

    `namespace` 传的是接缝 ``ui.fluent.qt`` 的模块字典 —— 由它自己把类交过来，
    而不是这里反向去 ``import ui.fluent.qt``，那样会和「接缝导入 i18n」形成循环。

    两种模式（``XLCHEMY_UI=classic`` / fluent）走的是同一段代码，只是 ``namespace``
    里的类不同：classic 下是原生 Qt 类，fluent 下是 ``adapters.py`` 那几个包装类。
    """
    global _installed
    if _installed:
        return
    _installed = True

    for class_name, methods in _TEXT_TARGETS.items():
        cls = namespace.get(class_name)
        if cls is None:
            continue
        for method in methods:
            _patch(cls, method)

    for class_name, methods in _SEQUENCE_TEXT_TARGETS.items():
        cls = namespace.get(class_name)
        if cls is None:
            continue
        for method in methods:
            _patchSequence(cls, method)

    base = namespace.get("QWidget")
    if base is not None:
        for method in _ANY_WIDGET_TARGETS:
            _patch(base, method)

    # 构造文本单独补一次。原生的 Qt 类把构造参数里的文字**设在 C++ 侧**，根本不经过
    # Python 的 ``setText``（实测 ``QLabel("Hello")`` 不会触发被包裹的 setText），所以
    # classic 模式下 ``QLabel("Theme")`` 建出来就是英文、翻不到。fluent 模式的适配器
    # 自己在 ``__init__`` 里调了 ``setText``，本来就能翻 —— 但依赖这个巧合很脆。
    #
    # 这里用抽取工具那张 ``CTOR_TEXT_INDEX`` 表补上：**位置定义只有一份**，运行时
    # 拦截和静态抽取不会漂移。
    for class_name, indexes in CTOR_TEXT_INDEX.items():
        cls = namespace.get(class_name)
        setters = _TEXT_TARGETS.get(class_name)
        if cls is None or not setters:
            continue
        _patchConstructorText(cls, indexes, setters[0])


# -------------------------------------------------------------------- 内部


def _patchConstructorText(cls: type, indexes: tuple[int, ...], setter_name: str) -> None:
    """构造完，把位置参数里的显示文本再走一遍**被包裹的** setter。

    为什么不能直接在构造前把参数换成译文：原生 Qt 的构造文本进的是 C++ 侧，换了也
    白换（翻到的还是原值）。为什么不能只补一次 ``setText(译文)``：那样原文没进登记
    表，切语言时这句就再也回不去了。所以先**照原样**构造，再显式调一次被包裹的
    setter —— 它登记原文 + 翻成译文，两种模式都幂等（fluent 适配器自己那次调用会
    先把原文登记好，这里第二次进来只是重翻同一句）。
    """
    original = cls.__init__
    if getattr(original, "_xl_i18n_wrapped", False):
        return

    def wrapper(self, *args: Any, **kwargs: Any) -> Any:
        original(self, *args, **kwargs)
        setter = getattr(self, setter_name, None)
        if setter is None:
            return
        for index in indexes:
            if index < len(args) and isinstance(args[index], str) and args[index]:
                setter(args[index])

    _installWrapper(cls, "__init__", original, wrapper)


def _patch(cls: type, method_name: str) -> None:
    """把 ``cls.method_name`` 换成「先登记原文、再翻一遍」的版本。"""
    original = getattr(cls, method_name, None)
    if original is None or getattr(original, "_xl_i18n_wrapped", False):
        return

    def wrapper(self, *args: Any, **kwargs: Any) -> Any:
        if args and isinstance(args[0], str):
            args = (_record(self, method_name, args[0]), *args[1:])
        return original(self, *args, **kwargs)

    _installWrapper(cls, method_name, original, wrapper)


def _patchSequence(cls: type, method_name: str) -> None:
    """把 ``cls.method_name`` 换成「逐个翻一串展示文字」的版本（表头）。

    与 :func:`_patch` 的区别只在「第 1 个位置参数是一串字符串」而不是一个字符串 ——
    ``setHeaderLabels(("File Name", "Ext.", "Location"))``。整串当一个句子翻会查不到
    译文，所以逐个翻；但**登记**时存整串原文，切语言才好在原位置上整串重放。
    """
    original = getattr(cls, method_name, None)
    if original is None or getattr(original, "_xl_i18n_wrapped", False):
        return

    def wrapper(self, *args: Any, **kwargs: Any) -> Any:
        if args and isinstance(args[0], (list, tuple)):
            args = (_recordSequence(self, method_name, args[0]), *args[1:])
        return original(self, *args, **kwargs)

    _installWrapper(cls, method_name, original, wrapper)


def _installWrapper(cls: type, method_name: str, original: Any, wrapper: Any) -> None:
    """装上包装：保住元信息、打标记（防止重复包装）、失败只记日志。"""
    try:
        functools.wraps(original)(wrapper)
    except (AttributeError, TypeError):
        pass  # PySide 的某些描述符没有 __name__，不影响功能
    wrapper._xl_i18n_wrapped = True  # type: ignore[attr-defined]

    try:
        setattr(cls, method_name, wrapper)
    except (AttributeError, TypeError) as error:  # pragma: no cover - 内置类型
        logger.error(f"[i18n] Cannot hook {cls.__name__}.{method_name}: {error}")


def _record(obj: Any, method_name: str, source: str) -> str:
    """记下原文并返回译文。"""
    if _isAlreadyTranslated(source):
        # 这句已经是译文了（层层覆写的 setWindowTitle 会把译文再喂进来一次）。
        # 此时**不能**记进登记表 —— 记了就等于把译文当成原文，切第二次语言时
        # 就再也翻不回去了。直接原样放行。
        return source

    try:
        sources = _sources(obj)
        if sources.get(method_name) != source:
            sources[method_name] = source
            obj.setProperty(RECORD_PROPERTY, json.dumps(sources))
    except (RuntimeError, TypeError, ValueError):
        # 控件已经销毁，或者不让挂动态属性。翻译照做，只是切语言时它跟不上。
        pass

    return tr(source)


def _recordSequence(obj: Any, method_name: str, labels: Any) -> list[str]:
    """表头这类「一串展示文字」：逐个翻，整串原文登记。

    ``_isAlreadyTranslated`` 的判据是「**整串**都已经是译文了」才放行 —— 只要有一条
    还是英文，就认为这是一次新的登记（正常路径是构造时设一次英文，切语言时由
    :func:`reapply` 拿登记下来的英文整串重放）。
    """
    originals = [str(label) for label in labels]

    if originals and all(_isAlreadyTranslated(label) for label in originals):
        return originals

    try:
        sources = _sources(obj)
        if sources.get(method_name) != originals:
            sources[method_name] = originals
            obj.setProperty(RECORD_PROPERTY, json.dumps(sources))
    except (RuntimeError, TypeError, ValueError):
        # 控件已经销毁，或者不让挂动态属性。翻译照做，只是切语言时它跟不上。
        pass

    return [tr(label) for label in originals]


def _isAlreadyTranslated(text: str) -> bool:
    """`text` 是否是当前目录里的某条**译文**。

    这让拦截对「已经翻过的输入」幂等：``tr(tr(x)) == tr(x)``。必要性来自 Qt 的
    覆写链 —— 比如本项目的 ``QMessageBox.setWindowTitle`` 会把参数转发给
    ``super().setWindowTitle()``，于是同一句英文会经过两个被包裹的入口；靠这条
    判断，第二次进来时直接放行，既不重复翻译也不覆盖登记表里的原文。
    """
    from .runtime import currentCatalog

    catalog = currentCatalog()
    if catalog is None:
        return False
    return text in catalog.translatedValues


def _sources(obj: Any) -> dict[str, Any]:
    raw = obj.property(RECORD_PROPERTY)
    if not raw:
        return {}
    try:
        data = json.loads(raw)
    except (TypeError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def reapply(obj: Any) -> int:
    """按登记的原文重设一遍，返回重设了几个位置。

    调用的是**包裹过的方法**（``obj.setText``），它会重新走一次「登记 + 翻译」——
    原文进、译文出，重复调用是幂等的。
    """
    sources = _sources(obj)
    if not sources:
        return 0

    applied = 0
    for method_name, source in list(sources.items()):
        method = getattr(obj, method_name, None)
        if method is None:
            continue
        try:
            method(source)
            applied += 1
        except RuntimeError:
            raise
        except Exception as error:  # pragma: no cover - 个别控件的签名差异
            logger.error(f"[i18n] Cannot reapply {method_name}: {error}")

    return applied


def registeredSources(obj: Any) -> dict[str, Any]:
    """当前登记在控件上的原文（给自检脚本用）。"""
    return _sources(obj)


def collectSources() -> dict[str, list[str]]:
    """把**界面上真实登记**的英文原文全部导出来。

    返回 ``{原文: ["QLabel.setText", ...]}``。这是比静态扫描更硬的覆盖率口径：
    它说的不是「源码里有哪些字」，而是「应用真的往控件上放过哪些字」。用它和译文
    目录对比，就能看出有没有哪一句在界面上仍然是英文。

    导出结果可以直接喂给 ``python -m ui.i18n.extract --runtime-dump``。
    """
    try:
        from PySide6.QtWidgets import QApplication
    except Exception:  # pragma: no cover
        return {}

    app = QApplication.instance()
    if app is None:
        return {}

    found: dict[str, list[str]] = {}
    for widget in app.allWidgets():
        try:
            sources = _sources(widget)
        except RuntimeError:
            continue  # C++ 侧已销毁
        for method, source in sources.items():
            where = f"{type(widget).__name__}.{method}"
            # 登记值可能是「一串」（表头那种整串登记）。覆盖率关心的是**单条展示
            # 文字**，所以拆开逐个记 —— 直接拿整串当字典键会因为 list 不可哈希而炸。
            for text in source if isinstance(source, (list, tuple)) else (source,):
                found.setdefault(str(text), []).append(where)

    return found
