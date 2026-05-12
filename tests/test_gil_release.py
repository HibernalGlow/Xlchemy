#!/usr/bin/env python3
"""Test that GIL is properly released during slimg operations."""

import threading
import time
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from xlchemy_rust import (
        Format as SlimgFormat,
        decode_file as slimg_decode_file,
        convert as slimg_convert,
        PipelineOptions,
    )
    SLIMG_AVAILABLE = True
except ImportError:
    SLIMG_AVAILABLE = False
    print("xlchemy_rust not available, skipping test")
    sys.exit(0)

def test_gil_released_during_decode():
    """Test that GIL is released during decode_file, allowing other threads to run."""
    
    test_image = os.path.join(os.path.dirname(__file__), "test_images", "test.jpg")
    if not os.path.exists(test_image):
        print(f"Test image not found: {test_image}")
        return False
    
    counter = [0]
    stop_flag = threading.Event()
    
    def increment_counter():
        while not stop_flag.is_set():
            counter[0] += 1
            time.sleep(0.001)
    
    counter_thread = threading.Thread(target=increment_counter)
    counter_thread.start()
    
    time.sleep(0.1)
    initial_count = counter[0]
    
    result = slimg_decode_file(test_image)
    
    stop_flag.set()
    counter_thread.join()
    
    final_count = counter[0]
    
    print(f"Initial counter: {initial_count}")
    print(f"Final counter: {final_count}")
    print(f"Counter increased by: {final_count - initial_count}")
    
    if final_count > initial_count:
        print("SUCCESS: GIL was released during decode_file - other threads could run!")
        return True
    else:
        print("FAILURE: GIL was NOT released - other threads were blocked!")
        return False

def test_gil_released_during_convert():
    """Test that GIL is released during convert, allowing other threads to run."""
    
    test_image = os.path.join(os.path.dirname(__file__), "test_images", "test.jpg")
    if not os.path.exists(test_image):
        print(f"Test image not found: {test_image}")
        return False
    
    result = slimg_decode_file(test_image)
    
    counter = [0]
    stop_flag = threading.Event()
    
    def increment_counter():
        while not stop_flag.is_set():
            counter[0] += 1
            time.sleep(0.001)
    
    counter_thread = threading.Thread(target=increment_counter)
    counter_thread.start()
    
    time.sleep(0.1)
    initial_count = counter[0]
    
    options = PipelineOptions(
        format=SlimgFormat.Avif,
        quality=80,
    )
    output = slimg_convert(result.image, options)
    
    stop_flag.set()
    counter_thread.join()
    
    final_count = counter[0]
    
    print(f"Initial counter: {initial_count}")
    print(f"Final counter: {final_count}")
    print(f"Counter increased by: {final_count - initial_count}")
    
    if final_count > initial_count:
        print("SUCCESS: GIL was released during convert - other threads could run!")
        return True
    else:
        print("FAILURE: GIL was NOT released - other threads were blocked!")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Testing GIL release during slimg operations")
    print("=" * 60)
    
    print("\n--- Test 1: decode_file GIL release ---")
    test1_passed = test_gil_released_during_decode()
    
    print("\n--- Test 2: convert GIL release ---")
    test2_passed = test_gil_released_during_convert()
    
    print("\n" + "=" * 60)
    if test1_passed and test2_passed:
        print("All tests PASSED! GIL is properly released.")
    else:
        print("Some tests FAILED! GIL may not be properly released.")
    print("=" * 60)
