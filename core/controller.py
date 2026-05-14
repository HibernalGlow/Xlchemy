import logging
import textwrap
import os
from datetime import datetime
from typing import Any
from pathlib import Path
from dataclasses import dataclass, field
from enum import Enum, auto

from PySide6.QtCore import (
    QThreadPool,
    QMutex,
    Signal,
    Slot,
    QObject,
    Qt,
    QTimer,
)

from data.time_left import TimeLeft
from data.thread_manager import ThreadManager
from data.items import Items
from data.process_manager import ProcessManager
from data.constants import LOGS_DIR
import data.task_status as task_status
from core.worker import Worker
from core.pathing import UniquePathStore
from core.metadata import isExifToolAvailable

class CheckFlags(Enum):
    # Currently unused
    DUMMY_FLAG = auto()

@dataclass
class CheckStatus:
    allowed_to_proceed: bool = True
    display_error: bool = False
    error_title: str = ""
    error_description: str = ""
    flags: list[CheckFlags] = field(default_factory=list)

    def setError(self, title: str, description: str, allowed_to_proceed: bool = False, display_error: bool = True) -> None:
        self.display_error = display_error
        self.error_title = title
        self.error_description = description
        self.allowed_to_proceed = allowed_to_proceed
    
    def addFlags(self, *new_flags: CheckFlags) -> None:
        for new_flag in new_flags:
            if new_flag not in self.flags:
                self.flags.append(new_flag)

class Controller(QObject):
    processing_started = Signal()
    processing_finished = Signal()
    exception = Signal(str, str, str)
    update_progress_line1 = Signal(str)
    update_progress_line2 = Signal(str)
    update_progress_value = Signal(int)

    def __init__(self, threadpool: QThreadPool) -> None:
        super().__init__()
        # Components
        self.threadpool = threadpool
        self.time_left = TimeLeft()
        self.thread_manager = ThreadManager(self.threadpool)
        self.items = Items()
        self.mutex = QMutex()

        # Flags
        self.finish_emitted = False     # debounce
        self._log_handler = None
        self._prev_log_level = logging.WARNING

        # Signals
        self.time_left.update_time_left.connect(self.update_progress_line2)

    def checkProcessingRequirements(self,
        input_tab_item_count: int,
        sm_is_format_pool_empty: bool,
        output_tab_settings: dict[str, Any],
        modify_tab_settings: dict[str, Any],
        settings_tab_settings: dict[str, Any],
    ) -> CheckStatus:
        """Performs pre-conversion checks. Remember to parse data before."""
        output = CheckStatus()

        if input_tab_item_count == 0:
            output.setError(
                "Empty List",
                "File list is empty.\nDrag and drop images (or folders) onto the program to add them.",
            )
            return output

        if output_tab_settings["custom_output_dir"]:
            custom_dir_path = Path(output_tab_settings["custom_output_dir_path"]) 
            if custom_dir_path.is_absolute(): # Relative paths are handled in the Worker
                try:
                    os.makedirs(custom_dir_path, exist_ok=True)
                except OSError as err:
                    output.setError(
                        "Access Error",
                        f"Make sure the output path is accessible\nand you have write permissions to it.\n{textwrap.fill(str(err), width=75)}"
                    )
                    return output
            else:
                if output_tab_settings["keep_dir_struct"]:
                    output.setError(
                        "Path Conflict",
                        "A relative path cannot be combined with \"Keep Folder Structure\".\nEnter an absolute path (or choose one by clicking on the button with 3 dots)."
                    )
                    return output

        if output_tab_settings["format"] == "Smallest Lossless" and sm_is_format_pool_empty:
            output.setError(
                "Format Error",
                "Select at least one format."
            )
            return output

        if self.items.getItemCount() == 0:
            output.setError(
                "Data Error",
                "Something went wrong.\nParsed data is empty"
            )
            return output
        
        thread_count = self.threadpool.activeThreadCount()
        if thread_count > 0:
            output.setError(
                "Still Processing",
                f"{'A thread' if thread_count == 1 else str(thread_count) + ' threads'} from the last session {'is' if thread_count == 1 else 'are'} still finishing.\nWait a moment before trying again."
            )
            return output

        if modify_tab_settings["misc"]["keep_metadata"].startswith("ExifTool"):
            # ExifTool available
            exiftool_available = isExifToolAvailable()
            if not exiftool_available[0]:
                output.setError(
                    "ExifTool Unavailable",
                    exiftool_available[1],
                )
                return output
            
            # ExifTool args empty
            cur_mode = modify_tab_settings["misc"]["keep_metadata"]
            et_args = settings_tab_settings["exiftool_args"][cur_mode].strip().split(" ")
            if len(et_args) == 1 and et_args[0] == "":
                msg = f"Argument list for \"{cur_mode}\" is empty."
                msg += "\nChange metadata mode or add arguments in Settings -> ExifTool." if cur_mode == "ExifTool - Custom" else "\nReset it to default in Settings -> ExifTool."
                output.setError(
                    "ExifTool Error",
                    msg,
                )
                return output
        elif (
            output_tab_settings["format"] == "JPEG" and
            settings_tab_settings["jpg_encoder"] == "JPEGLI" and
            modify_tab_settings["misc"]["keep_metadata"] == "Encoder - Preserve"
        ):
            output.setError(
                "Metadata Mode Unavailable",
                "The `Encoder - Preserve` metadata mode is unavailable for JPEGLI.\nGo to Modify tab, and pick `ExifTool - Preserve` to keep metadata."
            )
            return output

        return output

    def parseData(self, order: str, input_tab_items) -> None:
        """Prepares data for startProcessing(...)"""
        self.items.clear()
        self.items.parseData(order, *input_tab_items)

    def startProcessing(self,
        output_tab_settings: dict[str, Any],
        modify_tab_settings: dict[str, Any],
        settings_tab_settings: dict[str, Any],
        used_thread_count: int,
    ) -> None:
        """Starts the conversion."""

        self._startLogHandler()

        # Setup
        self.thread_manager.configure(
            self.items.getItemCount(),
            used_thread_count,
            settings_tab_settings["ram_optimizer"],
            settings_tab_settings["ram_optimizer_rules"],
            output_tab_settings["format"],
            settings_tab_settings["avif_encoder"],
            output_tab_settings["effort"],
            output_tab_settings["jxl_modular"],
            output_tab_settings["lossless"],
            output_tab_settings["intelligent_effort"],
        )
        task_status.reset()
        ProcessManager.clear()
        UniquePathStore.clear()
        self.finish_emitted = False

        # Loader
        worker_data = []
        params = output_tab_settings | modify_tab_settings
        for i in range(self.items.getItemCount()):
            abs_path, anchor_path = self.items.getItem(i)
            worker = Worker(
                i,
                abs_path,
                anchor_path,
                params,
                settings_tab_settings,
                self.thread_manager.getAvailableThreads(i),
                self.mutex
            )
            worker_data.append((worker, worker.signals))
        
        for _, signals in worker_data:
            signals.started.connect(self.workerStarted, Qt.QueuedConnection)
            signals.completed.connect(self.workerCompleted, Qt.QueuedConnection)
            signals.canceled.connect(self.workerCanceled, Qt.QueuedConnection)
            signals.exception.connect(self.exception, Qt.QueuedConnection)
            
        for worker, _ in worker_data:
            self.threadpool.start(worker)

        self.time_left.startCounting(self.items.getItemCount())
        self.processing_started.emit()
        self.update_progress_line1.emit("Starting the conversion...")   # Needs to stay after processing_started.emit()

    def finishProcessing(self) -> None:
        if self.finish_emitted:
            return
        self.finish_emitted = True
        self.time_left.stopCounting()
        QTimer.singleShot(500, self._stopLogHandler)
        self.processing_finished.emit()
        ProcessManager.clear()

    def getItemCount(self) -> int:
        return self.items.getItemCount()
   
    def getCompletedItemCount(self) -> int:
        return self.items.getCompletedItemCount()
    
    def cancel(self):
        task_status.cancel()
        ProcessManager.terminateAll()

    def _startLogHandler(self):
        self._stopLogHandler()
        os.makedirs(LOGS_DIR, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_path = os.path.join(LOGS_DIR, f"convert_{ts}.log")
        handler = logging.FileHandler(log_path, encoding="utf-8")
        handler.setFormatter(logging.Formatter("%(asctime)s  %(message)s", datefmt="%H:%M:%S"))
        handler.setLevel(logging.INFO)
        logger = logging.getLogger()
        self._prev_log_level = logger.level
        logger.setLevel(logging.INFO)
        logger.addHandler(handler)
        self._log_handler = handler
        logging.info("=== Conversion started ===")

    def _stopLogHandler(self):
        if self._log_handler is not None:
            logging.info("=== Conversion finished ===")
            self._log_handler.flush()
            logger = logging.getLogger()
            logger.removeHandler(self._log_handler)
            self._log_handler.close()
            self._log_handler = None
            logger.setLevel(self._prev_log_level)

    @Slot(int)
    def workerStarted(self, n: int) -> None:
        logging.debug(f"[Worker #{n}] Started")

    @Slot(int, bool, str, int, int)
    def workerCompleted(self, n: int, skipped: bool, file_path: str, src_size: int, dst_size: int) -> None:
        self.items.addCompletedItem()
        if not skipped:
            self.time_left.addCompletedItem()
        else:
            self.time_left.addSkippedItem()

        completed = self.items.getCompletedItemCount()
        total = self.items.getItemCount()
        self.update_progress_value.emit(completed)

        if file_path and src_size > 0:
            def fmt_size(s):
                if s >= 1024 * 1024:
                    return f"{s / (1024 * 1024):.2f} MB"
                elif s >= 1024:
                    return f"{s / 1024:.1f} KB"
                else:
                    return f"{s} B"
            src_str = fmt_size(src_size)
            dst_str = fmt_size(dst_size)
            if src_size > 0:
                pct = ((src_size - dst_size) / src_size) * 100
                pct_str = f"-{pct:.0f}%" if pct > 0 else f"+{abs(pct):.0f}%"
            else:
                pct_str = "0%"
            log_text = f"{file_path} : {src_str} → {dst_str} ({pct_str})"
            logging.info(log_text)

        self.update_progress_line1.emit(f"Converted {completed} out of {total} images")

        if completed >= total or task_status.wasCanceled():
            self.finishProcessing()
        
        logging.debug(f"Active Workers: {self.threadpool.activeThreadCount()}")
        logging.debug(f"[Worker #{n}] Completed")

    @Slot(int)
    def workerCanceled(self, n: int) -> None:
        self.finishProcessing()
        logging.debug(f"[Worker #{n}] Canceled")
