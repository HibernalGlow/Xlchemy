"""core.image_probe: one identify ping per file, shared and cached."""

import pytest
from unittest.mock import patch

import core.image_probe as image_probe
from core.exceptions import CancellationException


@pytest.fixture(autouse=True)
def emptyCache():
    image_probe.clearCache()
    yield
    image_probe.clearCache()


@pytest.fixture
def imagePath(tmp_path):
    """An existing file. Only stat() matters here: identify itself is mocked."""
    path = tmp_path / "shot.png"
    path.write_bytes(b"1234")
    return str(path)


class Identify:
    """Context manager: mocks `magick identify` and records every argv."""

    def __init__(self, stdout="", stderr="", canceled=False):
        self.stdout, self.stderr, self.canceled = stdout, stderr, canceled
        self.calls = []

    def __enter__(self):
        self.mock = patch("core.image_probe.runProcess2", side_effect=self._record)
        self.cancel = patch("core.image_probe.task_status.wasCanceled", return_value=self.canceled)
        self.magick = patch("core.image_probe.IMAGE_MAGICK_PATH", "im_path")
        self.mock.__enter__()
        self.cancel.__enter__()
        self.magick.__enter__()
        return self

    def __exit__(self, *exc):
        self.magick.__exit__(*exc)
        self.cancel.__exit__(*exc)
        self.mock.__exit__(*exc)
        return False

    def _record(self, *args, cwd=None):
        self.calls.append(args)
        return (self.stdout, self.stderr)

    @property
    def spawn_count(self):
        return len(self.calls)


def test_resolution_argv_and_parse(imagePath):
    with Identify("2000x3000+0+0") as identify:
        assert image_probe.getResolution(imagePath) == (2000, 3000)

    assert identify.calls == [
        ("im_path", "identify", "-ping", "-format", "%[page]", f"{imagePath}[0]"),
    ]


@pytest.mark.parametrize("stdout", ["1a00x2000", "", "1000xa000", "x2000", "2000x", "1a00x2000a", "0x0", "0x120"])
def test_resolution_invalid(stdout, imagePath, caplog):
    with Identify(stdout, stderr="identify: no decode delegate"):
        assert image_probe.getResolution(imagePath) == (-1, -1)

    assert "Cannot determine resolution" in caplog.records[0].message
    assert "no decode delegate" in caplog.records[0].message


def test_count_argv_and_merged_parse(imagePath):
    # identify repeats the format string for every page of a multipage image.
    with Identify("2000x3000+0+0 5\n" * 5) as identify:
        assert image_probe.getPageCount(imagePath) == (5, "")

    assert identify.calls == [
        ("im_path", "identify", "-ping", "-format", "%[page] %n\n", imagePath),
    ]


def test_merged_probe_also_answers_resolution(imagePath):
    """The page-0 geometry comes with the count, so resolution costs nothing extra."""
    with Identify("2000x3000+0+0 3\n" * 3) as identify:
        assert image_probe.getPageCount(imagePath) == (3, "")
        assert image_probe.getResolution(imagePath) == (2000, 3000)

    assert identify.spawn_count == 1


@pytest.mark.parametrize("stdout", ["not found", "", "no digits here"])
def test_count_not_available(stdout, imagePath, caplog):
    stderr = "identify: improper image header"

    with Identify(stdout, stderr=stderr) as identify:
        assert image_probe.getPageCount(imagePath) == (-1, stderr)

    assert "Cannot determine image count" in caplog.records[0].message
    assert stderr in caplog.records[0].message


def test_failed_count_probe_leaves_resolution_unknown(imagePath):
    """%n missing means no page count; the resolution probe still has to run."""
    with Identify("") as identify:
        assert image_probe.getPageCount(imagePath) == (-1, "")
        assert image_probe.getResolution(imagePath) == (-1, -1)

    assert identify.spawn_count == 2


def test_resolution_is_cached(imagePath):
    with Identify("2000x3000") as identify:
        assert image_probe.getResolution(imagePath) == (2000, 3000)
        assert image_probe.getResolution(imagePath) == (2000, 3000)

    assert identify.spawn_count == 1


def test_caching_survives_alternating_callers(imagePath):
    with Identify("2000x3000+0+0 2\n" * 2) as identify:
        assert image_probe.getPageCount(imagePath) == (2, "")
        assert image_probe.getResolution(imagePath) == (2000, 3000)
        assert image_probe.getPageCount(imagePath) == (2, "")

    assert identify.spawn_count == 1


def test_missing_file_is_not_cached(tmp_path):
    gone = str(tmp_path / "gone.png")

    with Identify("2000x3000") as identify:
        assert image_probe.getResolution(gone) == (2000, 3000)
        assert image_probe.getResolution(gone) == (2000, 3000)

    assert identify.spawn_count == 2


def test_changed_file_is_reprobed(imagePath):
    with Identify("2000x3000") as identify:
        assert image_probe.getResolution(imagePath) == (2000, 3000)

    with open(imagePath, "wb") as handle:      # different size, different key
        handle.write(b"123456789")

    with Identify("40x30") as identify:
        assert image_probe.getResolution(imagePath) == (40, 30)

    assert identify.spawn_count == 1


def test_clearCache(imagePath):
    with Identify("2000x3000") as identify:
        assert image_probe.getResolution(imagePath) == (2000, 3000)
        image_probe.clearCache()
        assert image_probe.getResolution(imagePath) == (2000, 3000)

    assert identify.spawn_count == 2


@pytest.mark.parametrize("entry_point", ["getResolution", "getPageCount"])
def test_cancellation_raised(entry_point, imagePath):
    with Identify("2000x3000+0+0 1", canceled=True):
        with pytest.raises(CancellationException):
            getattr(image_probe, entry_point)(imagePath)


@pytest.mark.parametrize("entry_point", ["getResolution", "getPageCount"])
def test_canceled_probe_is_not_cached(entry_point, imagePath):
    with Identify("2000x3000+0+0 1", canceled=True):
        with pytest.raises(CancellationException):
            getattr(image_probe, entry_point)(imagePath)

    with Identify("640x480") as identify:
        assert image_probe.getResolution(imagePath) == (640, 480)

    assert identify.spawn_count == 1


def test_cache_limit_does_not_grow_unbounded(tmp_path):
    with Identify("2000x3000") as identify:
        for i in range(image_probe._CACHE_LIMIT + 50):
            path = tmp_path / f"i{i}.png"
            path.write_bytes(b"1")
            image_probe.getResolution(str(path))

    assert len(image_probe._cache) <= image_probe._CACHE_LIMIT
