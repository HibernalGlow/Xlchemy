"""译文目录：**键就是英文原文**。

这是一个 gettext 式的约定，选它的唯一理由是「对上游零侵入」：

上游几百条 ``QLabel("Theme")`` / ``setToolTip("...")`` 里没有 ``tr()`` 包装，也不
应该有 —— 一旦往上游文件里塞 ``tr()``，每加一条字符串就多一个合并冲突点，而且
是**持续产生**的冲突（上游每次改文案都会撞）。所以这里不接受「在调用点标记」的
做法，改成「按原文查表」：译文目录拿英文原文当主键，翻译发生在控件设置文本的
那一刻（见 :mod:`ui.i18n.hooks`），上游代码一个字都不用动。

代价是**同一句话在两个不同语境下只能有一种译法**（没有 msgctxt）。对这个应用
来说可以接受：文案量小、领域单一（图像转换），几乎没有需要分语境的一词多义。

目录文件是 ``locales/<tag>.json``::

    {
      "_meta": {"name": "简体中文"},
      "strings": {
        "Theme": "主题",
        "Use the top tab strip": "改用顶部标签栏"
      },
      "patterns": [
        {"match": "^(\\\\d+) files? selected$", "replace": "\\\\1 个文件"}
      ]
    }

``strings`` 是精确匹配（查不到就原样返回，所以**没翻译的字符串自然回落到英文**，
永远不会显示成空白或乱码）。``patterns`` 只用来兜住「一条文本里有好几处要换」以及
带数字的拼接串 —— ``f"{n} files selected"`` 这种运行时才拼出来的句子不可能进
``strings``。``patterns`` 按顺序匹配，**所有命中的都会依次应用**，用的是 ``re.sub``
的替换语法（``\\1`` 回引捕获组）。

``patterns`` 有一条纪律：**只允许匹配「纯展示」的句子**。因为拦截发生在 setText
之类的展示入口上，数据型控件根本不走这条链路，所以这里的模式再宽也伤不到逻辑。
反过来说，规则可以写得比较具体（例如锚在 ``>…</a>`` 这种标签边界上）：既够准，
上游改了措辞也只是回落到英文，不会翻错。
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)

LOCALE_DIR = Path(__file__).resolve().parent / "locales"

#: 源语言：目录里没有它的翻译文件，它本身就是「不翻译」的那一档。
SOURCE_TAG = "en"

#: 没有可用目录时的兜底语言。
FALLBACK_TAG = "en"


class Catalog:
    """一种语言的译文表。查不到就返回原文，保证界面永远不空。"""

    def __init__(
        self,
        tag: str,
        meta: Optional[dict[str, Any]] = None,
        strings: Optional[dict[str, str]] = None,
        patterns: Optional[list[dict[str, str]]] = None,
    ):
        self.tag = tag
        self.meta = meta or {}
        self.strings = strings or {}
        self.translatedValues = frozenset(self.strings.values())
        self.patterns: list[tuple[re.Pattern[str], str]] = []
        for entry in patterns or []:
            try:
                self.patterns.append((re.compile(entry["match"]), entry["replace"]))
            except (KeyError, re.error) as error:
                logger.error(f"[i18n] Bad pattern in {tag}: {entry!r} ({error})")

    # ------------------------------------------------------------ 元信息

    @property
    def name(self) -> str:
        """给语言选单显示的名字，例如「简体中文」。"""
        return str(self.meta.get("name") or self.tag)

    @property
    def isSource(self) -> bool:
        return self.tag == SOURCE_TAG

    # -------------------------------------------------------------- 查表

    def translate(self, text: str) -> str:
        if not isinstance(text, str) or not text:
            return text

        # 源语言档（en）就是恒等映射：它的存在意义是让语言选单有一项可选。
        if self.isSource:
            return text

        hit = self.strings.get(text)
        if hit is not None:
            return hit

        # 所有命中的规则**依次**应用，而不是「先命中者生效」。理由：同一条文本里可能
        # 有好几处要换（典型是上游关于页那段富文本 HTML，链接文字 `website` /
        # `license` / `3rd party` 是三处独立替换）。「只生效一条」会让这类只能整个
        # 重写，而上游一改版式就静默失效。
        #
        # 代价：上一条规则的**替换结果**会继续参与后面的规则，写规则时别让它们互相咬。
        for pattern, replacement in self.patterns:
            if pattern.search(text):
                text = pattern.sub(replacement, text)

        return text

    def __len__(self) -> int:
        return len(self.strings)


# ---------------------------------------------------------------- 载入与探测


def catalogPath(tag: str) -> Path:
    return LOCALE_DIR / f"{tag}.json"


def availableTags() -> list[str]:
    """返回 ``locales/`` 下所有可用语言（源语言永远在第一位）。"""
    tags: list[str] = []
    if LOCALE_DIR.is_dir():
        for path in sorted(LOCALE_DIR.glob("*.json")):
            if path.stem.startswith("_"):  # 下划线开头的是工具产物，不是语言
                continue
            tags.append(path.stem)
    if SOURCE_TAG in tags:
        tags.remove(SOURCE_TAG)
    return [SOURCE_TAG, *tags]


def loadCatalog(tag: str) -> Optional[Catalog]:
    path = catalogPath(tag)
    if not path.is_file():
        return None

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        logger.error(f"[i18n] Cannot read {path}: {error}")
        return None

    return Catalog(
        tag=tag,
        meta=data.get("_meta"),
        strings=data.get("strings"),
        patterns=data.get("patterns"),
    )


def resolveTag(preferred: Optional[str]) -> str:
    """把 ``QLocale`` 报出来的名字收敛到一个真实存在的目录。

    ``zh_CN`` → ``zh_CN`` → ``zh`` → ``en``。逐级回退的用意是：中文目录只写一份
    ``zh.json`` 也能同时伺候 ``zh_CN`` / ``zh_SG``。
    """
    if not preferred:
        return FALLBACK_TAG

    candidate = preferred.strip()
    if not candidate:
        return FALLBACK_TAG

    # Qt 用的是 ``zh_CN`` 这种下划线形式，别的地方可能给 ``zh-CN``。
    normalized = candidate.replace("-", "_")

    for attempt in (normalized, normalized.split("_")[0]):
        if attempt == SOURCE_TAG:
            return SOURCE_TAG
        if catalogPath(attempt).is_file():
            return attempt

    return FALLBACK_TAG


def detectSystemTag() -> str:
    """按系统语言猜一个目录。

    探测放在这里而不是 :mod:`ui.i18n.runtime`，是为了让 ``extract`` 工具在**没有
    Qt / 没有显示器**的环境里也能导入本模块。
    """
    try:
        from PySide6.QtCore import QLocale

        return resolveTag(QLocale.system().name())
    except Exception:  # pragma: no cover - Qt 不在或还没初始化
        return FALLBACK_TAG
