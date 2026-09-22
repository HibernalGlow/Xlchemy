import os
import shutil
import subprocess
import time

import pytest
from PIL import Image

from core import preview
from core.preview import cacheKey, candidateFormats, extensionOf, loadPreview

SOURCE_COLOR = (10, 200, 90)


@pytest.fixture(autouse=True)
def _clean_cache():
    preview.clearCache()
    yield
    preview.clearCache()


@pytest.fixture
def png(tmp_path):
    path = tmp_path / "src.png"
    Image.new("RGB", (320, 200), SOURCE_COLOR).save(path)
    return str(path)


def _encode(src, tool, args, dst):
    binary = shutil.which(tool) or os.path.join("bin", "macos", tool)
    if not os.path.exists(binary):
        pytest.skip(f"{tool} not available")
    subprocess.run([binary, *args, src, dst], check=True, capture_output=True)
    return dst


def test_extension_of_is_case_insensitive():
    assert extensionOf("/a/b/PHOTO.Jxl") == "jxl"
    assert extensionOf("/a/b/noext") == ""


@pytest.mark.parametrize("name,expected", [
    ("/a/x.png", (None,)),
    ("/a/x.jpeg", (None,)),
    ("/a/x.avif", (None, "heic", "heif")),
    ("/a/x.jxl", (None, "heic", "heif")),
])
def test_candidate_formats(name, expected):
    assert candidateFormats(name) == expected


def test_cache_key_is_stable_then_follows_size(tmp_path, png):
    first = cacheKey(png, 64)
    assert first == cacheKey(png, 64)
    assert first != cacheKey(png, 128)

    with open(png, "ab") as handle:
        handle.write(b"\x00")
    os.utime(png, (time.time() + 5, time.time() + 5))
    assert cacheKey(png, 64) != first


def test_cache_key_for_a_missing_file_is_usable(tmp_path):
    key = cacheKey(str(tmp_path / "gone.png"), 64)
    assert key[-2:] == (0, 0)


def test_load_preview_caps_the_long_side(png):
    image = loadPreview(png, max_px=64)
    assert image is not None
    assert max(image.width(), image.height()) <= 64
    assert image.format() == preview.QImage.Format_ARGB32


def test_load_preview_avif_passes_through(png, tmp_path):
    dst = _encode(png, "avifenc", ["-q", "80", "-s", "5"], str(tmp_path / "t.avif"))
    image = loadPreview(dst, max_px=64)
    assert image is not None, "AVIF 应该能经 ImageIO 插件解出来"
    assert max(image.width(), image.height()) <= 64
    color = image.pixelColor(image.width() // 2, image.height() // 2)
    assert abs(color.red() - SOURCE_COLOR[0]) <= 6
    assert abs(color.green() - SOURCE_COLOR[1]) <= 6
    assert abs(color.blue() - SOURCE_COLOR[2]) <= 6


def test_load_preview_jxl_passes_through(png, tmp_path):
    dst = _encode(png, "cjxl", ["-d", "1.0"], str(tmp_path / "t.jxl"))
    image = loadPreview(dst, max_px=64)
    assert image is not None, "JXL 应该能经 ImageIO 插件解出来"
    color = image.pixelColor(image.width() // 2, image.height() // 2)
    assert abs(color.green() - SOURCE_COLOR[1]) <= 6


def test_second_call_hits_the_cache(png):
    first = loadPreview(png, max_px=64)
    second = loadPreview(png, max_px=64)
    assert first is second


def test_unreadable_path_returns_none(tmp_path):
    bogus = tmp_path / "notreally.avif"
    bogus.write_bytes(b"not an image")
    assert loadPreview(str(bogus), max_px=64) is None
