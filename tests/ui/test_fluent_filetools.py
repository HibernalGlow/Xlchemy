import os
import subprocess
import sys

import pytest

from ui.fluent.filetools import FileView as FluentFileView
from ui.fluent.views import FileView as SeamFileView
from ui.widgets.file_view import FileView as UpstreamFileView

PATHS = ["/media/a/one.png", "/media/a/two.png", "/media/b/three.jxl"]


def _populate(view, paths=PATHS):
    view.addItems([
        (os.path.basename(p), os.path.splitext(p)[1][1:], p, "/media") for p in paths
    ])


@pytest.fixture
def view(app):
    made = FluentFileView()
    _populate(made)
    return made


def test_the_seam_hands_out_the_fluent_subclass():
    assert SeamFileView is FluentFileView
    assert issubclass(FluentFileView, UpstreamFileView)


def test_input_tab_takes_its_file_view_through_the_seam():
    import ui.tabs.input_tab as tab
    assert tab.FileView is FluentFileView


def test_classic_mode_keeps_the_upstream_class():
    code = (
        "import ui.fluent.views as v, ui.widgets.file_view as f;"
        "print(v.FileView is f.FileView)"
    )
    proc = subprocess.run(
        [sys.executable, "-c", code],
        capture_output=True, text=True, env={**os.environ, "XLCHEMY_UI": "classic"},
    )
    assert proc.stdout.strip().endswith("True"), proc.stderr[-400:]


def test_all_paths_lists_rows_in_order(view):
    assert view.allPaths() == PATHS


def test_remove_paths_drops_only_the_matches(view):
    assert view.removePaths(["/media/a/two.png"]) == 1
    assert view.allPaths() == ["/media/a/one.png", "/media/b/three.jxl"]


def test_remove_paths_collapses_redundant_separators(view):
    assert view.removePaths(["/media/a/./two.png"]) == 1
    assert view.allPaths() == ["/media/a/one.png", "/media/b/three.jxl"]


def test_remove_paths_case_follows_the_platform(view):
    """POSIX 大小写敏感；Windows 上 normcase 会把它折成不敏感。"""
    if os.path.normcase("A") == "A":
        assert view.removePaths(["/media/a/ONE.PNG"]) == 0
        assert view.allPaths() == PATHS
    else:
        assert view.removePaths(["/media/a/ONE.PNG"]) == 1


def test_remove_paths_with_nothing_to_remove(view):
    before = view.allPaths()
    assert view.removePaths([]) == 0
    assert view.removePaths(["/nowhere/x.png"]) == 0
    assert view.allPaths() == before


def test_remove_paths_drops_several_at_once(view):
    assert view.removePaths(PATHS) == 3
    assert view.allPaths() == []
    assert view.getItems() == []


def test_menu_targets_uses_clicked_row_when_nothing_is_selected(view):
    clicked = view.invisibleRootItem().child(1)
    assert view._menuTargets(clicked) == [clicked]


def test_menu_targets_uses_the_whole_selection(view):
    clicked = view.invisibleRootItem().child(0)
    clicked.setSelected(True)
    view.invisibleRootItem().child(2).setSelected(True)
    targets = view._menuTargets(clicked)
    assert [t.text(2) for t in targets] == [PATHS[0], PATHS[2]]


def test_reveal_failure_is_reported_not_raised(view, monkeypatch):
    import ui.fluent.filetools as tools
    monkeypatch.setattr(tools, "reveal", lambda path: (False, "no file manager"))
    item = view.invisibleRootItem().child(0)
    view._revealFirst([item])


def test_reveal_success_passes_the_row_path(view, monkeypatch):
    seen = {}
    import ui.fluent.filetools as tools
    monkeypatch.setattr(tools, "reveal", lambda path: (seen.setdefault("path", path), ""))
    view._revealFirst([view.invisibleRootItem().child(0)])
    assert seen["path"] == PATHS[0]


# ------------------------------------------------------------------ 缩略图


@pytest.fixture
def realFiles(app, tmp_path):
    """真写出几张 PNG，缩略图走的是磁盘解码。"""
    from PIL import Image

    paths = []
    for n in range(3):
        path = tmp_path / f"pic{n}.png"
        Image.new("RGB", (300, 200), (n * 40, 120, 90)).save(path)
        paths.append(str(path))
    return paths


def _drain(view, app):
    from PySide6.QtWidgets import QApplication

    assert view._thumbPool.waitForDone(5000)
    QApplication.processEvents()


def _hasIcon(view):
    return [not view.invisibleRootItem().child(i).icon(0).isNull() for i in range(view.invisibleRootItem().childCount())]


def test_thumbnails_off_by_default(app):
    made = FluentFileView()
    assert made.thumbnailsEnabled() is False


def test_enabling_fills_the_first_column_icon(app, realFiles):
    made = FluentFileView()
    made.addItems([(os.path.basename(p), "png", p, "/x") for p in realFiles])
    made.setThumbnailsEnabled(True)
    _drain(made, app)

    assert made.thumbnailsEnabled() is True
    assert _hasIcon(made) == [True, True, True]
    # 关键：没有加列，上游的三列假设不变。
    assert made.columnCount() == 3
    assert made.allPaths() == realFiles


def test_enabling_before_adding_also_thumbs(app, realFiles):
    made = FluentFileView()
    made.setThumbnailsEnabled(True)
    made.addItems([(os.path.basename(p), "png", p, "/x") for p in realFiles])
    _drain(made, app)
    assert _hasIcon(made) == [True, True, True]


def test_disabling_clears_the_icons(app, realFiles):
    made = FluentFileView()
    made.addItems([(os.path.basename(p), "png", p, "/x") for p in realFiles])
    made.setThumbnailsEnabled(True)
    _drain(made, app)
    made.setThumbnailsEnabled(False)
    assert _hasIcon(made) == [False, False, False]


def test_stale_generation_results_are_dropped(app, realFiles):
    from PySide6.QtGui import QImage

    made = FluentFileView()
    made.addItems([(os.path.basename(p), "png", p, "/x") for p in realFiles])
    made.setThumbnailsEnabled(True)
    current = made._thumb_generation
    made.setThumbnailsEnabled(False)

    made._applyThumb(realFiles[0], QImage(8, 8, QImage.Format_ARGB32), current)
    assert _hasIcon(made) == [False, False, False]


def test_undecodable_file_leaves_the_row_intact(app, tmp_path):
    bogus = tmp_path / "broken.png"
    bogus.write_bytes(b"not an image")
    made = FluentFileView()
    made.addItems([("broken.png", "png", str(bogus), "/x")])
    made.setThumbnailsEnabled(True)
    _drain(made, app)

    assert _hasIcon(made) == [False]
    assert made.allPaths() == [str(bogus)]


def test_thumbnail_size_is_clamped(app):
    made = FluentFileView()
    made.setThumbnailSize(1)
    assert made.thumbnailSize() == 16
    made.setThumbnailSize(96)
    assert made.thumbnailSize() == 96
