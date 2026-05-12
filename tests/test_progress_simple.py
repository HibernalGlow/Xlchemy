"""Simple test for progress bar functionality."""

import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from PySide6.QtWidgets import QApplication
from PySide6.QtCore import QCoreApplication, QThread, Signal, QObject, QRunnable, QThreadPool, Qt
from ui.dialogs.progress_dlg import ProgressDialog


class WorkerSignals(QObject):
    """Signals for worker."""
    started = Signal(int)
    completed = Signal(int, bool)


class TestWorker(QRunnable):
    """Test worker that simulates slimg conversion."""
    
    def __init__(self, n: int):
        super().__init__()
        self.n = n
        self.signals = WorkerSignals()
    
    def run(self):
        self.signals.started.emit(self.n)
        
        # Simulate CPU-intensive work with processEvents
        print(f"Worker {self.n} starting...")
        
        QCoreApplication.processEvents()
        time.sleep(0.5)  # Simulate decode
        
        QCoreApplication.processEvents()
        time.sleep(0.5)  # Simulate convert
        
        QCoreApplication.processEvents()
        time.sleep(0.1)  # Simulate save
        
        print(f"Worker {self.n} completed")
        self.signals.completed.emit(self.n, False)


def test_progress_with_threadpool():
    """Test progress bar updates with QThreadPool workers."""
    app = QApplication.instance()
    if app is None:
        app = QApplication([])
    
    # Create progress dialog
    progress_dlg = ProgressDialog(minimum=0, maximum=5)
    progress_dlg.show()
    
    # Disable auto-close to prevent dialog from closing when reaching maximum
    progress_dlg.dlg.setAutoClose(False)
    progress_dlg.dlg.setAutoReset(False)
    
    # Track progress
    completed_count = [0]
    
    def on_started(n):
        print(f"Worker {n} started")
    
    def on_completed(n, skipped):
        completed_count[0] += 1
        print(f"!!! on_completed called: {completed_count[0]}/5")
        print(f"!!! progress_dlg.dlg is None: {progress_dlg.dlg is None}")
        if progress_dlg.dlg is not None:
            print(f"!!! progress_dlg.dlg.wasCanceled(): {progress_dlg.dlg.wasCanceled()}")
        progress_dlg.setValue(completed_count[0])
        print(f"!!! setValue called with {completed_count[0]}, current value: {progress_dlg.dlg.value() if progress_dlg.dlg else 'None'}")
        progress_dlg.setLabelTextLine1(f"Converted {completed_count[0]} out of 5 images")
        QCoreApplication.processEvents()
    
    # Create thread pool
    threadpool = QThreadPool()
    threadpool.setMaxThreadCount(2)
    
    # Create and start workers
    workers = []
    for i in range(5):
        worker = TestWorker(i)
        worker.signals.started.connect(on_started, Qt.QueuedConnection)
        worker.signals.completed.connect(on_completed, Qt.QueuedConnection)
        workers.append(worker)
        threadpool.start(worker)
    
    # Wait for all workers to complete
    threadpool.waitForDone(10000)
    
    # Process any remaining events
    QCoreApplication.processEvents()
    
    # Verify
    print(f"Final progress: {progress_dlg.dlg.value()}")
    assert progress_dlg.dlg.value() == 5, f"Expected 5, got {progress_dlg.dlg.value()}"
    
    progress_dlg.finished()
    print("Test passed!")


if __name__ == "__main__":
    test_progress_with_threadpool()
