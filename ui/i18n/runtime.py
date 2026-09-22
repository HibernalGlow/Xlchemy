"""i18n 运行时：当前语言、查表入口、运行时切换。

**惰性初始化**是这里的核心安排。接缝（``ui.fluent.qt``）在**导入期**就装好了拦截
（见 :mod:`ui.i18n.hooks`），但那时 ``QApplication`` 还不存在 —— 而装 Qt 自带的
翻译（``QFileDialog`` 的按钮、``QMessageBox`` 的标准按钮）必须先有 ``QApplication``。
所以真正的「定语言 + 载目录 + 装 Qt 翻译」推迟到**第一次查表**才做：那一刻一定
已经过了 ``QApplication(sys.argv)``，因为能触发查表的只能是控件在设文本。
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Callable, Optional

from .catalog import (
    FALLBACK_TAG,
    SOURCE_TAG,
    Catalog,
    availableTags,
    detectSystemTag,
    loadCatalog,
    resolveTag,
)

logger = logging.getLogger(__name__)

#: 显式指定语言用的环境变量（优先级最高，方便临时对照）。
ENV_VAR = "XLCHEMY_LANG"

#: 语言选择落盘的文件名，放在和其它本地配置同一个目录里。
CONFIG_FILE = "Language.json"

_current: Optional[Catalog] = None
_current_tag: Optional[str] = None
_ready = False

_listeners: list[Callable[[str], None]] = []

# ``QTranslator`` 必须被持有，否则会被 GC 掉、翻译随之失效。
_qt_translators: list[object] = []


# ------------------------------------------------------------------ 对外接口


def currentLanguage() -> str:
    """返回当前语言标签（``zh_CN`` / ``en`` …）。"""
    ensureReady()
    return _current_tag or FALLBACK_TAG


def currentCatalog() -> Optional[Catalog]:
    ensureReady()
    return _current


def tr(text: str) -> str:
    """把英文原文翻成当前语言。查不到就原样返回。"""
    if not isinstance(text, str) or not text:
        return text

    ensureReady()
    catalog = _current
    if catalog is None:
        return text
    return catalog.translate(text)


def availableLanguages() -> list[tuple[str, str]]:
    """返回 ``[(tag, 显示名)]``，供语言选单使用。

    判空必须用 ``is not None`` 而不是真值测试：``Catalog`` 定义了 ``__len__``
    （返回译文条数），而源语言（``en``）按设计**没有**译文条目，于是它的目录
    ``len() == 0`` 会被当成 ``False`` —— 语言选单里英文那一项会退化成显示标签
    ``en``，而不是 ``_meta.name`` 里的 ``English``。
    """
    out: list[tuple[str, str]] = []
    for tag in availableTags():
        catalog = loadCatalog(tag)
        out.append((tag, catalog.name if catalog is not None else tag))
    return out


def onLanguageChanged(callback: Callable[[str], None]) -> None:
    """注册语言切换回调（切换后按注册顺序调用）。"""
    if callback not in _listeners:
        _listeners.append(callback)


def setLanguage(tag: str, persist: bool = True) -> str:
    """切换语言、重翻界面上已有的文字，并记下来给下次启动用。"""
    # 必须先 ``ensureReady()``：否则如果这是**第一次**碰 i18n（之前一句 ``tr()``
    # 都没调过），``_ready`` 还是 False，紧接着的任何一次查表都会触发惰性初始化，
    # 用环境变量/落盘偏好把刚切好的语言**覆盖回去** —— 现象是「setLanguage 调了没
    # 生效」，而且只在「启动后立刻切语言」时复现，很容易漏。
    ensureReady()

    resolved = resolveTag(tag)
    _apply(resolved)

    if persist:
        _savePreference(resolved)

    retranslateAll()

    for callback in list(_listeners):
        try:
            callback(resolved)
        except Exception as error:  # pragma: no cover - 回调不该拖垮切换
            logger.error(f"[i18n] Language listener failed: {error}")

    return resolved


def ensureReady() -> None:
    """第一次查表时定语言。幂等，且可重入（先置位再干活）。"""
    global _ready
    if _ready:
        return

    # 先置位：``_apply`` 与 ``tr`` 可能互相踩到，置位后重入会直接返回。
    _ready = True

    override = os.environ.get(ENV_VAR)
    if override:
        _apply(resolveTag(override))
        return

    saved = _loadPreference()
    if saved:
        _apply(resolveTag(saved))
        return

    _apply(detectSystemTag())


# -------------------------------------------------------------------- 内部


def _apply(tag: str) -> None:
    global _current, _current_tag

    _current_tag = tag
    _current = loadCatalog(tag)

    if _current is None and tag != SOURCE_TAG:
        logger.error(f"[i18n] No catalog for '{tag}', falling back to {SOURCE_TAG}")
        _current_tag = SOURCE_TAG
        _current = loadCatalog(SOURCE_TAG)

    _installQtTranslations(tag)


def _installQtTranslations(tag: str) -> None:
    """装 Qt **自己**的翻译。

    这条管的是框架画的字：``QFileDialog`` 的「打开/取消」、``QMessageBox`` 的标准
    按钮、``QLineEdit`` 右键菜单等。它们不经过我们的接缝（C++ 内部创建），只能在
    框架层面装 ``.qm``。注意 macOS 上文件对话框走的是系统面板，这些 ``.qm`` 对它
    不生效 —— 那里由系统语言决定。
    """
    try:
        from PySide6.QtCore import QCoreApplication, QLibraryInfo, QLocale, QTranslator
    except Exception:  # pragma: no cover - 没有 Qt 就没得装
        return

    app = QCoreApplication.instance()
    if app is None:  # 还没到 QApplication，等下次
        return

    for translator in _qt_translators:
        app.removeTranslator(translator)  # type: ignore[arg-type]
    _qt_translators.clear()

    if tag == SOURCE_TAG:
        return

    locale = QLocale(tag)
    directory = QLibraryInfo.path(QLibraryInfo.LibraryPath.TranslationsPath)

    # qtbase 管控件与对话框，qt 是兜底的大杂烩，两个都装一遍。
    for stem in ("qtbase", "qt"):
        translator = QTranslator(app)
        if translator.load(locale, stem, "_", directory):
            app.installTranslator(translator)
            _qt_translators.append(translator)


# ------------------------------------------------------------ 偏好落盘
#
# 复用 ``data.constants.CONFIG_LOCATION``：那是应用放本地配置的地方（壳模式也写在
# 那儿）。取不到就退化成「只在本次运行内有效」，不抛异常 —— 语言选择失败不该拦
# 住启动。


def _configPath() -> Optional[Path]:
    try:
        from data.constants import CONFIG_LOCATION

        return Path(CONFIG_LOCATION) / CONFIG_FILE
    except Exception:  # pragma: no cover - 常量还没初始化好
        return None


def _loadPreference() -> Optional[str]:
    path = _configPath()
    if not path or not path.is_file():
        return None

    try:
        value = json.loads(path.read_text(encoding="utf-8")).get("language")
    except (OSError, ValueError) as error:
        logger.error(f"[i18n] Cannot read the language preference: {error}")
        return None

    return str(value) if value else None


def _savePreference(tag: str) -> None:
    path = _configPath()
    if not path:
        return

    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps({"language": tag}, indent=2) + "\n", encoding="utf-8"
        )
    except OSError as error:
        logger.error(f"[i18n] Cannot save the language preference: {error}")


# ------------------------------------------------------------ 重翻


def retranslateAll() -> None:
    """按登记的原文重翻**已经建好**的控件。

    文本是在「设置的那一刻」翻的，所以切语言时旧文字不会自己变。这里把控件上登记
    的英文原文重新过一遍 :func:`tr`。

    登记表存在控件自己的动态属性上（见 :mod:`ui.i18n.hooks`），而不是 Python 的
    ``WeakKeyDictionary`` —— PySide 的包装对象可能被回收后重新创建，存在 C++ 对象
    上的动态属性不会跟着丢。
    """
    from .hooks import reapply

    try:
        from PySide6.QtWidgets import QApplication
    except Exception:  # pragma: no cover
        return

    app = QApplication.instance()
    if app is None:
        return

    for widget in app.allWidgets():
        try:
            reapply(widget)
        except RuntimeError:
            # 控件已被 C++ 侧销毁（对象还在 Python 的列表里）。
            continue
