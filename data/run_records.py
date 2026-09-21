"""Per-file outcomes of a single conversion run.

Deliberately free of Qt: the controller feeds it from its signal handlers and
any front end (PySide6 today, FluentUI later) only reads the snapshot.
"""

import os
import threading
import time
from dataclasses import dataclass, field, replace

OUTCOME_OK = "ok"
OUTCOME_SKIPPED = "skipped"
OUTCOME_FAILED = "failed"
OUTCOME_CANCELED = "canceled"


def _basename_key(path: str) -> str:
    """Normalize a path so exceptions and completions match up across platforms."""
    return os.path.normcase(os.path.normpath(path))


@dataclass(frozen=True)
class FileRecord:
    index: int
    path: str
    outcome: str
    src_size: int = 0
    dst_size: int = 0
    duration_s: float = 0.0
    error_id: str = ""
    error_msg: str = ""

    @property
    def extension(self) -> str:
        return os.path.splitext(self.path)[1].lstrip(".").lower()

    @property
    def folder(self) -> str:
        return os.path.dirname(self.path)

    @property
    def saved_bytes(self) -> int:
        if self.outcome != OUTCOME_OK:
            return 0
        return self.src_size - self.dst_size


@dataclass(frozen=True)
class RunSnapshot:
    planned: int
    started_at: float
    finished_at: float
    canceled: bool
    records: tuple = field(default_factory=tuple)

    @property
    def wall_clock_s(self) -> float:
        return max(0.0, self.finished_at - self.started_at)

    def with_outcome(self, outcome: str) -> tuple:
        return tuple(r for r in self.records if r.outcome == outcome)


class RunRecords:
    """Collects one run. Reused across runs via begin_run(), which clears state."""

    def __init__(self, clock=time.perf_counter):
        self._clock = clock
        self._lock = threading.Lock()
        self._starts = {}
        self._errors = {}
        self._records = {}
        self._canceled = set()
        self._planned = 0
        self._started_at = 0.0
        self._finished_at = 0.0

    def begin_run(self, planned: int) -> None:
        with self._lock:
            self._starts.clear()
            self._errors.clear()
            self._records.clear()
            self._canceled.clear()
            self._planned = planned
            self._started_at = self._clock()
            self._finished_at = self._started_at

    def note_started(self, index: int) -> None:
        with self._lock:
            self._starts[index] = self._clock()

    def note_exception(self, path: str, error_id: str, error_msg: str) -> None:
        if not path:
            return
        with self._lock:
            self._errors[_basename_key(path)] = (error_id, error_msg)
            # The exception and completion signals travel through a queued connection,
            # so a failure may be reported after its own record was written.
            for index, record in self._records.items():
                if _basename_key(record.path) == _basename_key(path):
                    self._records[index] = replace(
                        record, outcome=OUTCOME_FAILED, error_id=error_id, error_msg=error_msg
                    )
            self._finished_at = self._clock()

    def note_completed(self, index: int, path: str, skipped: bool, src_size: int, dst_size: int) -> None:
        with self._lock:
            error = self._errors.get(_basename_key(path)) if path else None
            if error is not None:
                outcome, error_id, error_msg = OUTCOME_FAILED, error[0], error[1]
            elif skipped:
                outcome, error_id, error_msg = OUTCOME_SKIPPED, "", ""
            else:
                outcome, error_id, error_msg = OUTCOME_OK, "", ""

            started = self._starts.pop(index, None)
            now = self._clock()
            self._records[index] = FileRecord(
                index=index,
                path=path,
                outcome=outcome,
                src_size=src_size,
                dst_size=dst_size,
                duration_s=max(0.0, now - started) if started is not None else 0.0,
                error_id=error_id,
                error_msg=error_msg,
            )
            self._finished_at = now

    def note_canceled(self, index: int, path: str = "") -> None:
        with self._lock:
            self._canceled.add(index)
            if index not in self._records:
                self._records[index] = FileRecord(index=index, path=path, outcome=OUTCOME_CANCELED)
            self._finished_at = self._clock()

    def note_run_finished(self) -> None:
        with self._lock:
            self._finished_at = self._clock()

    def snapshot(self) -> RunSnapshot:
        with self._lock:
            return RunSnapshot(
                planned=self._planned,
                started_at=self._started_at,
                finished_at=self._finished_at,
                canceled=bool(self._canceled),
                records=tuple(self._records[key] for key in sorted(self._records)),
            )
