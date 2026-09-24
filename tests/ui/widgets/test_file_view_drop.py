"""Dropping a folder runs the real scan - no mocked scanDirFast.

The drop handler used to build a Path for every file in the tree; the slicing
rewrite that replaced it is only correct if the extension rules still match what
the scan hands back, and a patched-out scan would never show that.
"""

import pytest
from PySide6.QtCore import QMimeData, Qt, QUrl
from PySide6.QtWidgets import QApplication

import ui.widgets.file_view as file_view_module


@pytest.fixture
def file_view(qtbot):
    QApplication.instance() or QApplication([])
    view = file_view_module.FileView()
    qtbot.addWidget(view)
    view.disableSorting(True)     # the row order under test is the scan order
    return view


def drop(view, *paths):
    mime = QMimeData()
    mime.setUrls([QUrl.fromLocalFile(str(p)) for p in paths])

    class Event:
        def accept(self):
            pass

        def ignore(self):
            raise AssertionError("a local folder was offered and refused")

        def mimeData(self):
            return mime

    view.dropEvent(Event())


@pytest.fixture
def tree(tmp_path):
    (tmp_path / "a.png").write_bytes(b"1")
    (tmp_path / "b.JPG").write_bytes(b"2")
    (tmp_path / "notes.txt").write_text("not an image")
    (tmp_path / ".hidden").write_bytes(b"3")
    (tmp_path / "noext").write_bytes(b"4")
    (tmp_path / "trailing.").write_bytes(b"5")
    sub = tmp_path / "sub"
    sub.mkdir()
    (sub / "c.webp").write_bytes(b"6")
    return tmp_path


def rows(view):
    root = view.invisibleRootItem()
    return {
        (root.child(i).text(0), root.child(i).text(1), root.child(i).text(2))
        for i in range(root.childCount())
    }


def test_folder_drop_takes_only_decodable_images(file_view, tree):
    drop(file_view, tree)

    assert rows(file_view) == {
        ("a", "png", str(tree / "a.png")),
        ("b", "JPG", str(tree / "b.JPG")),
        ("c", "webp", str(tree / "sub" / "c.webp")),
    }


def test_anchor_of_a_single_dropped_folder_is_the_folder_itself(file_view, tree):
    drop(file_view, tree)

    root = file_view.invisibleRootItem()
    anchors = {root.child(i).data(0, Qt.UserRole) for i in range(root.childCount())}
    assert anchors == {tree}


def test_dropping_two_folders_anchors_each_row_to_its_own_parent(file_view, tmp_path):
    first = tmp_path / "x" / "first"
    second = tmp_path / "y" / "second"
    for folder in (first, second):
        folder.mkdir(parents=True)
    (first / "a.png").write_bytes(b"1")
    (second / "b.png").write_bytes(b"2")

    drop(file_view, first, second)

    root = file_view.invisibleRootItem()
    assert root.childCount() == 2
    anchors = {root.child(i).data(0, Qt.UserRole) for i in range(root.childCount())}
    assert anchors == {first.parent, second.parent}


def test_user_format_filter_still_applied_on_drop(file_view, tree):
    file_view.setFormatFilter(lambda ext: ext != "webp")

    drop(file_view, tree)

    assert {row[0] for row in rows(file_view)} == {"a", "b"}


def test_single_file_drop_is_unchanged(file_view, tree):
    drop(file_view, tree / "a.png")

    assert rows(file_view) == {("a", "png", str(tree / "a.png"))}
