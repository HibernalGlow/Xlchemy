import pytest
import os
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock, Mock
from contextlib import ExitStack

from PySide6.QtCore import QThreadPool, Qt
from PySide6.QtTest import QSignalSpy

from core.controller import Controller
from core.worker import Worker, Signals


def test_worker_signals_completed_emits_file_info():
    signals = Signals()
    spy = QSignalSpy(signals.completed)

    signals.completed.emit(0, False, r"E:\test\image.jpg", 1024000, 512000)

    assert spy.count() == 1
    assert spy.at(0)[0] == 0
    assert spy.at(0)[1] == False
    assert spy.at(0)[2] == r"E:\test\image.jpg"
    assert spy.at(0)[3] == 1024000
    assert spy.at(0)[4] == 512000


def test_worker_signals_completed_emits_empty_for_skip():
    signals = Signals()
    spy = QSignalSpy(signals.completed)

    signals.completed.emit(0, True, "", 0, 0)

    assert spy.count() == 1
    assert spy.at(0)[1] == True
    assert spy.at(0)[2] == ""
    assert spy.at(0)[3] == 0


def test_controller_workerCompleted_emits_filepath():
    controller = Controller(MagicMock(autospec=QThreadPool()))
    spy_line1 = QSignalSpy(controller.update_progress_line1)
    spy_value = QSignalSpy(controller.update_progress_value)

    with (
        patch.object(controller.items, "addCompletedItem"),
        patch.object(controller.time_left, "addCompletedItem"),
        patch.object(controller.items, "getCompletedItemCount", return_value=3),
        patch.object(controller.items, "getItemCount", return_value=10),
        patch("core.controller.task_status.wasCanceled", return_value=False),
        patch.object(controller, "finishProcessing"),
    ):
        controller.workerCompleted(0, False, r"C:\Users\test\photo.jpg", 2048000, 512000)

    assert spy_line1.count() == 1
    line1 = spy_line1.at(0)[0]
    assert "photo.jpg" in line1
    assert "MB" in line1
    assert "KB" in line1
    assert "-75%" in line1


def test_controller_workerCompleted_emits_fallback():
    controller = Controller(MagicMock(autospec=QThreadPool()))
    spy_line1 = QSignalSpy(controller.update_progress_line1)

    with (
        patch.object(controller.items, "addCompletedItem"),
        patch.object(controller.time_left, "addCompletedItem"),
        patch.object(controller.items, "getCompletedItemCount", return_value=3),
        patch.object(controller.items, "getItemCount", return_value=10),
        patch("core.controller.task_status.wasCanceled", return_value=False),
        patch.object(controller, "finishProcessing"),
    ):
        controller.workerCompleted(0, False, "", 0, 0)

    assert spy_line1.count() == 1
    assert "Converted 3 out of 10 images" in spy_line1.at(0)[0]


def test_worker_run_emits_completed_with_file_info():
    with tempfile.TemporaryDirectory() as tmpdir:
        src_file = Path(tmpdir) / "test.png"
        src_file.write_bytes(b'\x89PNG\r\n\x1a\n' + b'\x00' * 100)

        params = {
            "format": "JPEG XL",
            "lossless": False,
            "quality": 80,
            "effort": 7,
            "intelligent_effort": False,
            "jxl_modular": False,
            "downscaling": {"enabled": False},
            "if_file_exists": "Skip",
            "custom_output_dir": False,
            "custom_output_dir_path": "",
            "keep_dir_struct": False,
            "misc": {"keep_metadata": "Encoder - Strip"},
            "jxl_png_fallback": False,
            "aom_av1_chroma_subsampling": "Default",
            "jpegli_chroma_subsampling": "Default",
            "jpg_chroma_subsampling": "Default",
        }
        settings = {
            "jpg_encoder": "JPEGLI",
            "avif_encoder": "AOM AV1",
            "avif_aom_iq_tune": False,
            "enable_custom_args": False,
            "avifenc_args": "",
            "cjxl_args": "",
            "cjpegli_args": "",
            "im_args": "",
            "jxl_auto_lossless_jpeg": False,
            "disable_progressive_jpegli": False,
            "ram_optimizer": "Static",
            "ram_optimizer_rules": '("all", 14, "1")',
        }

        mutex = MagicMock()

        worker = Worker(
            n=0,
            abs_path=src_file,
            anchor_path=Path(tmpdir),
            params=params,
            settings=settings,
            available_threads=1,
            mutex=mutex,
        )

        spy_completed = QSignalSpy(worker.signals.completed)
        spy_started = QSignalSpy(worker.signals.started)
        spy_canceled = QSignalSpy(worker.signals.canceled)
        spy_exception = QSignalSpy(worker.signals.exception)

        import data.task_status as task_status
        task_status.reset()

        worker.run()

        assert spy_completed.count() >= 1
        last_emit = spy_completed.at(spy_completed.count() - 1)
        n, skipped, file_path, src_size, dst_size = last_emit[0], last_emit[1], last_emit[2], last_emit[3], last_emit[4]
        assert file_path == str(src_file)
        assert src_size > 0
