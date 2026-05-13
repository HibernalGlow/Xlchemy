import shutil
import os
import logging
from pathlib import Path
from typing import List, Any
from hashlib import blake2b

from core.exceptions import FileException

def scanDir(path: str) -> list:
    """Recursively scan a directory for files. Returns paths or raises FileNotFoundError If a directory was not found."""
    if not os.path.exists(path):
        raise FileNotFoundError(path)

    files = []
    for root, _, filenames in os.walk(path):
        for filename in filenames:
            files.append(os.path.join(root, filename))
    return files

def scanDirFast(path: str) -> list:
    """Fast recursive scan using os.scandir. Returns paths or raises FileNotFoundError."""
    if not os.path.exists(path):
        raise FileNotFoundError(path)

    files = []
    stack = [path]
    while stack:
        current = stack.pop()
        try:
            with os.scandir(current) as it:
                for entry in it:
                    if entry.is_dir(follow_symlinks=False):
                        stack.append(entry.path)
                    elif entry.is_file(follow_symlinks=False):
                        files.append(entry.path)
        except (OSError, PermissionError):
            continue
    return files

def dictToList(data: dict):
    """Convert a dictionary into a list of tuples."""
    result = []
    for k, v in data.items():
        if isinstance(v, dict):
            v = dictToList(v)
        result.append(
            (k, v)
        )
    return result

def clip(val, _min, _max):
    """Limit value to a given range."""
    if val > _max:
        return _max
    elif val < _min:
        return _min
    else:
        return val

def getFreeSpaceLeft(path: str) -> int:
    """Returns free space left on the device in bytes, or -1 if it cannot be determined."""
    try:
        total, used, free = shutil.disk_usage(path)
        return free
    except Exception as e:
        logging.error(f"[getFreeSpaceLeft] {e}")
        return -1

def b2sum(file_path: str, digest_size: int = 64, chunk_size: int = 8192) -> str:
    """Calculates BLAKE2b sum from a given file.

    Raises:
        OSError: if file cannot be read.
        ValueError: if digest_size is not between 1 and 64
    """
    path = Path(file_path)
    hasher = blake2b(digest_size=digest_size)

    try:
        with path.open("rb") as f:
            while chunk := f.read(chunk_size):
                hasher.update(chunk)
    except OSError as e:
        raise OSError(f"Cannot calculate checksum. {e}")

    return hasher.hexdigest()

def remove(*file_paths: list[str], exc_id="") -> None:
    """Removes file(s).

    Raises:
    FileException: if removing a file fails.
    """
    for file_path in file_paths:
        try:
            os.remove(file_path)
        except Exception as e:
            raise FileException(exc_id, f"Failed to remove file. {e}")
