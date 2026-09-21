from unittest.mock import MagicMock

import pytest
from PySide6.QtCore import QThreadPool
from PySide6.QtTest import QSignalSpy

from core.controller import Controller
from data.items import Items
from data.run_records import OUTCOME_CANCELED, OUTCOME_FAILED, OUTCOME_SKIPPED


@pytest.fixture
def controller(tmp_path):
    ctl = Controller(MagicMock(autospec=QThreadPool))
    anchor = tmp_path
    items = Items()
    first = tmp_path / "a.png"
    first.write_bytes(b"\x89PNG\r\n\x1a\n")
    second = tmp_path / "b.png"
    second.write_bytes(b"\x89PNG\r\n\x1a\n")
    items.parseData("Original", (first, anchor), (second, anchor))
    ctl.items = items
    ctl.run_records.begin_run(items.getItemCount())
    return ctl, (str(first), str(second))


def test_completed_records_use_the_queued_item_path(controller):
    ctl, (first, second) = controller
    ctl.workerStarted(0)
    # The completion signal carries an empty path for skipped items, so the
    # recorded path must come from the queue, not the signal.
    ctl.workerCompleted(0, True, "", 0, 0)

    record = ctl.getRunSnapshot().records[0]
    assert record.path == first
    assert record.outcome == OUTCOME_SKIPPED


def test_exception_marks_the_item_failed_and_still_forwards(controller):
    ctl, (first, second) = controller
    spy = QSignalSpy(ctl.exception)

    ctl.workerStarted(1)
    ctl._recordException("C1", "encoder blew up", second)
    ctl.workerCompleted(1, False, second, 1000, 400)

    snap = ctl.getRunSnapshot()
    assert spy.count() == 1
    assert list(spy.at(0)) == ["C1", "encoder blew up", second]
    assert len(snap.records) == 1
    failed = snap.records[0]
    assert failed.index == 1
    assert failed.outcome == OUTCOME_FAILED
    assert failed.path == second
    assert failed.error_msg == "encoder blew up"


def test_canceled_item_is_recorded_and_not_counted_done(controller):
    ctl, (first, second) = controller
    ctl.workerCanceled(0)

    snap = ctl.getRunSnapshot()
    assert snap.canceled is True
    assert snap.records[0].path == first
    assert snap.records[0].outcome == OUTCOME_CANCELED


def test_snapshot_sizes_come_from_the_completion_signal(controller):
    ctl, (first, second) = controller
    ctl.workerStarted(0)
    ctl.workerCompleted(0, False, first, 4096, 1024)

    record = ctl.getRunSnapshot().records[0]
    assert (record.src_size, record.dst_size) == (4096, 1024)
    assert record.saved_bytes == 3072
