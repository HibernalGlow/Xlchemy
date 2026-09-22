"""抽取上游文案 + 校验译文覆盖率。

    python -m ui.i18n.extract                 # 扫描并写 locales/_source.json
    python -m ui.i18n.extract --check         # 只校验覆盖率，缺失就非零退出
    python -m ui.i18n.extract --check --runtime-dump seen.json

工具扫描的是**接缝真正会拦到的那批入口**（定义在 :mod:`ui.i18n.hooks` 的
``TEXT_TARGETS`` / ``ANY_WIDGET_TARGETS``），而不是「所有字符串字面量」。所以：

* 不用人工维护白名单，改了 ``hooks`` 这里的面会自动跟着变；
* 报出来的就是**真会被翻译的那批**，不会混进日志、路径、字典键这类噪声；
* ``QComboBox.addItem`` 之类的数据入口天然不在面上，不会被抽出来误导译者。

两种数据来源各有盲区，工具把两者**叠加**（``--runtime-dump`` 是补充，不是替代）：

* 默认走**静态**扫描（AST）。优点是不用启动应用、覆盖面是全仓库的调用点；盲区是运行时
  才拼出来的句子（f-string）只能拿到模板，交给 ``locales/*.json`` 的 ``patterns`` 去兜。
* 再叠加一份**运行时**导出（把界面上每个控件登记的英文原文 dump 出来）。它能看到真实
  拼好的句子、以及**变量间接喂进去**的文案（``for label in [...]`` 这种静态匹配不到调用点），
  但只覆盖实际跑到过的界面。导出方法见 ``ui.i18n.hooks.registeredSources``。

两条路都套同一套 :func:`_isTranslatable` 判定，所以后缀徽标、多行标识标签、富文本 HTML
这类非文案不会混进来误报。
"""

from __future__ import annotations

import argparse
import ast
import json
import re
import sys
from pathlib import Path
from typing import Iterable, Optional

from .catalog import LOCALE_DIR, SOURCE_TAG, loadCatalog
from .hooks import (
    CALL_TEXT_INDEX,
    CTOR_TEXT_INDEX,
    SEQUENCE_TEXT_INDEX,
    SETTER_METHODS,
)

#: 默认扫描范围：上游会往界面里塞字的地方。
DEFAULT_ROOTS = ("ui", "data", "core", "main.py")

#: 关键字实参里「装的是给人看的字」的名字。上游有 ``ProgressDialog(title="…")``
#: 这类写法，文本走的是构造函数而不是 setter。
DISPLAY_KWARGS = frozenset(
    {"title", "text", "label", "tooltip", "placeholder", "informative_text", "detailed_text"}
)

MANIFEST_NAME = "_source.json"

#: 「文案表」：有些文案不在调用点上，而是集中在一张字典里，调用方只传键名。
#: 上游 ``data/tooltips.py`` 就是这样（``setToolTip("threads", widget)`` →
#: ``widget.setToolTip(TOOLTIPS["threads"])``）。**运行时**它们照样会被接缝拦住
#: （最终都走 ``QWidget.setToolTip``），但静态扫描看不见键→值的连线，得单独收。
#:
#: 值是 ``{相对路径: (变量名, ...)}``。
DISPLAY_TABLES: dict[str, tuple[str, ...]] = {
    "data/tooltips.py": ("TOOLTIPS",),
}

#: 本仓库的控件命名约定：带这些后缀的接收者装的是**数据**，不是给人看的文案。
#: ``*_te`` = QTextEdit（ExifTool 参数、优化规则）、``*_le`` = QLineEdit、
#: ``*_cmb`` = QComboBox、``*_sb`` = SpinBox。
DATA_RECEIVER_SUFFIXES = ("_te", "_le", "_cmb", "_sb")

#: 同名方法在 A 类控件上是文案、在 B 类控件上是数据 —— 只能靠接收者名字区分。
#: ``QLabel.setText("Save To")`` 要收，``self.rules_te.setText('("all", 3.5…)')``
#: 不能收。运行时的拦截因为是**按类**挂的，天然分得清；静态扫描看不见类型，
#: 只能靠命名约定对齐。判错了也只是清单噪声，不影响运行时行为。
AMBIGUOUS_METHODS = frozenset({"setText", "setPlaceholderText", "addItem", "addItems"})

#: 抽取时忽略的「字」：太短、像符号、像路径、像标识符。
_MIN_LENGTH = 2

#: Qt 类名：单个以 ``Q`` 开头的大驼峰词，例如 ``QCheckBox``。
_QT_CLASS_NAME = re.compile(r"Q[A-Z][A-Za-z0-9]*")


class Entry:
    __slots__ = ("text", "where", "kind", "dynamic")

    def __init__(self, text: str, where: str, kind: str, dynamic: bool = False):
        self.text = text
        self.where = where
        self.kind = kind
        self.dynamic = dynamic

    def asDict(self) -> dict:
        out = {"text": self.text, "kind": self.kind, "at": self.where}
        if self.dynamic:
            out["dynamic"] = True
        return out


# ------------------------------------------------------------------ 扫描


def _isTranslatable(value: str) -> bool:
    if len(value.strip()) < _MIN_LENGTH:
        return False
    if "\n" in value:  # 多行基本是文档串 / 日志模板
        return False
    if not any(character.isalpha() for character in value):
        return False

    # 路径 / URL / 样式片段
    if value.startswith(("ui.", "data.", "core.", "http", "/", "<", ".")):
        return False

    # Qt 类名（`QCheckBox` 这种单个驼峰词）。**不能**写成「以 Q 开头就排除」——
    # 那样会连 `Quality`、`Quit` 一起吃掉，而且失败方式是静默的：文案只是从清单里
    # 消失，覆盖率报告上看不出来。
    if _QT_CLASS_NAME.fullmatch(value):
        return False

    if " " not in value and ("_" in value or value.islower()):
        return False
    return True


def _literalCandidates(node: ast.AST) -> list[ast.AST]:
    """把 ``A if cond else B`` 拆成两条文案。

    上游（以及我们的壳）会这么写::

        self.shellToggle.setToolTip(
            "Use the top tab strip" if nav_mode else "Use the side navigation"
        )

    两个分支都是真会显示的字，静态扫描必须都看见，否则覆盖率会把另一条误报成
    「目录里多余」。
    """
    if isinstance(node, ast.IfExp):
        return [*_literalCandidates(node.body), *_literalCandidates(node.orelse)]
    return [node]


def _isDataReceiver(receiver: Optional[ast.AST], method: str) -> bool:
    """按命名约定判断「这个 setter 的接收者装的是数据」。"""
    if method not in AMBIGUOUS_METHODS:
        return False
    if not isinstance(receiver, ast.Attribute):
        return False
    return receiver.attr.endswith(DATA_RECEIVER_SUFFIXES)


def _literal(node: ast.AST) -> Optional[tuple[str, bool]]:
    """Returns ``(text, is_dynamic)`` for a str literal or an f-string template."""
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value, False
    if isinstance(node, ast.JoinedStr):
        parts: list[str] = []
        for value in node.values:
            if isinstance(value, ast.Constant) and isinstance(value.value, str):
                parts.append(value.value)
            else:
                parts.append("{}")
        return "".join(parts), True
    return None


def scanFile(path: Path, root: Path) -> list[Entry]:
    try:
        tree = ast.parse(path.read_text(encoding="utf-8"))
    except (OSError, SyntaxError):
        return []

    relative = path.relative_to(root)
    found: list[Entry] = _scanCalls(tree, relative)
    found.extend(_scanTables(tree, relative))
    return found


def _scanTables(tree: ast.Module, relative: Path) -> list[Entry]:
    """收「文案表」里的值（多行的也算 —— 工具提示本来就是成段的）。"""
    names = DISPLAY_TABLES.get(relative.as_posix())
    if not names:
        return []

    found: list[Entry] = []
    for node in ast.walk(tree):
        if not isinstance(node, (ast.Assign, ast.AnnAssign)):
            continue
        targets = node.targets if isinstance(node, ast.Assign) else [node.target]
        if not any(
            isinstance(target, ast.Name) and target.id in names for target in targets
        ):
            continue
        value = node.value
        if not isinstance(value, ast.Dict):
            continue
        for key, item in zip(value.keys, value.values):
            if not isinstance(item, ast.Constant) or not isinstance(item.value, str):
                continue
            label = key.value if isinstance(key, ast.Constant) else "?"
            if len(item.value.strip()) < _MIN_LENGTH:
                continue
            found.append(
                Entry(item.value, f"{relative}:{node.lineno}[{label}]", "TOOLTIPS[]")
            )
    return found


def _scanCalls(tree: ast.Module, relative: Path) -> list[Entry]:
    found: list[Entry] = []

    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue

        func = node.func
        name = func.attr if isinstance(func, ast.Attribute) else (
            func.id if isinstance(func, ast.Name) else ""
        )
        where = f"{relative}:{node.lineno}"

        def harvest(index: int, kind: str) -> None:
            if index >= len(node.args):
                return
            for candidate in _literalCandidates(node.args[index]):
                literal = _literal(candidate)
                if literal and _isTranslatable(literal[0]):
                    found.append(Entry(literal[0], where, kind, literal[1]))

        def harvestSequence(index: int, kind: str) -> None:
            """``setHeaderLabels(("File Name", "Ext.", "Location"))`` —— 参数是一串。

            不能走 :func:`harvest`：那里按「一个字符串字面量」取，元组会取不到。
            """
            if index >= len(node.args):
                return
            value = node.args[index]
            if not isinstance(value, (ast.Tuple, ast.List)):
                return
            for element in value.elts:
                for candidate in _literalCandidates(element):
                    literal = _literal(candidate)
                    if literal and _isTranslatable(literal[0]):
                        found.append(Entry(literal[0], where, kind, literal[1]))

        # --- 1. 控件构造：文本在第 N 个位置参数（`QLabel("Theme")`）
        for index in CTOR_TEXT_INDEX.get(name, ()):
            harvest(index, f"{name}()")

        # --- 2. setter：文本永远是第 1 个位置参数（`label.setText("Theme")`）
        if name in SETTER_METHODS and not _isDataReceiver(
            func.value if isinstance(func, ast.Attribute) else None, name
        ):
            harvest(0, f"{name}()")

        # --- 3. 构造带文字的关键字参数（`ProgressDialog(title="Converting...")`）
        for keyword in node.keywords:
            if not keyword.arg or keyword.arg not in DISPLAY_KWARGS:
                continue
            literal = _literal(keyword.value)
            if literal and _isTranslatable(literal[0]):
                found.append(Entry(literal[0], where, f"{name}({keyword.arg}=)", literal[1]))

        # --- 4. 间接入口（`message_box.info(parent, title, text)`、`addTab(w, title)`）
        for index in CALL_TEXT_INDEX.get(name, ()):
            harvest(index, f"{name}()")

        # --- 5. 「一串展示文字」的入口（表头）
        for index in SEQUENCE_TEXT_INDEX.get(name, ()):
            harvestSequence(index, f"{name}()")

        # --- 6. 我们自己代码里的显式标记（`tr("Cancel")`）
        #
        # 上游不许出现 ``tr()``，但 ``ui/fluent/*`` 是我们自己的文件：那些文案进的是
        # **非接缝**控件（qfluentwidgets 的按钮、Fluent 导航项、TabBar），拦截够不着，
        # 只能显式标记。抽取时必须一起收，否则覆盖率会把这批误报成「多余译文」。
        if name == "tr":
            harvest(0, "tr()")

    return found


def scan(root: Path, roots: Iterable[str] = DEFAULT_ROOTS) -> list[Entry]:
    entries: list[Entry] = []
    for name in roots:
        target = root / name
        if target.is_file():
            entries.extend(scanFile(target, root))
        elif target.is_dir():
            for path in sorted(target.rglob("*.py")):
                entries.extend(scanFile(path, root))
    return entries


# ------------------------------------------------------------------ 校验


def _matchesPattern(text: str, catalog) -> bool:
    """模板串（含 ``{}``）也算命中：把它换成数字再试模式。"""
    probe = text.replace("{}", "12345")
    for pattern, _ in catalog.patterns:
        if pattern.search(probe) or pattern.search(text):
            return True
    return False


def coverage(root: Path, sources: Iterable[str], tag: str) -> tuple[list[str], list[str], list[str]]:
    """返回 ``(缺失, 动态未覆盖, 目录里多余)``。"""
    catalog = loadCatalog(tag)
    if catalog is None:
        raise SystemExit(f"[i18n] No catalog for '{tag}' in {LOCALE_DIR}")

    keep_as_is = set(catalog.meta.get("keep_as_is") or ())
    # 运行时才出现的键，静态扫描看不见，覆盖校验必须放行两类：
    #   * 框架自带文案（qfluentwidgets 的导航按钮等）——键根本不在我们的源码里；
    #   * 由变量间接喂进去的文案（如排序按钮的 Original / Random / ...）——值在源码里，
    #     但入口是 ``for s in [...]`` 这种集合，静态抽取匹配不到调用点。
    # 它们既不该被报「缺失」，也不该被报「多余」。
    runtime_keys = set(catalog.meta.get("runtime_keys") or ())

    missing: list[str] = []
    dynamic: list[str] = []
    for text in sources:
        if text in catalog.strings or text in keep_as_is:
            continue
        if _matchesPattern(text, catalog):
            continue
        if "{}" in text:
            dynamic.append(text)
        else:
            missing.append(text)

    known = set(sources) | keep_as_is | runtime_keys
    unused = [
        text
        for text in catalog.strings
        if text not in known and not _matchesPattern(text, catalog)
    ]

    return sorted(set(missing)), sorted(set(dynamic)), sorted(unused)


# ------------------------------------------------------------------ 入口


def _writeManifest(root: Path, entries: list[Entry]) -> Path:
    path = LOCALE_DIR / MANIFEST_NAME
    payload = {
        "_meta": {
            "note": "由 python -m ui.i18n.extract 生成，是译者看的上下文清单，不参与运行",
            "count": len(entries),
        },
        "entries": [entry.asDict() for entry in sorted(entries, key=lambda e: e.text)],
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return path


def _loadRuntimeDump(path: Path) -> list[str]:
    """读运行时导出，并套用与静态扫描**同一套**可翻判定。

    接受三种形状：列表、``{"sources": [...]}``、以及 ``{原文: [出现位置]}`` 映射
    （``ui.i18n.hooks.collectSources()`` 的返回形状）。

    为什么必须过滤：接缝拦的是**一切**流经显示 setter 的文本，里面混着大量非文案——
    文件后缀徽标（``.JPG``）、多行的「编码器 / 格式」标识标签（``avifenc\\nAVIF``）、
    关于页的富文本 HTML、纯标点（``...``）。它们本就不该被翻，静态侧靠
    :func:`_isTranslatable` 挡住了，运行时侧要是不过滤就会全被报成「缺失」。
    """
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        raw = [str(item) for item in data]
    elif isinstance(data, dict):
        if "sources" in data:
            raw = [str(item) for item in data["sources"]]
        else:
            raw = [str(key) for key in data]
    else:
        raw = []
    return [text for text in raw if _isTranslatable(text)]


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        prog="python -m ui.i18n.extract", description="抽取上游文案并校验译文覆盖"
    )
    parser.add_argument("--check", action="store_true", help="只校验覆盖率，不写清单")
    parser.add_argument("--root", default=None, help="仓库根目录（默认自动推断）")
    parser.add_argument(
        "--runtime-dump",
        default=None,
        help="叠加一份运行时导出的原文清单（补静态扫描的盲区：运行时才拼出来的句子、"
        "以及变量间接喂进去的文案）",
    )
    args = parser.parse_args(argv)

    root = Path(args.root).resolve() if args.root else Path(__file__).resolve().parents[2]

    entries = scan(root)
    static_sources = {entry.text for entry in entries}
    sources = set(static_sources)
    runtime_only: list[str] = []
    if args.runtime_dump:
        runtime_sources = set(_loadRuntimeDump(Path(args.runtime_dump)))
        runtime_only = sorted(runtime_sources - static_sources)
        sources |= runtime_sources

    unique = sorted(sources)

    if not args.check:
        path = _writeManifest(root, entries) if entries else None
        print(f"[i18n] 抽到 {len(unique)} 条面向用户的文案（去重后）")
        if args.runtime_dump:
            print(f"[i18n] 其中 {len(runtime_only)} 条只有运行时才看得见（静态扫描的盲区）")
            for text in runtime_only:
                print(f"        + {text!r}")
        if path:
            print(f"[i18n] 上下文清单 -> {path.relative_to(root)}")

    status = 0
    for tag in sorted(p.stem for p in LOCALE_DIR.glob("*.json") if not p.name.startswith("_")):
        if tag == SOURCE_TAG:
            continue
        missing, dynamic, unused = coverage(root, unique, tag)
        total = len(loadCatalog(tag).strings)  # type: ignore[union-attr]
        done = len(unique) - len(missing) - len(dynamic)
        print(
            f"[i18n] {tag}: 覆盖 {done}/{len(unique)}  缺 {len(missing)}  "
            f"动态待模式匹配 {len(dynamic)}  目录里没用到 {len(unused)}"
        )
        for text in missing[:15]:
            print(f"        缺: {text!r}")
        if len(missing) > 15:
            print(f"        …另有 {len(missing) - 15} 条")
        if missing:
            status = 1

    return status


if __name__ == "__main__":
    sys.exit(main())
