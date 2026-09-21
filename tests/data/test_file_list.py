import pytest

from data.file_list import (
    SELECT_ALL,
    SELECT_NONE,
    SELECT_PARTIAL,
    canceled_paths,
    reported_paths,
    selection_state,
)
from data.run_records import (
    OUTCOME_CANCELED,
    OUTCOME_FAILED,
    OUTCOME_OK,
    OUTCOME_SKIPPED,
    FileRecord,
    RunSnapshot,
)


def _snap(*records):
    return RunSnapshot(
        planned=len(records), started_at=0.0, finished_at=1.0, canceled=False, records=records
    )


def _rec(path, outcome):
    return FileRecord(index=0, path=path, outcome=outcome)


def test_reported_paths_keeps_every_verdict_but_not_canceled():
    snap = _snap(
        _rec("/a/1.png", OUTCOME_OK),
        _rec("/a/2.png", OUTCOME_SKIPPED),
        _rec("/a/3.png", OUTCOME_FAILED),
        _rec("/a/4.png", OUTCOME_CANCELED),
    )
    assert reported_paths(snap) == ["/a/1.png", "/a/2.png", "/a/3.png"]
    assert canceled_paths(snap) == ["/a/4.png"]


def test_reported_paths_dedupes_and_preserves_order():
    snap = _snap(
        _rec("/a/2.png", OUTCOME_OK),
        _rec("/a/1.png", OUTCOME_OK),
        _rec("/a/2.png", OUTCOME_FAILED),
    )
    assert reported_paths(snap) == ["/a/2.png", "/a/1.png"]


def test_reported_paths_skips_blank_paths():
    assert reported_paths(_snap(_rec("", OUTCOME_OK))) == []


def test_reported_paths_accepts_an_explicit_outcome_set():
    snap = _snap(_rec("/a/1.png", OUTCOME_OK), _rec("/a/2.png", OUTCOME_FAILED))
    assert reported_paths(snap, outcomes=(OUTCOME_FAILED,)) == ["/a/2.png"]


@pytest.mark.parametrize("selected,total,expected", [
    (0, 0, SELECT_NONE),
    (0, 5, SELECT_NONE),
    (-1, 5, SELECT_NONE),
    (1, 5, SELECT_PARTIAL),
    (4, 5, SELECT_PARTIAL),
    (5, 5, SELECT_ALL),
    (7, 5, SELECT_ALL),
])
def test_selection_state(selected, total, expected):
    assert selection_state(selected, total) == expected
