import pytest

from data.run_records import (
    OUTCOME_CANCELED,
    OUTCOME_FAILED,
    OUTCOME_OK,
    OUTCOME_SKIPPED,
    RunRecords,
)


class FakeClock:
    def __init__(self):
        self.now = 0.0

    def advance(self, delta):
        self.now += delta

    def __call__(self):
        return self.now


@pytest.fixture
def clock():
    return FakeClock()


@pytest.fixture
def records(clock):
    rec = RunRecords(clock=clock)
    rec.begin_run(3)
    return rec


def _finish(records, clock, index, path, skipped=False, src=1000, dst=400, secs=2.0):
    records.note_started(index)
    clock.advance(secs)
    records.note_completed(index, path, skipped, src, dst)


def test_completed_is_ok_with_duration(records, clock):
    _finish(records, clock, 0, "/in/a.png")
    snap = records.snapshot()
    rec = snap.records[0]
    assert rec.outcome == OUTCOME_OK
    assert rec.duration_s == pytest.approx(2.0)
    assert snap.wall_clock_s == pytest.approx(2.0)


def test_exception_before_completion_marks_failed(records, clock):
    records.note_exception("/in/a.png", "C1", "encoder blew up")
    _finish(records, clock, 0, "/in/a.png")
    rec = records.snapshot().records[0]
    assert rec.outcome == OUTCOME_FAILED
    assert rec.error_id == "C1"
    assert rec.error_msg == "encoder blew up"


def test_exception_after_completion_still_marks_failed(records, clock):
    _finish(records, clock, 0, "/in/a.png")
    records.note_exception("/in/a.png", "P2", "output missing")
    assert records.snapshot().records[0].outcome == OUTCOME_FAILED


def test_skip_only_applies_to_its_own_file(records, clock):
    records.note_exception("/in/b.png", "C0", "File not found")
    _finish(records, clock, 0, "/in/a.png", skipped=True)
    _finish(records, clock, 1, "/in/b.png")
    snap = records.snapshot()
    assert [r.outcome for r in snap.records] == [OUTCOME_SKIPPED, OUTCOME_FAILED]


def test_canceled_records_keep_index(records):
    records.note_canceled(2, "/in/c.png")
    snap = records.snapshot()
    assert snap.canceled is True
    assert [r.outcome for r in snap.records] == [OUTCOME_CANCELED]
    assert snap.records[0].index == 2


def test_canceled_does_not_override_a_completed_file(records, clock):
    _finish(records, clock, 2, "/in/c.png")
    records.note_canceled(2, "/in/c.png")
    assert records.snapshot().records[0].outcome == OUTCOME_OK


def test_records_are_ordered_by_index(records, clock):
    _finish(records, clock, 2, "/in/c.png")
    _finish(records, clock, 0, "/in/a.png")
    _finish(records, clock, 1, "/in/b.png")
    assert [r.index for r in records.snapshot().records] == [0, 1, 2]


def test_begin_run_clears_previous_run(records, clock):
    _finish(records, clock, 0, "/in/a.png")
    records.begin_run(1)
    snap = records.snapshot()
    assert snap.records == ()
    assert snap.planned == 1
    assert snap.canceled is False


def test_saved_bytes_only_for_successful_files(records, clock):
    _finish(records, clock, 0, "/in/a.png", skipped=True, src=1000, dst=0)
    _finish(records, clock, 1, "/in/b.png", src=1000, dst=250)
    snap = records.snapshot()
    assert snap.records[0].saved_bytes == 0
    assert snap.records[1].saved_bytes == 750


def test_extension_and_folder_are_derived(records, clock):
    _finish(records, clock, 0, "/media/Pics/A.PNG")
    rec = records.snapshot().records[0]
    assert rec.extension == "png"
    assert rec.folder == "/media/Pics"


def test_completion_without_start_reports_no_duration(records, clock):
    records.note_completed(0, "/in/a.png", False, 100, 50)
    assert records.snapshot().records[0].duration_s == 0.0
