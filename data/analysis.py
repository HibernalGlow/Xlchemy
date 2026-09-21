"""Statistics over a conversion run. Pure functions, no Qt, no I/O beyond stat().

InputSnapshot describes what was queued; OutputSnapshot describes what came back.
Both expose as_rows() so any front end can render them without re-deriving numbers.
"""

import os
import statistics
from dataclasses import dataclass

from data.run_records import (
    OUTCOME_CANCELED,
    OUTCOME_FAILED,
    OUTCOME_OK,
    OUTCOME_SKIPPED,
    RunSnapshot,
)

TOP_FOLDER_LIMIT = 6


@dataclass(frozen=True)
class Group:
    key: str
    count: int
    total_bytes: int


@dataclass(frozen=True)
class FormatDelta:
    extension: str
    count: int
    src_bytes: int
    dst_bytes: int

    @property
    def saved_bytes(self) -> int:
        return self.src_bytes - self.dst_bytes

    @property
    def saved_pct(self) -> float:
        return saved_pct(self.src_bytes, self.dst_bytes)


@dataclass(frozen=True)
class InputSnapshot:
    count: int
    total_bytes: int
    min_bytes: int
    median_bytes: float
    max_bytes: int
    by_format: tuple
    top_folders: tuple

    @property
    def avg_bytes(self) -> float:
        return self.total_bytes / self.count if self.count else 0.0

    def as_rows(self):
        yield ("Files", str(self.count))
        yield ("Total", format_bytes(self.total_bytes))
        yield ("Average", format_bytes(self.avg_bytes))
        yield ("Smallest", format_bytes(self.min_bytes))
        yield ("Median", format_bytes(self.median_bytes))
        yield ("Largest", format_bytes(self.max_bytes))
        yield ("Formats", ", ".join(f"{g.key} x{g.count}" for g in self.by_format) or "-")
        yield ("Top folders", "; ".join(f"{os.path.basename(g.key) or g.key} x{g.count}" for g in self.top_folders) or "-")


@dataclass(frozen=True)
class OutputSnapshot:
    planned: int
    converted: int
    skipped: int
    failed: int
    canceled: int
    src_bytes: int
    dst_bytes: int
    wall_clock_s: float
    busy_s: float
    by_format: tuple

    @property
    def reported(self) -> int:
        return self.converted + self.skipped + self.failed

    @property
    def success_rate(self) -> float:
        return (self.converted / self.reported * 100.0) if self.reported else 0.0

    @property
    def saved_bytes(self) -> int:
        return self.src_bytes - self.dst_bytes

    @property
    def saved_pct(self) -> float:
        return saved_pct(self.src_bytes, self.dst_bytes)

    @property
    def files_per_sec(self) -> float:
        return (self.converted / self.wall_clock_s) if self.wall_clock_s > 0 else 0.0

    @property
    def avg_file_s(self) -> float:
        return (self.busy_s / self.converted) if self.converted else 0.0

    def as_rows(self):
        yield ("Converted", str(self.converted))
        yield ("Skipped", str(self.skipped))
        yield ("Failed", str(self.failed))
        yield ("Canceled", str(self.canceled))
        yield ("Success rate", f"{self.success_rate:.1f}%")
        yield ("Before", format_bytes(self.src_bytes))
        yield ("After", format_bytes(self.dst_bytes))
        yield ("Saved", f"{format_bytes(self.saved_bytes)} ({self.saved_pct:+.1f}%)")
        yield ("Throughput", f"{self.files_per_sec:.2f} files/s")
        yield ("Average time", f"{self.avg_file_s:.2f} s/file")
        yield ("Wall clock", f"{self.wall_clock_s:.2f} s")
        yield (
            "Per format",
            ", ".join(f"{f.extension} {f.saved_pct:+.0f}% x{f.count}" for f in self.by_format) or "-",
        )


def saved_pct(src: int, dst: int) -> float:
    if src <= 0:
        return 0.0
    return (src - dst) / src * 100.0


def format_bytes(value) -> str:
    size = float(value)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if abs(size) < 1024.0 or unit == "TB":
            return f"{size:.0f} {unit}" if unit == "B" else f"{size:.2f} {unit}"
        size /= 1024.0
    return f"{size:.2f} TB"


def _group(pairs) -> tuple:
    """Aggregate (key, bytes) pairs, most frequent first."""
    buckets = {}
    for key, size in pairs:
        hit = buckets.setdefault(key, [0, 0])
        hit[0] += 1
        hit[1] += size
    return tuple(
        Group(key=key, count=count, total_bytes=total)
        for key, (count, total) in sorted(buckets.items(), key=lambda kv: (-kv[1][0], kv[0]))
    )


def build_input_snapshot(paths, size_of=os.path.getsize) -> InputSnapshot:
    """Sizes what is about to be converted. Unreadable files count as 0 bytes."""
    sizes = []
    for path in paths:
        try:
            sizes.append(int(size_of(path)))
        except OSError:
            sizes.append(0)

    pairs = list(zip(paths, sizes))
    sized = [s for s in sizes if s > 0]

    return InputSnapshot(
        count=len(pairs),
        total_bytes=sum(sizes),
        min_bytes=min(sized) if sized else 0,
        median_bytes=statistics.median(sized) if sized else 0.0,
        max_bytes=max(sized) if sized else 0,
        by_format=_group([
            (os.path.splitext(p)[1].lstrip(".").lower() or "none", s) for p, s in pairs
        ]),
        top_folders=_group([(os.path.dirname(p), s) for p, s in pairs])[:TOP_FOLDER_LIMIT],
    )


def build_output_snapshot(snapshot: RunSnapshot) -> OutputSnapshot:
    records = snapshot.records
    converted = [r for r in records if r.outcome == OUTCOME_OK]
    src_total = sum(r.src_size for r in converted)
    dst_total = sum(r.dst_size for r in converted)

    buckets = {}
    for r in converted:
        hit = buckets.setdefault(r.extension, [0, 0, 0])
        hit[0] += 1
        hit[1] += r.src_size
        hit[2] += r.dst_size
    by_format = tuple(
        FormatDelta(extension=k, count=v[0], src_bytes=v[1], dst_bytes=v[2])
        for k, v in sorted(buckets.items(), key=lambda kv: (-kv[1][0], kv[0]))
    )

    return OutputSnapshot(
        planned=snapshot.planned,
        converted=len(converted),
        skipped=len(snapshot.with_outcome(OUTCOME_SKIPPED)),
        failed=len(snapshot.with_outcome(OUTCOME_FAILED)),
        canceled=len(snapshot.with_outcome(OUTCOME_CANCELED)),
        src_bytes=src_total,
        dst_bytes=dst_total,
        wall_clock_s=snapshot.wall_clock_s,
        busy_s=sum(r.duration_s for r in records),
        by_format=by_format,
    )
