# -*- mode: python ; coding: utf-8 -*-

import sys
from pathlib import Path

block_cipher = None

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

a = Analysis(
    ['../main.py'],
    pathex=[],
    binaries=binaries_list,
    datas=[],
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
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='xl-converter',
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
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='xl-converter',
)
