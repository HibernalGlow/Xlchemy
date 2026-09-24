"""FileView.sortByOrder(): one stat per row and no left-behind widget state."""

from unittest.mock import patch

import pytest
from PySide6.QtWidgets import QApplication

import ui.widgets.file_view as file_view_module


@pytest.fixture
def file_view(qtbot):
    app = QApplication.instance() or QApplication([])
    view = file_view_module.FileView()
    qtbot.addWidget(view)
    return view


def addRows(view, paths):
    view.addItems([(path.name, path.suffix[1:], str(path), path.parent) for path in paths])
    return view


@pytest.fixture
def sizedFiles(tmp_path):
    """Three real files with distinct, known sizes."""
    files = []
    for name, size in (("big.png", 300), ("small.png", 100), ("mid.png", 200)):
        path = tmp_path / name
        path.write_bytes(b"0" * size)
        files.append(path)
    return files


def orderInView(view):
    root = view.invisibleRootItem()
    return [root.child(i).text(2) for i in range(root.childCount())]


def test_size_sort_reads_each_file_once(sizedFiles, file_view):
    addRows(file_view, sizedFiles)
    file_view.setSortingEnabled(False)

    with patch("ui.widgets.file_view.os.stat", wraps=file_view_module.os.stat) as mock_stat:
        file_view.sortByOrder("Size Ascending")

    assert mock_stat.call_count == len(sizedFiles)
    assert orderInView(file_view) == [str(p) for p in (sizedFiles[1], sizedFiles[2], sizedFiles[0])]


def test_size_sort_descending_reverses(sizedFiles, file_view):
    addRows(file_view, sizedFiles)
    file_view.setSortingEnabled(False)

    file_view.sortByOrder("Size Descending")

    assert orderInView(file_view) == [str(p) for p in (sizedFiles[0], sizedFiles[2], sizedFiles[1])]


def test_missing_files_sort_as_zero(tmp_path, file_view):
    real = tmp_path / "real.png"
    real.write_bytes(b"0" * 50)
    gone = tmp_path / "gone.png"

    addRows(file_view, [real, gone])
    file_view.setSortingEnabled(False)

    file_view.sortByOrder("Size Ascending")

    assert orderInView(file_view) == [str(gone), str(real)]


@pytest.mark.parametrize("sorting", [True, False])
def test_widget_state_restored(sorting, sizedFiles, file_view):
    addRows(file_view, sizedFiles)
    file_view.setSortingEnabled(sorting)
    file_view.setUpdatesEnabled(False)

    file_view.sortByOrder("Path Ascending")

    assert file_view.isSortingEnabled() == sorting
    assert file_view.updatesEnabled() == False      # it was off before, so it stays off


def test_row_count_survives_a_sort(sizedFiles, file_view):
    addRows(file_view, sizedFiles)
    file_view.setSortingEnabled(False)

    for order in ("Path Ascending", "Path Descending", "Size Ascending", "Random",
                  "Sequential", "Nonsense"):
        file_view.sortByOrder(order)
        assert file_view.invisibleRootItem().childCount() == len(sizedFiles)
