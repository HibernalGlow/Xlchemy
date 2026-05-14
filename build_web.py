import platform
import os
import shutil
import subprocess
import argparse
import stat
from pathlib import Path

import PyInstaller.__main__

from data.constants import VERSION

PROGRAM_FOLDER = os.path.dirname(os.path.realpath(__file__))


def makedirs(path):
    path = os.path.normpath(path)
    try:
        os.makedirs(path, exist_ok=True)
    except OSError as err:
        print(f"[Error] Makedirs failed ({path}) ({err})")


def copy(src, dst):
    src = os.path.normpath(src)
    dst = os.path.normpath(dst)
    try:
        if os.path.isdir(src):
            shutil.copytree(src, dst, dirs_exist_ok=True)
        else:
            shutil.copy(src, dst)
    except OSError as err:
        print(f"[Error] Copying failed ({src} -> {dst}) ({err})")


def rmTree(path):
    if os.path.isdir(path):
        shutil.rmtree(path)


class Builder:
    def __init__(self):
        self.project_name = "xlchemy-web"
        self.dst_dir = "dist_web"
        self.internal_dir = f"{self.dst_dir}/{self.project_name}/_internal"

        self.bin_dir = {
            "Windows": "bin/win",
            "Linux": "bin/linux",
            "Darwin": "bin/macos",
        }

    def build(self):
        self._prepare()
        self._buildFrontend()
        self._buildBinaries()
        self._copyDependencies()
        self._copyAssets()
        print(f"[Building] Finished (built to {self.dst_dir}/{self.project_name})")

    def _prepare(self):
        if platform.system() == "Windows":
            for file_path in Path(self.dst_dir).rglob("*"):
                if file_path.is_file():
                    try:
                        file_path.chmod(stat.S_IWRITE)
                    except Exception:
                        pass
            for file_path in Path(self.bin_dir["Windows"]).rglob("*"):
                if file_path.is_file():
                    try:
                        file_path.chmod(stat.S_IWRITE)
                    except Exception:
                        pass

        rmTree(self.dst_dir)
        rmTree("./_pyinstaller_web")

    def _buildFrontend(self):
        print("[Building] Building web frontend")
        ui_web_dir = Path(PROGRAM_FOLDER, "ui_web")
        dist_dir = ui_web_dir / "dist"

        if not dist_dir.exists():
            print("[Building] ui_web/dist not found, building frontend...")
            try:
                result = subprocess.run(
                    ["pnpm", "run", "build"],
                    cwd=ui_web_dir,
                    check=True,
                    capture_output=True,
                    text=True,
                )
                print(result.stdout)
            except FileNotFoundError:
                raise Exception("pnpm not found. Please install pnpm and run 'pnpm install' in ui_web/")
            except subprocess.CalledProcessError as e:
                raise Exception(f"Frontend build failed:\n{e.stderr}")

        if not dist_dir.exists():
            raise Exception("ui_web/dist still not found after build attempt")

    def _buildBinaries(self):
        print("[Building] Generating binaries with PyInstaller")
        makedirs(self.dst_dir)

        spec_path = Path(PROGRAM_FOLDER, "misc", "main_web.spec")
        if not spec_path.exists():
            self._generateSpec()

        PyInstaller.__main__.run([
            "--log-level=ERROR",
            "--workpath=./_pyinstaller_web",
            "--distpath=./dist_web",
            str(spec_path),
        ])

    def _generateSpec(self):
        print("[Building] Generating main_web.spec")
        spec_content = f'''# -*- mode: python ; coding: utf-8 -*-

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

# Include web frontend dist files - paths relative to spec file location (misc/)
ui_web_dist = Path(__file__).parent.parent / 'ui_web' / 'dist'
datas_list = []
if ui_web_dist.exists():
    for item in ui_web_dist.rglob('*'):
        if item.is_file():
            rel_path = item.relative_to(ui_web_dist)
            datas_list.append((str(item), str(rel_path.parent)))

a = Analysis(
    [str(Path(__file__).parent.parent / 'web_main.py')],
    pathex=[],
    binaries=binaries_list,
    datas=datas_list,
    hiddenimports=hiddenimports_list,
    hookspath=[],
    hooksconfig={{}},
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
    icon=[str(Path(__file__).parent / 'images' / 'logo.ico')],
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
'''
        spec_path = Path(PROGRAM_FOLDER, "misc", "main_web.spec")
        with open(spec_path, "w") as f:
            f.write(spec_content)

    def _copyDependencies(self):
        print("[Building] Copying dependencies")
        bin_dir = self.bin_dir[platform.system()]
        bin_path = Path(bin_dir)

        if bin_path.exists() and any(bin_path.iterdir()):
            makedirs(Path(self.internal_dir, bin_dir))
            for item in bin_path.rglob("*"):
                if item.is_file():
                    rel = item.relative_to(bin_path)
                    dst = Path(self.internal_dir, bin_dir, rel)
                    makedirs(dst.parent)
                    shutil.copy2(item, dst)
        else:
            print(f"[Building] Warning: {bin_dir} directory is empty. External encoders will not be available.")

    def _copyAssets(self):
        print("[Building] Copying assets")
        assets = (
            "LICENSE.txt",
            "LICENSE_3RD_PARTY.txt",
            "./assets/",
        )
        for item in assets:
            src = Path(item)
            if src.exists():
                dst = Path(self.internal_dir, src.name)
                copy(src, dst)


if __name__ == '__main__':
    try:
        builder = Builder()
        builder.build()
    except KeyboardInterrupt:
        print("[Canceled] Interrupted")
        exit()
    except SystemExit:
        exit()
    except Exception as err:
        print(f"[Error] {err}")
        exit()
