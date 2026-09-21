# -*- mode: python ; coding: utf-8 -*-
import platform
from data.constants import VERSION

import sys
from pathlib import Path

block_cipher = None

target_arch = "universal2" if platform.system() == "Darwin" else None

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
    name='xlchemy',
)
if platform.system() == "Darwin":
    app = BUNDLE(
        coll,
        name='Xlchemy.app',
        icon='./images/logo.icns',
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

