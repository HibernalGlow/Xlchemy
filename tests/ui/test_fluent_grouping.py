import os

import pytest
from PySide6.QtCore import Qt

from ui.fluent.filetools import FileView
from ui.fluent.grouping import isFolderItem

PATHS = [
    "/media/alpha/one.png",
    "/media/beta/two.png",
    "/media/alpha/three.jxl",
    "/media/beta/four.avif",
    "/media/gamma/five.png",
]


@pytest.fixture
def view(app):
    made = FileView()
    made.addItems([
        (os.path.basename(p), os.path.splitext(p)[1][1:], p, "/media") for p in PATHS
    ])
    return made


def _rows(view):
    root = view.invisibleRootItem()
    return [root.child(i) for i in range(root.childCount())]


def _headers(view):
    return [item for item in _rows(view) if isFolderItem(item)]


def _files(view):
    return [item for item in _rows(view) if not isFolderItem(item)]


def test_flat_mode_has_no_headers_and_all_rows_are_files(view):
    assert view.grouped() is False
    assert _headers(view) == []
    assert [i.text(2) for i in _rows(view)] == PATHS


def test_grouping_inserts_one_header_per_folder_in_order(view):
    view.setGrouped(True)
    assert [h.text(0) for h in _headers(view)] == ["/media/alpha", "/media/beta", "/media/gamma"]
    assert len(_files(view)) == len(PATHS)


def test_get_items_is_identical_in_both_modes(view):
    """最关键的一条：分组绝不能改变喂给转换队列的内容与顺序。"""
    flat = view.getItems()
    view.setGrouped(True)
    assert view.getItems() == flat
    view.setGrouped(False)
    assert view.getItems() == flat


def test_grouped_view_reorders_rows_but_not_the_queue(view):
    """契约：视觉按目录聚块，但喂给转换的顺序保持切换前那样。"""
    flat = view.getItems()
    view.setGrouped(True)

    assert [i.text(2) for i in _files(view)] != [p for p, _ in flat]  # 行确实重排了
    assert view.getItems() == flat                                    # 队列没变


def test_headers_are_not_selectable(view):
    view.setGrouped(True)
    for header in _headers(view):
        flags = header.flags()
        assert not flags & Qt.ItemIsSelectable
        assert flags & Qt.ItemIsEnabled


def test_file_rows_stay_top_level_children(view):
    """上游八处导航逻辑的前提：文件行必须是根的直接子项。"""
    view.setGrouped(True)
    root = view.invisibleRootItem()
    for item in _files(view):
        assert item.parent() is None
        assert root.indexOfChild(item) >= 0


def test_grouping_groups_files_under_their_header(view):
    view.setGrouped(True)
    order = [("H" if isFolderItem(i) else "F") for i in _rows(view)]
    assert order == ["H", "F", "F", "H", "F", "F", "H", "F"]


def test_adding_while_grouped_routes_and_relabels(view):
    view.setGrouped(True)
    extra = "/media/delta/six.png"
    view.addItems([("six.png", "png", extra, "/media")])
    assert [h.text(0) for h in _headers(view)][-1] == "/media/delta"
    assert extra in [p for p, _ in view.getItems()]


def test_removing_while_grouped_drops_an_emptied_folder(view):
    view.setGrouped(True)
    assert view.removePaths(["/media/gamma/five.png"]) == 1
    assert "/media/gamma" not in [h.text(0) for h in _headers(view)]
    assert len(view.getItems()) == 4


def test_sorting_while_grouped_keeps_headers_attached(view):
    view.setGrouped(True)
    view.sortByOrder("Path Descending")
    files = [i.text(2) for i in _files(view)]
    assert files == sorted(PATHS, reverse=True)
    # 每个标题后面紧跟的都必须是自己目录里的文件。
    root = view.invisibleRootItem()
    current = None
    for i in range(root.childCount()):
        item = root.child(i)
        if isFolderItem(item):
            current = item.text(0)
        else:
            assert os.path.dirname(item.text(2)) == current


def test_duplicate_removal_spares_the_headers(view):
    view.setGrouped(True)
    before = len(_headers(view))
    view.addItems([("one.png", "png", PATHS[0], "/media")])
    view.removeDuplicates()
    assert len(_headers(view)) == before
    assert len(view.getItems()) == len(PATHS)


def test_toggling_back_and_forth_preserves_content(view):
    original = view.getItems()
    for _ in range(3):
        view.setGrouped(True)
        view.setGrouped(False)
    assert view.getItems() == original
    assert len(_rows(view)) == len(PATHS)


def test_rows_added_while_grouped_append_after_the_restored_order(view):
    """分组期间新加的行，退回列表时要排在原有行之后，不能插到中间。"""
    original = view.getItems()
    extra = "/media/delta/six.png"
    view.setGrouped(True)
    view.addItems([("six.png", "png", extra, "/media")])
    view.setGrouped(False)

    assert view.getItems() == original + [(extra, "/media")]
