"""Test progress bar updates during slimg conversion."""

import os
import sys
import tempfile
import time
from pathlib import Path
from unittest.mock import patch
from PySide6.QtCore import QCoreApplication

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def create_test_image(output_path: str, size: int = 512):
    """Create a test image using PIL."""
    from PIL import Image
    img = Image.new('RGB', (size, size))
    pixels = img.load()
    for i in range(size):
        for j in range(size):
            r = (i + j) % 256
            g = (i * 2 + j) % 256
            b = (i + j * 2) % 256
            pixels[i, j] = (r, g, b)
    img.save(output_path, format='JPEG', quality=95)
    return output_path


def test_worker_does_not_pump_the_gui_event_loop():
    """Worker 跑在线程池里，转换路径上不许出现 processEvents() —— 那是 GUI 线程的活。

    阳性对照：先确认 slimg 真的产出了文件，否则「零次调用」会因为转换早早抛异常而假绿。
    """
    from core.worker import Worker, WorkerSignals
    from PySide6.QtCore import QMutex

    with tempfile.TemporaryDirectory() as tmp_dir:
        input_path = os.path.join(tmp_dir, 'test.jpg')
        output_path = os.path.join(tmp_dir, 'test.avif')
        create_test_image(input_path)

        calls = []
        original_process_events = QCoreApplication.processEvents

        def spy():
            calls.append(time.time())
            return original_process_events()

        params = {
            'format': 'AVIF',
            'quality': 80,
            'misc': {'keep_metadata': 'None'},
        }
        worker = Worker(
            0,
            Path(input_path),
            Path(tmp_dir),
            params,
            {},
            4,
            QMutex(),
            WorkerSignals(),
        )
        worker.output_dir = tmp_dir
        worker.output = output_path
        worker.final_output = output_path

        with patch.object(QCoreApplication, 'processEvents', side_effect=spy):
            worker._convert_with_slimg()

        assert os.path.isfile(output_path), "slimg conversion produced no output"
        assert calls == [], f"conversion pumped the GUI event loop {len(calls)} times"


def test_progress_value_updates():
    """Test that progress value is correctly updated."""
    from PySide6.QtWidgets import QApplication, QProgressDialog
    from ui.dialogs.progress_dlg import ProgressDialog
    
    # Ensure QApplication exists
    app = QApplication.instance()
    if app is None:
        app = QApplication([])
    
    # Create progress dialog
    progress_dlg = ProgressDialog(minimum=0, maximum=10)
    progress_dlg.show()  # Must call show() to create the internal dialog
    
    # Verify range is set
    assert progress_dlg.dlg is not None, "Dialog not created"
    
    # Simulate progress updates
    for i in range(11):
        progress_dlg.setValue(i)
        QCoreApplication.processEvents()
        time.sleep(0.05)
    
    # Check final value
    assert progress_dlg.dlg.value() == 10, f"Expected value 10, got {progress_dlg.dlg.value()}"
    
    progress_dlg.finished()


def test_slimg_conversion_with_progress():
    """Test full slimg conversion with progress tracking."""
    import xlchemy_rust
    from PySide6.QtWidgets import QApplication
    
    # Ensure QApplication exists
    app = QApplication.instance()
    if app is None:
        app = QApplication([])
    
    with tempfile.TemporaryDirectory() as tmp_dir:
        # Create test image
        input_path = os.path.join(tmp_dir, 'test.jpg')
        output_path = os.path.join(tmp_dir, 'test.avif')
        create_test_image(input_path)
        
        # Track progress events
        progress_values = []
        
        def track_progress():
            progress_values.append(time.time())
            QCoreApplication.processEvents()
        
        # Decode
        print("Decoding...")
        track_progress()
        result = xlchemy_rust.decode_file(input_path)
        print(f"Decoded: {result.image.width}x{result.image.height}")
        
        # Convert
        print("Converting...")
        track_progress()
        options = xlchemy_rust.PipelineOptions(
            format=xlchemy_rust.Format.Avif,
            quality=80
        )
        output = xlchemy_rust.convert(result.image, options)
        print(f"Converted: {len(output.data)} bytes")
        
        # Save
        print("Saving...")
        track_progress()
        output.save(output_path)
        
        # Verify
        assert os.path.exists(output_path), "Output file not created"
        assert os.path.getsize(output_path) > 0, "Output file is empty"
        
        print(f"Success! Output: {output_path} ({os.path.getsize(output_path)} bytes)")
        print(f"Progress events tracked: {len(progress_values)}")


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v", "-s"])
