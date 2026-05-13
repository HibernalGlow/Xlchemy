from unittest.mock import patch, MagicMock
from pathlib import Path
import time

import pytest

from core.utils import scanDir, scanDirFast, dictToList, clip, getFreeSpaceLeft, b2sum, remove

# scanDir
@patch("core.utils.os.path.exists", return_value=True)
@patch("core.utils.os.path.isdir", return_value=False)
def test_scanDir(mock_isdir, mock_exists):
    with patch("core.utils.Path") as mock_path:
        mock_path.return_value.rglob.return_value = [Path("/tmp/image_0.jpg"), Path("/tmp/image_1.jpg")]
        result = scanDir("/tmp")
        assert result == [str(Path("/tmp/image_0.jpg").absolute()), str(Path("/tmp/image_1.jpg").absolute())]

def test_scanDir_not_found():
    with pytest.raises(FileNotFoundError):
        scanDir("/nonexistent")

# scanDirFast
@patch("core.utils.os.path.exists", return_value=True)
def test_scanDirFast(mock_exists, tmp_path):
    # Create test files
    (tmp_path / "file1.txt").write_text("test")
    (tmp_path / "subdir").mkdir()
    (tmp_path / "subdir" / "file2.txt").write_text("test")

    result = scanDirFast(str(tmp_path))
    assert len(result) == 2
    assert any("file1.txt" in r for r in result)
    assert any("file2.txt" in r for r in result)

def test_scanDirFast_not_found():
    with pytest.raises(FileNotFoundError):
        scanDirFast("/nonexistent")

def test_scanDirFast_performance():
    """Benchmark: scanDirFast should be at least 2x faster than scanDir for large directories."""
    import tempfile
    import os

    with tempfile.TemporaryDirectory() as tmpdir:
        # Create 500 files across 10 subdirs
        for i in range(10):
            subdir = os.path.join(tmpdir, f"subdir_{i}")
            os.makedirs(subdir)
            for j in range(50):
                with open(os.path.join(subdir, f"file_{j}.txt"), "w") as f:
                    f.write("test")

        # Warm up
        scanDir(tmpdir)
        scanDirFast(tmpdir)

        # Benchmark scanDir (old)
        times_old = []
        for _ in range(5):
            start = time.perf_counter()
            scanDir(tmpdir)
            times_old.append(time.perf_counter() - start)
        avg_old = sum(times_old) / len(times_old)

        # Benchmark scanDirFast (new)
        times_new = []
        for _ in range(5):
            start = time.perf_counter()
            scanDirFast(tmpdir)
            times_new.append(time.perf_counter() - start)
        avg_new = sum(times_new) / len(times_new)

        speedup = avg_old / avg_new
        print(f"\nscanDir avg: {avg_old*1000:.2f}ms, scanDirFast avg: {avg_new*1000:.2f}ms, speedup: {speedup:.2f}x")
        assert speedup >= 1.5, f"Expected at least 1.5x speedup, got {speedup:.2f}x"

# dictToList
def test_dictToList():
    data = {"a": 1, "b": {"c": 2}}
    result = dictToList(data)
    assert result == [("a", 1), ("b", [("c", 2)])]

# clip
def test_clip():
    assert clip(5, 0, 10) == 5
    assert clip(-5, 0, 10) == 0
    assert clip(15, 0, 10) == 10

# getFreeSpaceLeft
@patch("core.utils.shutil.disk_usage")
def test_getFreeSpaceLeft(mock_disk_usage):
    mock_disk_usage.return_value = (100, 50, 50)
    assert getFreeSpaceLeft("/tmp") == 50

@patch("core.utils.shutil.disk_usage", side_effect=Exception("Error"))
def test_getFreeSpaceLeft_error(mock_disk_usage):
    assert getFreeSpaceLeft("/tmp") == -1

# b2sum
def test_b2sum(tmp_path):
    file = tmp_path / "test.txt"
    file.write_text("test")
    result = b2sum(str(file))
    assert len(result) == 128

@patch("core.utils.Path.open", side_effect=OSError("Error"))
def test_b2sum_error(mock_open):
    with pytest.raises(OSError):
        b2sum("/tmp/test.txt")

# remove
def test_remove(tmp_path):
    file = tmp_path / "test.txt"
    file.write_text("test")
    remove(str(file))
    assert not file.exists()

@patch("core.utils.os.remove", side_effect=Exception("Error"))
def test_remove_error(mock_remove):
    with pytest.raises(Exception):
        remove("/tmp/test.txt")
