"""Test progress bar updates during slimg conversion."""

import os
import sys
import tempfile
import time
from unittest.mock import MagicMock, patch
from PySide6.QtCore import QCoreApplication, QThread, Signal, QObject

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


def test_process_events_called_during_conversion():
    """Test that QCoreApplication.processEvents is called during slimg conversion."""
    from core.worker import Worker
    
    with tempfile.TemporaryDirectory() as tmp_dir:
        # Create test image
        input_path = os.path.join(tmp_dir, 'test.jpg')
        create_test_image(input_path)
        
        # Mock processEvents
        process_events_calls = []
        original_process_events = QCoreApplication.processEvents
        
        def mock_process_events():
            process_events_calls.append(time.time())
            original_process_events()
        
        # Create worker with minimal setup
        with patch.object(QCoreApplication, 'processEvents', side_effect=mock_process_events):
            # Setup worker parameters
            worker = Worker()
            worker.n = 0
            worker.item_abs_path = input_path
            worker.org_item_abs_path = input_path
            worker.item_name = 'test'
            worker.item_ext = '.jpg'
            worker.output_dir = tmp_dir
            worker.output = os.path.join(tmp_dir, 'test.avif')
            worker.final_output = os.path.join(tmp_dir, 'test.avif')
            worker.output_ext = '.avif'
            worker.params = {
                'format': 'AVIF',
                'quality': 80,
                'downscaling': {'enabled': False},
                'if_file_exists': 'Replace',
                'custom_output_dir': False,
                'delete_original': False,
                'delete_original_mode': 'To Trash',
                'misc': {'keep_metadata': 'None'},
            }
            worker.settings = {
                'avif_encoder': 'slimg',
            }
            worker.available_threads = 4
            worker.skipped = False
            worker.skip = False
            worker.lossless_jpeg = False
            worker.proxy = MagicMock()
            worker.proxy.proxyExists.return_value = False
            worker.mutex = MagicMock()
            
            # Mock signals
            class MockSignals(QObject):
                started = Signal(int)
                completed = Signal(int, bool)
                canceled = Signal(int)
            
            worker.signals = MockSignals()
            
            # Run conversion
            try:
                worker._convert_with_slimg()
            except Exception as e:
                print(f"Conversion error: {e}")
        
        # Check that processEvents was called at least 3 times
        print(f"processEvents called {len(process_events_calls)} times")
        assert len(process_events_calls) >= 3, f"Expected at least 3 processEvents calls, got {len(process_events_calls)}"


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
