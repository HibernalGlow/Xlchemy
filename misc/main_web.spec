# -*- mode: python ; coding: utf-8 -*-

import sys
from pathlib import Path

block_cipher = None

hiddenimports_list = [
    'xlchemy_rust',
    'xlchemy_rust._lowlevel',
    'PySide6',
    'PySide6.QtCore',
]

binaries_list = []
try:
    import xlchemy_rust._lowlevel as _lowlevel
    lowlevel_path = Path(_lowlevel.__file__)
    if lowlevel_path.exists():
        binaries_list.append((str(lowlevel_path), 'xlchemy_rust'))
except ImportError:
    pass

# Include web frontend dist files
ui_web_dist = Path('../ui_web/dist')
datas_list = []
if ui_web_dist.exists():
    for item in ui_web_dist.rglob('*'):
        if item.is_file():
            rel_path = item.relative_to(ui_web_dist)
            datas_list.append((str(item), str(rel_path.parent)))

a = Analysis(
    ['../web_main.py'],
    pathex=[],
    binaries=binaries_list,
    datas=datas_list,
    hiddenimports=hiddenimports_list,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['PySide6.QtWidgets', 'PySide6.QtGui', 'PySide6.QtMultimedia'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='xlchemy-web',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['./images/logo.ico'],
)
coll = COLLECT(
    exe,
    a.datas,
    a.binaries,
    a.zipfiles,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='xlchemy-web',
)
