"""i18n 接缝的回归测试。

这个特性是「在上游文件的**调用点之外**翻译」——上游 200 多处硬编码英文一个字都不
改，改的是接缝交出去的控件类。代价是行为依赖几个不显眼的约定，容易悄悄坏：

1. 接缝只许拦**纯展示**入口（``setText`` / ``setToolTip`` …），数据入口
   （``QComboBox.addItem``、``QLineEdit.setText``）一个都不能碰 —— 上游拿
   ``currentText()`` 做判断（``== "JPEG XL"``、``setTheme(...)``），翻一下就会静默
   走错分支。
2. 构造文本要单独补一刀 —— 原生 Qt 把 ``QLabel("Theme")`` 的文字设在 C++ 侧，
   **不经过** ``setText``，光拦 setter 会漏掉「构造出来那批」。
3. 切语言要在「启动后立刻切」时也生效 —— 惰性初始化不能把刚切好的语言覆盖回去。
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest

from ui.i18n import availableLanguages, currentLanguage, setLanguage, tr
from ui.i18n.catalog import SOURCE_TAG, loadCatalog
from ui.i18n.extract import _isTranslatable

REPO_ROOT = Path(__file__).resolve().parents[2]

TAG = "zh_CN"

#: 测试用的对照组。都取自 zh_CN 目录里真实存在的条目。
SAMPLE = {
    "Add Files": "添加文件",
    "Add Folder": "添加文件夹",
    "Conversion": "转换",
    "Verify": "校验",
}


@pytest.fixture(autouse=True)
def restoreLanguage():
    """语言是进程级全局状态，测完还原，免得污染其它测试。"""
    before = currentLanguage()
    yield
    setLanguage(before, persist=False)


@pytest.fixture
def zh(app):
    """切到中文（不落盘 —— 别动开发机上的 Language.json）。"""
    setLanguage(TAG, persist=False)
    return TAG


# --------------------------------------------------------------- 接缝拦得对不对


def test_the_seam_covers_every_sample_string():
    """目录本身得先自洽：样例都能查得到。"""
    catalog = loadCatalog(TAG)
    assert catalog is not None
    for source in SAMPLE:
        assert source in catalog.strings, source


def test_constructor_text_is_translated(zh):
    """构造文本也翻得到 —— 这是 classic 模式最容易全线漏掉的一条。

    原生 Qt 把 ``QLabel("Theme")`` 的文字设在 C++ 侧、不经过 ``setText``，所以光拦
    setter 对「构造出来那批」无效。接缝因此额外包了一层 ``__init__``。
    """
    from ui.fluent.qt import QCheckBox, QGroupBox, QLabel, QPushButton

    assert QLabel("Add Files").text() == SAMPLE["Add Files"]
    assert QPushButton("Add Folder").text() == SAMPLE["Add Folder"]
    assert QGroupBox("Conversion").title() == SAMPLE["Conversion"]
    assert QCheckBox("Verify").text() == SAMPLE["Verify"]


def test_already_built_widgets_are_retranslated_on_switch(app):
    """切语言要把**已经建好**的控件重翻一遍，而不是只影响新建的。"""
    from ui.fluent.qt import QLabel

    setLanguage(SOURCE_TAG, persist=False)
    label = QLabel("Add Files")
    assert label.text() == "Add Files"

    setLanguage(TAG, persist=False)
    assert label.text() == SAMPLE["Add Files"]

    setLanguage(SOURCE_TAG, persist=False)
    assert label.text() == "Add Files", "切回英文要能翻回去（登记表存的是原文）"


def test_translation_is_idempotent(zh):
    """``tr(tr(x)) == tr(x)``。

    必要性来自 Qt 的覆写链：``QMessageBox.setWindowTitle`` 会把参数转发给
    ``super().setWindowTitle()``，同一句会经过两个被包裹的入口。第二次不能把译文
    当成原文登记进去 —— 那样切第二次语言就再也翻不回去了。
    """
    once = tr("Add Files")
    assert once == SAMPLE["Add Files"]
    assert tr(once) == once


def test_patterns_all_apply_instead_of_only_the_first(zh):
    """一条文本里有多处要换时，命中的规则要**全部**生效。

    上游关于页把链接文字内联在一段富文本 HTML 里（``>website</a>`` / ``>license</a>``
    / ``>3rd party</a>`` 是同一串里的三处）。若只应用第一条命中的规则，这类文本只能
    整串重写，而上游一改版式就静默失效。这里锚在标签边界上做三处独立替换，href 原样保留。
    """
    html = (
        "<style>a { color: #00ff76; }</style>\n"
        "<div style='line-height: 120%;'>\n"
        '<a href="https://codepoems.eu" >website</a><br>\n'
        '<a href="mailto:contact@codepoems.eu">contact@codepoems.eu</a><br>\n'
        '<a href="file:///x/LICENSE.txt">license</a> /\n'
        '<a href="file:///x/LICENSE_3RD_PARTY.txt">3rd party</a>\n'
        "</div>"
    )
    out = tr(html)

    assert ">网站</a>" in out
    assert ">许可协议</a>" in out
    assert ">第三方组件</a>" in out
    # 三处都换了 —— 不是「只生效第一条」
    assert out.count("</a>") == 4
    # href 一律原样保留，链接不能因为翻译而失效
    assert 'href="https://codepoems.eu"' in out
    assert 'href="file:///x/LICENSE.txt"' in out
    assert 'href="file:///x/LICENSE_3RD_PARTY.txt"' in out
    assert "website" not in out and "3rd party" not in out


def test_patterns_do_not_disturb_plain_strings(zh):
    """模式是兜底，不能咬到普通句子。"""
    assert tr("Version 1.2.6") == "版本 1.2.6"
    assert tr("Add Files") == SAMPLE["Add Files"]
    # 一条谁都不匹配的句子原样返回
    assert tr("Nothing matches this one") == "Nothing matches this one"


def test_column_headers_are_translated(zh):
    """表头也翻 —— 它的参数是一**串**文字，走的是单独的「逐个翻」通道。

    这块一度整个漏掉：``setHeaderLabels`` 既不是「第 1 个参数是字符串」的 setter，
    静态抽取也只按「一个字符串字面量」取（元组取不到），于是运行时和覆盖率工具同时
    漏了它 —— 列标题在界面上一直显示英文，而覆盖率报告是绿的。属于最不该漏的那种盲区。
    """
    from ui.fluent.qt import QTreeWidget

    tree = QTreeWidget()
    tree.setHeaderLabels(("File Name", "Ext.", "Location"))

    assert [tree.headerItem().text(i) for i in range(3)] == ["文件名", "扩展名", "位置"]


def test_column_headers_follow_a_language_switch(app):
    """切语言时表头要整串重放，不能漏、也不能把译文再翻一次。"""
    from ui.fluent.qt import QTreeWidget

    setLanguage(SOURCE_TAG, persist=False)
    tree = QTreeWidget()
    tree.setHeaderLabels(("File Name", "Ext.", "Location"))
    assert [tree.headerItem().text(i) for i in range(3)] == ["File Name", "Ext.", "Location"]

    setLanguage(TAG, persist=False)
    res = [tree.headerItem().text(i) for i in range(3)]
    assert res == ["文件名", "扩展名", "位置"], res

    # 再切一轮，幂等：不能把「文件名」当成原文又翻一次
    setLanguage(SOURCE_TAG, persist=False)
    setLanguage(TAG, persist=False)
    res = [tree.headerItem().text(i) for i in range(3)]
    assert res == ["文件名", "扩展名", "位置"], res


def test_collect_sources_survives_sequence_registrations(app, zh):
    """覆盖率导出口要能吃下「整串登记」的表头。

    ``collectSources()`` 的返回值是 ``{原文: [出现位置]}``，而表头登记的是**一串**。
    直接拿整串去当字典键会因为 ``list`` 不可哈希而抛 ``TypeError`` —— 这个口子只有
    「界面上真的建过一个带表头的树」时才会踩到，所以这里显式造一个。
    """
    from ui.fluent.qt import QTreeWidget
    from ui.i18n import collectSources

    tree = QTreeWidget()
    tree.setHeaderLabels(("File Name", "Ext.", "Location"))

    sources = collectSources()
    assert isinstance(sources, dict)
    # 拆成单条展示文字，而不是整串 —— 覆盖率是按单条比的
    assert "File Name" in sources
    assert "Location" in sources
    assert all(isinstance(where, list) for where in sources.values())
    assert all(isinstance(text, str) for text in sources)


# ------------------------------------------------------- 数据面：一个都不许碰


def test_the_seam_leaves_data_entries_alone():
    """``QLineEdit.setText`` 装的是用户数据（ExifTool 参数、路径），不许拦。"""
    import ui.fluent.qt as seam

    assert not getattr(seam.QLineEdit.setText, "_xl_i18n_wrapped", False)


def test_combo_box_text_survives_a_language_switch(zh):
    """上游拿 ``currentText()`` 做判断，翻译绝不能碰它。"""
    from ui.fluent.qt import QComboBox

    combo = QComboBox()
    combo.addItems(["JPEG XL", "AVIF", "WebP"])
    combo.setCurrentText("JPEG XL")

    # 上游就是拿这个字符串去判等 / 查索引的，切换语言后必须一模一样。
    assert combo.currentText() == "JPEG XL"
    assert combo.findText("JPEG XL") == combo.currentIndex() == 0


def test_data_face_is_identical_in_both_languages(app):
    """整条链路：切换语言前后，数据面的取值必须逐字一致。"""
    from ui.fluent.qt import QComboBox

    setLanguage(SOURCE_TAG, persist=False)
    combo = QComboBox()
    combo.addItems(["JPEG XL", "AVIF", "WebP"])
    combo.setCurrentIndex(1)
    before = (combo.currentText(), combo.itemText(0), combo.itemText(2))

    setLanguage(TAG, persist=False)
    after = (combo.currentText(), combo.itemText(0), combo.itemText(2))

    assert before == after == ("AVIF", "JPEG XL", "WebP")


# ------------------------------------------------------------- 语言切换的时机


def test_switching_before_the_first_lookup_still_sticks():
    """启动后立刻切语言也必须生效。

    这是一个真的踩到过的坑：``setLanguage`` 如果不在开头先 ``ensureReady()``，
    那么当它是「第一次碰 i18n」时 ``_ready`` 还是 False，紧接着任何一次查表都会
    触发惰性初始化，用环境变量 / 落盘偏好把刚切好的语言**覆盖回去**。现象是
    「setLanguage 调了没生效」，且只在「启动后立刻切」时复现。
    """
    code = (
        "import os;"
        "os.environ['QT_QPA_PLATFORM']='offscreen';"
        "from PySide6.QtWidgets import QApplication;"
        "app = QApplication([]);"
        "import ui.fluent.qt;"  # 接缝装上拦截
        "from ui.i18n import setLanguage, currentLanguage, tr;"
        "setLanguage('zh_CN', persist=False);"
        "print(currentLanguage(), tr('OK'), sep='|')"
    )
    proc = subprocess.run(
        [sys.executable, "-c", code],
        capture_output=True,
        text=True,
        cwd=REPO_ROOT,
        env={**os.environ, "XLCHEMY_LANG": "en"},
    )
    assert proc.returncode == 0, proc.stderr[-600:]
    # qfluentwidgets 会往 stdout 打一行促销横幅，取最后一行才是我们的输出。
    lines = [line for line in proc.stdout.splitlines() if line.strip()]
    language, ok = lines[-1].strip().split("|")
    assert language == TAG, proc.stdout
    assert ok == "确定", proc.stdout


# ------------------------------------------------------------------- 入口


def test_source_language_shows_its_display_name():
    """语言选单里英文那项要显示 ``English``，不能退化成标签 ``en``。

    ``Catalog`` 定义了 ``__len__``（译文条数），而源语言按设计**没有**译文条目，所以
    用真值测试判空会把「空目录」当成「加载失败」，``availableLanguages()`` 于是回落到
    标签 ``en`` —— 语言选单第一项就显示成 ``en``。
    """
    names = dict(availableLanguages())
    assert names[SOURCE_TAG] == "English", names


def test_language_row_is_injected_into_the_settings_page(app):
    """设置页要有语言入口，且紧跟「主题」那一行、跟 General 分类一起显隐。

    入口是**运行时注入**的（一行都不改上游 ``settings_tab.py``），所以最容易悄无声息
    地失效：上游一改布局、注入时机不对，用户就「找不到切换语言的入口」。这条判据直接
    盯住那件事。
    """
    import ui.fluent.qt  # noqa: F401 - 先装上接缝
    from ui.fluent import langmenu
    from ui.tabs import SettingsTab

    page = SettingsTab()
    assert langmenu.installSettingsRow(page) is True

    theme_index = langmenu._layoutIndex(page.settings_lt, page.theme_hb)
    assert theme_index is not None
    row = page.settings_lt.itemAt(theme_index + 1).widget()
    assert isinstance(row, langmenu.LanguageRow), "语言行要插在主题行之后"

    # 语言名用各自母语写法，英文那项是 English 而不是 en
    labels = [row.combo.itemText(i) for i in range(row.combo.count())]
    assert "English" in labels, labels

    # 属于 General 分类：切走要隐藏，切回来要显示
    page.changeCategory("Advanced")
    assert row.isHidden()
    page.changeCategory("General")
    assert not row.isHidden()


# --------------------------------------------------------------- 目录与抽取器


def test_available_languages_exposes_the_source_language_first():
    tags = [tag for tag, _ in availableLanguages()]
    assert tags[0] == SOURCE_TAG, "英文是源语言，排在第一位"
    assert TAG in tags


@pytest.mark.parametrize(
    "text, expected",
    [
        ("Add Files", True),
        ("Quality", True),          # 单个驼峰词但以 Q 开头，不能被当成 Qt 类名吃掉
        ("QCheckBox", False),       # Qt 类名
        (".JPG", False),            # 文件后缀徽标
        (".AVIF", False),
        ("avifenc\nAVIF", False),   # 多行标识标签
        ("...", False),             # 纯标点
        ("", False),
        ("ui/widgets/label.py", False),  # 路径
        ("https://example.com", False),  # URL
    ],
)
def test_translatable_predicate(text, expected):
    """抽取器与运行时共用这套判定，两条路不能漂移。"""
    assert _isTranslatable(text) is expected
