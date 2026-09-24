"""One ImageMagick ping per file, shared by every caller.

``core.convert.getImageRes()`` and ``getImageCount()`` each spawned their own
``magick identify``, so a TIFF or WebP that went through conflict checking and
then the RAM optimizer was opened twice. Both probes now come from here and
share a cache keyed on ``(path, mtime, size)``.
"""

import logging
import os
import re
import threading

from data.constants import IMAGE_MAGICK_PATH
from core.exceptions import CancellationException
from core.process import runProcess2
import data.task_status as task_status

logger = logging.getLogger(__name__)

_RES_RE = re.compile(r"^(\d+)x(\d+)(?=\D|$)")
_COUNT_RE = re.compile(r"\d+")

_CACHE_LIMIT = 1024

_cache: dict = {}
_cache_lock = threading.Lock()


def clearCache() -> None:
    """Empties the probe cache. Intended for tests and for a fresh run."""
    with _cache_lock:
        _cache.clear()


def _key(image_path: str) -> tuple | None:
    """A key that invalidates itself once the file changes underneath us.

    Returns None when the file cannot be stat'ed: nothing is cached for it, so a
    path that is created later is never served a stale answer.
    """
    try:
        stat = os.stat(image_path)
    except OSError:
        return None

    return (image_path, stat.st_mtime_ns, stat.st_size)


def _identify(*args: str) -> tuple[str, str]:
    stdout, stderr = runProcess2(IMAGE_MAGICK_PATH, *args)

    if task_status.wasCanceled():
        raise CancellationException()

    return (stdout, stderr)


def _parseRes(text: str) -> tuple[int, int]:
    res_match = _RES_RE.match(text)
    if not res_match:
        return (-1, -1)

    width = int(res_match.group(1))
    height = int(res_match.group(2))

    if min(width, height) < 1:
        return (-1, -1)

    return (width, height)


def _parseCount(text: str) -> int | None:
    """Returns the page count, or None when it is not in this line."""
    count_match = _COUNT_RE.search(text)
    if not count_match:
        return None

    try:
        return int(count_match.group(0))
    except ValueError:
        return None


def _remember(key: tuple | None, probed: dict, cached: dict | None) -> None:
    if key is None:
        return

    if cached is not None:
        # A resolution-only probe knows nothing about pages, and a failed probe
        # knows nothing at all. Keep whatever the earlier one did learn.
        if probed["count"] is None and cached["count"] is not None:
            probed["count"] = cached["count"]
        if probed["width"] < 1 and cached["width"] > 0:
            probed["width"], probed["height"] = cached["width"], cached["height"]

    with _cache_lock:
        if len(_cache) >= _CACHE_LIMIT:
            _cache.clear()
        _cache[key] = probed


def _probe(image_path: str, want_count: bool) -> dict:
    """Returns {width, height, count, stderr}. `count` stays None when unknown.

    Note: width and height might be flipped because Exif orientation is not
    followed. Adding -auto-orient works, but is too slow and too memory intensive.
    """
    key = _key(image_path)

    with _cache_lock:
        cached = _cache.get(key)

    if cached is not None:
        if want_count and cached["count"] is not None:
            return cached
        if not want_count and cached["width"] > 0:
            return cached

    if want_count:
        # Without the index identify pings every page, which is what %n needs.
        # The first line then carries page 0's geometry, so the resolution comes
        # along for free instead of costing a second spawn.
        stdout, stderr = _identify("identify", "-ping", "-format", "%[page] %n\n", image_path)
        first_line = stdout.split("\n", 1)[0]
        width, height = _parseRes(first_line)
        count = _parseCount(first_line.split()[-1] if first_line.split() else "")
    else:
        stdout, stderr = _identify("identify", "-ping", "-format", "%[page]", f"{image_path}[0]")
        width, height = _parseRes(stdout)
        count = None

    probed = {"width": width, "height": height, "count": count, "stderr": stderr}
    _remember(key, probed, cached)

    return probed


def getResolution(image_path: str) -> tuple[int, int]:
    """Returns resolution of an image or (-1, -1) if one cannot be determined."""
    probed = _probe(image_path, want_count=False)

    if probed["width"] < 1:
        logger.error(f"[image_probe] Cannot determine resolution. {probed['stderr']}")

    return (probed["width"], probed["height"])


def getPageCount(image_path: str) -> tuple[int, str]:
    """Returns image count (frame or page count) and stderr. -1 if undetermined."""
    probed = _probe(image_path, want_count=True)

    if probed["count"] is None:
        logger.error(f"[image_probe] Cannot determine image count. {probed['stderr']}")
        return (-1, probed["stderr"])

    return (probed["count"], probed["stderr"])
