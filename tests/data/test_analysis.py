import pytest

from data.analysis import (
    TOP_FOLDER_LIMIT,
    build_input_snapshot,
    build_output_snapshot,
    format_bytes,
    saved_pct,
)
from data.run_records import OUTCOME_OK, OUTCOME_SKIPPED, FileRecord, RunSnapshot


def _snap(records, planned=None, wall=10.0):
    return RunSnapshot(
        planned=planned if planned is not None else len(records),
        started_at=0.0,
        finished_at=wall,
        canceled=False,
        records=tuple(records),
    )


def _rec(path, outcome=OUTCOME_OK, src=1000, dst=250, duration=1.0):
    return FileRecord(index=0, path=path, outcome=outcome, src_size=src, dst_size=dst, duration_s=duration)


# format_bytes / saved_pct

@pytest.mark.parametrize("value,expected", [
    (0, "0 B"),
    (999, "999 B"),
    (1024, "1.00 KB"),
    (1536, "1.50 KB"),
    (1024 * 1024, "1.00 MB"),
    (3 * 1024 ** 3, "3.00 GB"),
])
def test_format_bytes(value, expected):
    assert format_bytes(value) == expected


def test_saved_pct_grows_for_bigger_output():
    assert saved_pct(1000, 250) == pytest.approx(75.0)
    assert saved_pct(1000, 1250) == pytest.approx(-25.0)
    assert saved_pct(0, 10) == 0.0


# input snapshot

def test_input_snapshot_counts_and_sizes():
    sizes = {"/a/x.png": 100, "/a/y.png": 300, "/b/z.jxl": 500}
    snap = build_input_snapshot(list(sizes), size_of=lambda p: sizes[p])
    assert snap.count == 3
    assert snap.total_bytes == 900
    assert snap.avg_bytes == pytest.approx(300.0)
    assert (snap.min_bytes, snap.max_bytes) == (100, 500)
    assert snap.median_bytes == pytest.approx(300.0)


def test_input_snapshot_ignores_unreadable_files_in_distribution():
    sizes = {"/a/x.png": 100, "/a/gone.png": OSError()}

    def size_of(path):
        value = sizes[path]
        if isinstance(value, OSError):
            raise value
        return value

    snap = build_input_snapshot(list(sizes), size_of=size_of)
    assert snap.count == 2
    assert snap.total_bytes == 100
    assert snap.min_bytes == 100 and snap.max_bytes == 100
    assert snap.median_bytes == pytest.approx(100.0)


def test_input_snapshot_groups_formats_by_count_then_name():
    sizes = {"/a/1.png": 10, "/a/2.png": 10, "/b/3.jxl": 10, "/b/4": 10}
    snap = build_input_snapshot(list(sizes), size_of=lambda p: sizes[p])
    assert [g.key for g in snap.by_format] == ["png", "jxl", "none"]
    assert [g.count for g in snap.by_format] == [2, 1, 1]


def test_input_snapshot_limits_top_folders():
    paths = [f"/root/f{i}/a.png" for i in range(TOP_FOLDER_LIMIT + 3)]
    snap = build_input_snapshot(paths, size_of=lambda p: 10)
    assert len(snap.top_folders) == TOP_FOLDER_LIMIT


def test_input_snapshot_is_case_insensitive_on_extension():
    snap = build_input_snapshot(["/a/PHOTO.PNG"], size_of=lambda p: 10)
    assert snap.by_format[0].key == "png"


# output snapshot

def test_output_snapshot_counts_only_converted_bytes():
    snap = build_output_snapshot(_snap([
        _rec("/a/1.png", src=1000, dst=250),
        _rec("/a/2.png", outcome=OUTCOME_SKIPPED, src=9999, dst=0),
    ]))
    assert (snap.converted, snap.skipped) == (1, 1)
    assert snap.src_bytes == 1000 and snap.dst_bytes == 250
    assert snap.saved_bytes == 750
    assert snap.saved_pct == pytest.approx(75.0)


def test_output_snapshot_success_rate_uses_reported_only():
    snap = build_output_snapshot(_snap([
        _rec("/a/1.png"),
        _rec("/a/2.png", outcome=OUTCOME_SKIPPED),
    ], planned=10))
    assert snap.reported == 2
    assert snap.success_rate == pytest.approx(50.0)


def test_output_snapshot_throughput_and_average():
    snap = build_output_snapshot(_snap(
        [_rec("/a/1.png", duration=2.0), _rec("/a/2.png", duration=4.0)],
        wall=10.0,
    ))
    assert snap.files_per_sec == pytest.approx(0.2)
    assert snap.avg_file_s == pytest.approx(3.0)
    assert snap.wall_clock_s == pytest.approx(10.0)


def test_output_snapshot_per_format_deltas():
    snap = build_output_snapshot(_snap([
        _rec("/a/1.png", src=1000, dst=500),
        _rec("/a/2.png", src=1000, dst=100),
        _rec("/a/3.jxl", src=100, dst=200),
    ]))
    by_ext = {f.extension: f for f in snap.by_format}
    assert by_ext["png"].count == 2
    assert by_ext["png"].saved_pct == pytest.approx(70.0)
    assert by_ext["jxl"].saved_pct == pytest.approx(-100.0)


def test_output_snapshot_on_empty_run_is_all_zero():
    snap = build_output_snapshot(_snap([]))
    assert snap.converted == 0
    assert snap.success_rate == 0.0
    assert snap.files_per_sec == 0.0
    assert snap.avg_file_s == 0.0
    assert snap.saved_pct == 0.0


# view-agnostic rendering helpers

def test_input_snapshot_rows_are_label_value_pairs():
    inp = build_input_snapshot(["/a/1.png"], size_of=lambda p: 100)
    rows = dict(inp.as_rows())
    assert rows["Files"] == "1"
    assert rows["Total"] == "100 B"


def test_output_snapshot_rows_are_label_value_pairs():
    out = build_output_snapshot(_snap([_rec("/a/1.png")]))
    rows = dict(out.as_rows())
    assert rows["Converted"] == "1"
    assert rows["Success rate"] == "100.0%"
    assert rows["Saved"].startswith("750 B")
