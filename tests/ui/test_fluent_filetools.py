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
