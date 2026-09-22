"""缩略图取图策略。

Qt 的格式表里没有 ``avif`` / ``jxl``，但 macOS 的 ImageIO 插件能解两者 —— 只要
在 ``QImageReader`` 上**显式指定** ``heic``/``heif`` 之一，插件就会把字节交给
ImageIO。所以直通顺序是：先让 Qt 自己嗅探，认不出来再按候选格式名重试。

本模块只依赖 QtGui（``QImage``），不参与任何 widget；策略部分（该试哪些格式名、
缓存键怎么算）是纯函数，可以单测。
"""

from __future__ import annotations

import logging
import os
from collections import OrderedDict

from PySide6.QtCore import QSize, Qt
from PySide6.QtGui import QImage, QImageReader

logger = logging.getLogger(__name__)

# Qt 认不出的扩展名 -> 值得逐个强试的格式名。
FORCED_FORMATS = {
    "avif": ("heic", "heif"),
    "heif": ("heic", "heif"),
    "jxl": ("heic", "heif"),
}

DEFAULT_THUMB_PX = 64
CACHE_LIMIT = 512

_cache: "OrderedDict[tuple, QImage]" = OrderedDict()


def extensionOf(path: str) -> str:
    return os.path.splitext(str(path))[1].lstrip(".").lower()


def candidateFormats(path: str) -> tuple:
    """Reader format names to try, in order. ``None`` means "let Qt sniff"."""
    forced = FORCED_FORMATS.get(extensionOf(path))
    if forced is None:
        return (None,)
    return (None,) + forced


def cacheKey(path: str, max_px: int) -> tuple:
    """Keyed on mtime+size so an edited file does not serve a stale thumb."""
    try:
        stat = os.stat(path)
        stamp = (int(stat.st_mtime_ns), stat.st_size)
    except OSError:
        stamp = (0, 0)
    return (os.path.normcase(os.path.abspath(str(path))), max_px) + stamp


def clearCache() -> None:
    _cache.clear()


def _remember(key: tuple, image: QImage | None) -> QImage | None:
    if image is not None and not image.isNull():
        _cache[key] = image
        _cache.move_to_end(key)
        while len(_cache) > CACHE_LIMIT:
            _cache.popitem(last=False)
    return image


def loadPreview(path: str, max_px: int = DEFAULT_THUMB_PX) -> QImage | None:
    """Decode a thumbnail-sized image, or None when nothing can read it."""
    key = cacheKey(path, max_px)
    hit = _cache.get(key)
    if hit is not None:
        _cache.move_to_end(key)
        return hit

    for fmt in candidateFormats(path):
        reader = QImageReader(str(path)) if fmt is None else QImageReader(str(path), fmt.encode())
        image = _readScaled(reader, max_px)
        if image is not None and not image.isNull():
            return _remember(key, image)

    logger.debug(f"[preview] No decoder for {path}")
    return None


def _readScaled(reader: QImageReader, max_px: int) -> QImage | None:
    """Ask the decoder to downscale while reading; scale afterwards if it can't.

    The ImageIO-backed plugin reports a size but ignores ``setScaledSize``, so
    the post-read pass is what actually keeps AVIF/JXL thumbnails small.
    """
    reader.setAutoTransform(True)
    size = reader.size()
    if size.isValid() and max(size.width(), size.height()) > max_px:
        ratio = max_px / max(size.width(), size.height())
        target = QSize(max(1, int(size.width() * ratio)), max(1, int(size.height() * ratio)))
        reader.setScaledSize(target)

    image = reader.read()
    if image.isNull():
        return None

    if max(image.width(), image.height()) > max_px:
        image = image.scaled(
            QSize(max_px, max_px), Qt.KeepAspectRatio, Qt.SmoothTransformation
        )
    return image.convertToFormat(QImage.Format_ARGB32)
