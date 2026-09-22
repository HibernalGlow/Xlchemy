import os

import pytest
from PySide6.QtWidgets import QLabel, QWidget

from data.run_records import RunRecords
from ui.fluent.filetools import FileView
from ui.fluent.runstats import collectStats, completedPaths, removeCompleted

PATHS = ["/media/a/one.png", "/media/a/two.png", "/media/b/three.jxl", "/media/b/three.avif"]


class FakeController:
    """只暴露 runstats 真正用到的那一个方法。"""

    def __init__(self, records):
        self._records = records

    def getRunSnapshot(self):
        return self._records.snapshot()


class FakeInputTab:
    def __init__(self, view):
        self.file_view = view


class FakeWindow(QWidget):
    """MessageBoxBase 要一个真 QWidget 当 parent。"""

    def __init__(self, controller=None, view=None):
        super().__init__()
        self.controller = controller
        self.input_tab = FakeInputTab(view) if view is not None else None


@pytest.fixture
def view(app):
    made = FileView()
    made.addItems([
        (os.path.basename(p), os.path.splitext(p)[1][1:], p, "/media") for p in PATHS
    ])
    return made


@pytest.fixture
def records():
    """one=converted, two=skipped, three=failed, four=canceled."""
    state = {"t": 0.0}

    def clock():
        state["t"] += 1.0
        return state["t"]

    made = RunRecords(clock=clock)
    made.begin_run(4)
    made.note_started(0)
    made.note_completed(0, PATHS[0], False, 4096, 1024)
    made.note_started(1)
    made.note_completed(1, PATHS[1], True, 2048, 0)
    made.note_exception(PATHS[2], "C1", "encoder blew up")
    made.note_started(2)
    made.note_completed(2, PATHS[2], False, 512, 0)
    made.note_started(3)
    made.note_canceled(3, PATHS[3])
    made.note_run_finished()
    return made


def _window(records=None, view=None):
    controller = FakeController(records) if records is not None else None
    return FakeWindow(controller=controller, view=view)


@pytest.fixture(autouse=True)
def _need_qapp(app):
    """本文件的 _window() 会造 QWidget，没有 QApplication 直接段错误。"""
    return app


def test_completed_paths_exclude_the_canceled_row(records):
    assert completedPaths(_window(records)) == PATHS[:3]


def test_remove_completed_drops_reported_rows_only(records, view):
    assert removeCompleted(_window(records, view)) == 3
    assert view.allPaths() == [PATHS[3]]


def test_remove_completed_without_a_run_is_a_noop(view):
    assert removeCompleted(_window(None, view)) == 0
    assert view.allPaths() == PATHS


def test_remove_completed_before_anything_reported_is_a_noop(view):
    empty = RunRecords()
    empty.begin_run(3)
    assert removeCompleted(_window(empty, view)) == 0
    assert view.allPaths() == PATHS


def test_remove_completed_survives_a_missing_input_tab(records):
    assert removeCompleted(_window(records, None)) == 0


def test_collect_stats_reports_both_snapshots(records):
    inputs, outputs = collectStats(_window(records))
    assert inputs.count == 4
    assert (outputs.converted, outputs.skipped, outputs.failed, outputs.canceled) == (1, 1, 1, 1)
    # 只有真正转换成功的那张参与前后体积对比。
    assert (outputs.src_bytes, outputs.dst_bytes) == (4096, 1024)
    assert outputs.saved_pct == pytest.approx(75.0)


def test_collect_stats_is_empty_before_the_first_run():
    assert collectStats(_window(RunRecords())) == (None, None)


def test_collect_stats_tolerates_no_controller():
    assert collectStats(_window(None)) == (None, None)


def test_dialog_renders_the_rows(records):
    from ui.fluent.runstats import RunStatsDialog

    window = _window(records)  # parent 必须活着，否则 Qt 把 dialog 一起析构
    dialog = RunStatsDialog(window)
    texts = [child.text() for child in dialog.findChildren(QLabel)]
    assert any("Converted" in t for t in texts)
    assert any("1.00 KB" in t for t in texts)
    assert any("75.0%" in t for t in texts)


def test_dialog_says_so_when_nothing_ran_yet():
    from ui.fluent.runstats import RunStatsDialog

    window = _window(RunRecords())
    dialog = RunStatsDialog(window)
    texts = [child.text() for child in dialog.findChildren(QLabel)]
    assert any("No conversion has run yet." in t for t in texts)


def test_title_bar_buttons_are_installed(app, tmp_path):
    """壳装配期不该依赖 controller / input_tab 已经存在。"""
    from ui.fluent.runstats import RemoveCompletedButton, RunStatsButton

    window = FakeWindow()
    stats = RunStatsButton(window)
    prune = RemoveCompletedButton(window)
    assert stats.toolTip() == "Run Statistics"
    assert prune.toolTip() == "Remove Completed From List"
    # 没有 controller 时点一下也不该炸。
    prune._prune()
