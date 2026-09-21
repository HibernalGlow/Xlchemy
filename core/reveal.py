"""Reveal a file in the platform's file manager. No Qt.

The command is built separately from the call so the odd per-platform spelling
can be asserted without launching anything.
"""

import os
import platform
import subprocess


def build_reveal_command(path: str, system: str = "") -> tuple:
    system = system or platform.system()

    if system == "Darwin":
        return ("open", "-R", path)
    if system == "Windows":
        return ("explorer", "/select,", _win_normalized(path))
    if system == "Linux":
        # No portable reveal; open the containing folder instead.
        return ("xdg-open", os.path.dirname(os.path.abspath(path)))
    raise ValueError(f"Unsupported platform ({system})")


def _win_normalized(path: str) -> str:
    return os.path.abspath(path).replace("/", "\\")


def reveal(path: str, system: str = "") -> tuple:
    """Return (ok, message). A missing file is reported, not raised."""
    if not os.path.exists(path):
        return (False, f"File not found: {path}")
    try:
        subprocess.run(build_reveal_command(path, system), check=False)
    except OSError as err:
        return (False, f"Failed to open the file manager. {err}")
    return (True, "")
