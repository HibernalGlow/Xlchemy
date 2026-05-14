import pytest
import logging
import os
import tempfile
from unittest.mock import patch, MagicMock
from contextlib import ExitStack

from PySide6.QtCore import QThreadPool
from PySide6.QtTest import QSignalSpy

from core.controller import Controller


@pytest.fixture
def controller():
    yield Controller(MagicMock(autospec=QThreadPool()))


@pytest.fixture
def workerCompleted_patched(controller):
    signal_spies = {
        "update_progress_line1": QSignalSpy(controller.update_progress_line1),
        "update_progress_value": QSignalSpy(controller.update_progress_value),
    }

    patches = {
        "items_addCompletedItem": patch.object(controller.items, "addCompletedItem"),
        "time_left_addCompletedItem": patch.object(controller.time_left, "addCompletedItem"),
        "time_left_addSkippedItem": patch.object(controller.time_left, "addSkippedItem"),
        "items_getCompletedItemCount": patch.object(controller.items, "getCompletedItemCount", return_value=5),
        "items_getItemCount": patch.object(controller.items, "getItemCount", return_value=10),
        "task_status_wasCanceled": patch("core.controller.task_status.wasCanceled", return_value=False),
        "finishProcessing": patch.object(controller, "finishProcessing"),
        "activeThreadCount": patch.object(controller.threadpool, "activeThreadCount", return_value=1),
    }

    with ExitStack() as stack:
        mocks = {name: stack.enter_context(patcher) for name, patcher in patches.items()}
        yield controller, mocks, signal_spies


def test_workerCompleted_logs_file_path_and_size(workerCompleted_patched, caplog):
    controller, mocks, signal_spies = workerCompleted_patched

    with caplog.at_level(logging.INFO):
        controller.workerCompleted(0, False, r"E:\test\image.jpg", 1024 * 512, 1024 * 128)

    line1 = signal_spies["update_progress_line1"].at(0)[0]
    assert "Converted 5 out of 10 images" in line1

    log_text = caplog.text
    assert "E:\\test\\image.jpg" in log_text
    assert "512.0 KB" in log_text
    assert "128.0 KB" in log_text
    assert "-75%" in log_text


def test_workerCompleted_logs_file_path_mb(workerCompleted_patched, caplog):
    controller, mocks, signal_spies = workerCompleted_patched

    with caplog.at_level(logging.INFO):
        controller.workerCompleted(0, False, r"E:\test\photo.png", 4 * 1024 * 1024, 1 * 1024 * 1024)

    line1 = signal_spies["update_progress_line1"].at(0)[0]
    assert "Converted 5 out of 10 images" in line1

    log_text = caplog.text
    assert "E:\\test\\photo.png" in log_text
    assert "4.00 MB" in log_text
    assert "1.00 MB" in log_text
    assert "-75%" in log_text


def test_workerCompleted_logs_size_increase(workerCompleted_patched, caplog):
    controller, mocks, signal_spies = workerCompleted_patched

    with caplog.at_level(logging.INFO):
        controller.workerCompleted(0, False, r"E:\test\tiny.gif", 1000, 2000)

    log_text = caplog.text
    assert "E:\\test\\tiny.gif" in log_text
    assert "+100%" in log_text


def test_workerCompleted_no_log_when_no_file_path(workerCompleted_patched, caplog):
    controller, mocks, signal_spies = workerCompleted_patched

    with caplog.at_level(logging.INFO):
        controller.workerCompleted(0, False, "", 0, 0)

    line1 = signal_spies["update_progress_line1"].at(0)[0]
    assert "Converted 5 out of 10 images" in line1
    assert "KB" not in caplog.text
    assert "MB" not in caplog.text


def test_workerCompleted_no_log_when_zero_src_size(workerCompleted_patched, caplog):
    controller, mocks, signal_spies = workerCompleted_patched

    with caplog.at_level(logging.INFO):
        controller.workerCompleted(0, False, r"E:\test\image.jpg", 0, 0)

    line1 = signal_spies["update_progress_line1"].at(0)[0]
    assert "Converted 5 out of 10 images" in line1
    assert "KB" not in caplog.text
    assert "MB" not in caplog.text


def test_workerCompleted_skipped_with_empty_path(workerCompleted_patched):
    controller, mocks, signal_spies = workerCompleted_patched

    controller.workerCompleted(0, True, "", 0, 0)

    line1 = signal_spies["update_progress_line1"].at(0)[0]
    assert "Converted 5 out of 10 images" in line1
    mocks["time_left_addSkippedItem"].assert_called_once()


def test_workerCompleted_progress_value_emitted(workerCompleted_patched):
    controller, mocks, signal_spies = workerCompleted_patched

    controller.workerCompleted(0, False, r"E:\test\img.jpg", 5000, 2000)

    assert signal_spies["update_progress_value"].at(0)[0] == 5


def test_log_handler_creates_file(controller):
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("core.controller.LOGS_DIR", tmpdir):
            controller._startLogHandler()
            logging.info("test log entry")
            controller._stopLogHandler()

            log_files = [f for f in os.listdir(tmpdir) if f.startswith("convert_") and f.endswith(".log")]
            assert len(log_files) == 1

            log_path = os.path.join(tmpdir, log_files[0])
            with open(log_path, "r", encoding="utf-8") as f:
                content = f.read()
            assert "=== Conversion started ===" in content
            assert "=== Conversion finished ===" in content
            assert "test log entry" in content


def test_log_handler_writes_conversion_records(controller):
    with tempfile.TemporaryDirectory() as tmpdir:
        with patch("core.controller.LOGS_DIR", tmpdir):
            controller._startLogHandler()
            logging.info(r"E:\test\image.jpg : 512.0 KB → 128.0 KB (-75%)")
            controller._stopLogHandler()

            log_files = [f for f in os.listdir(tmpdir) if f.startswith("convert_") and f.endswith(".log")]
            log_path = os.path.join(tmpdir, log_files[0])
            with open(log_path, "r", encoding="utf-8") as f:
                content = f.read()
            assert "image.jpg" in content
            assert "-75%" in content
