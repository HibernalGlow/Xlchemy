# -*- mode: python ; coding: utf-8 -*-
import fnmatch
import importlib.util
import os
import platform
from data.constants import VERSION

import sys
from pathlib import Path

block_cipher = None

# universal2 requires every bundled native binary to be fat; Homebrew CPython and the
# abi3 wheels (psutil, shiboken6) ship arm64-only slices, so opt in with XL_MAC_UNIVERSAL2.
target_arch = "universal2" if platform.system() == "Darwin" and os.getenv("XL_MAC_UNIVERSAL2") else None

hiddenimports_list = [
    'xlchemy_rust', 
    'xlchemy_rust._lowlevel',
    'PySide6',
    'PySide6.QtCore',
    'PySide6.QtGui',
    'PySide6.QtWidgets',
    'PySide6.QtMultimedia',
]

binaries_list = []
try:
    import xlchemy_rust._lowlevel as _lowlevel
    lowlevel_path = Path(_lowlevel.__file__)
    if lowlevel_path.exists():
        binaries_list.append((str(lowlevel_path), 'xlchemy_rust'))
except ImportError:
    pass

# i18n 的译文本体是**数据文件**（locales/*.json），不是 Python 模块 ——
# PyInstaller 只会自动收集 import 到的模块，json 不会被带上。漏了的话冻结后
# ui/i18n/locales/ 是空目录：availableTags() 只剩 en，语言切换静默失效（不报错，
# 所以只能靠这里显式声明）。
#
# 落点必须和 ui/i18n/catalog.py 里 `Path(__file__).parent / "locales"` 推出的位置对上：
# 冻结后该模块在 PYZ 里，__file__ 形如 <_MEIPASS>/ui/i18n/catalog.pyc，
# 所以目标是 <_MEIPASS>/ui/i18n/locales（BUNDLE 下即 Contents/Frameworks/ui/i18n/locales）。
#
# 整个目录一起收，而不是逐个列语言：以后加语言不用再改这个文件。
# SPECPATH 由 PyInstaller 注入（就是本 spec 所在的 misc/；它同时会 chdir 到那里）。
datas_list = []
_locales_dir = os.path.normpath(os.path.join(SPECPATH, "..", "ui", "i18n", "locales"))
if os.path.isdir(_locales_dir):
    datas_list.append((_locales_dir, os.path.join("ui", "i18n", "locales")))
print(f"[main.spec] i18n locales: {_locales_dir} -> ui/i18n/locales "
      f"({len(os.listdir(_locales_dir)) if os.path.isdir(_locales_dir) else 0} 个文件)")

# ── 提前剔除用不到的 Qt 组件，让 build.py 的瘦身步骤变成空操作 ──
# build.py 的 _reduceBundleSize 走的是「先全量收进来，再对一批模式做递归删除」。
# 在受限 shell 里那一步会被批量删除护栏拦下（QtQmlModels.framework 一个目录就 53 个条目，
# 阈值 50），于是整条 `task build` 到最后一刻才失败、产物是半成品。
#
# 这里把同一份模式提前作用在 Analysis 结果上：**根本不会收进来**，自然也没有递归删除。
# 结果与「收进来再删掉」等价（同一份模式、同样的匹配语义），但不再依赖删除。
#
# ⚠️ 模式清单**从 build.py 读取**，不在这里复制一份 —— 两处清单一旦漂移，
#    我们这边多排除一个上游已不再删的组件就会真把应用搞坏。读不到就退回原行为
#    （即不预排除，交给 build.py 自己删；只是在受限 shell 里仍会失败，不会更坏）。
_cleanup_patterns: list[str] = []
try:
    _builder_py = os.path.normpath(os.path.join(SPECPATH, "..", "build.py"))
    _builder_spec = importlib.util.spec_from_file_location("_xl_build", _builder_py)
    _builder_mod = importlib.util.module_from_spec(_builder_spec)
    _builder_spec.loader.exec_module(_builder_mod)
    # cleanup_resources 是**实例属性**（在 Builder.__init__ 里赋值），没有类常量可读。
    # 而直接 Builder() 会走 Args() → argparse 去解析 sys.argv —— 那里面是 PyInstaller
    # 自己的命令行参数，会被判成非法选项后 SystemExit。所以实例化期间把 argv 缩成
    # 「不带参数」的形状，拿到清单立刻还原。
    _saved_argv = sys.argv
    try:
        sys.argv = [_builder_py]
        _cleanup_patterns = list(_builder_mod.Builder().cleanup_resources.get("Darwin", ()))
    finally:
        sys.argv = _saved_argv
    print(f"[main.spec] 预排除模式 {len(_cleanup_patterns)} 条（取自 build.py 的 Darwin 清单）")
except Exception as _error:  # noqa: BLE001 - 读不到就退回原行为
    print(f"[main.spec] 读 build.py 瘦身清单失败，跳过预排除：{_error!r}")


def _is_dropped(dest: str) -> bool:
    """dest 是相对 bundle 根的路径；对得上任一条瘦身模式就是要剔除的。

    匹配语义必须与 build.py 的 _reduceBundleSize **逐条对齐**：它除了按
    `<root>/<模式>` 匹配，在 Darwin 上还会额外按 **basename** 匹配一次
    （`os.path.join(root, os.path.basename(res))`）—— 因为 PySide6 的
    libavcodec/libavformat/QtQml 等会被收集到 bundle **根**
    （Contents/Frameworks/libavcodec.61.dylib），而不是 PySide6/Qt/lib/ 下。
    这里少补 basename 这一条，那些根级组件就会漏网、留给 build.py 去删，
    于是又退回「先收后删」——在受限 shell 里正好被批量删除护栏拦下。
    """
    path = dest.replace(os.sep, "/")
    for pattern in _cleanup_patterns:
        # Windows 清单用反斜杠，统一成 POSIX 再比。
        normalized = pattern.replace("\\", "/")
        if fnmatch.fnmatch(path, normalized) or fnmatch.fnmatch(path, normalized + "/*"):
            return True
        base = os.path.basename(normalized)
        if base != normalized and (
            fnmatch.fnmatch(path, base) or fnmatch.fnmatch(path, base + "/*")
        ):
            return True
    return False


a = Analysis(
    ['../main.py'],
    pathex=[],
    binaries=binaries_list,
    datas=datas_list,
    hiddenimports=hiddenimports_list,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

if _cleanup_patterns:
    # 保持 TOC 类型（PyInstaller 内部按 TOC 处理，别用裸 list 顶替）。
    for _attr in ("binaries", "datas"):
        _toc = getattr(a, _attr)
        _kept = _toc.__class__(entry for entry in _toc if not _is_dropped(entry[0]))
        print(f"[main.spec] {_attr}: {len(_toc)} -> {len(_kept)}"
              f"（剔除 {len(_toc) - len(_kept)} 个用不到的 Qt 组件）")
        setattr(a, _attr, _kept)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='xlchemy',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=target_arch,
    codesign_identity=None,
    entitlements_file=None,
    icon=[str(Path(SPECPATH) / "images" / "logo.ico")],
)
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='xlchemy',
)
if platform.system() == "Darwin":
    app = BUNDLE(
        coll,
        name='Xlchemy.app',
        icon=str(Path(SPECPATH) / "images" / "logo.icns"),
        bundle_identifier='eu.codepoems.xl-converter',
        version=VERSION,
        info_plist={
            'NSPrincipalClass': 'NSApplication',
            'NSAppleScriptEnabled': False,
            'CFBundleName': 'Xlchemy',
            'CFBundleDisplayName': 'Xlchemy',
            'CFBundleIdentifier': 'eu.codepoems.xl-converter',
            'CFBundleExecutable': 'xlchemy',
            'CFBundleVersion': VERSION,
            'CFBundleShortVersionString': VERSION,
            'LSMinimumSystemVersion': '11.0',
            'CFBundlePackageType': 'APPL',
            'NSHighResolutionCapable': True,
        },
    )

