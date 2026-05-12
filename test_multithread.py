"""Test xlchemy_rust multithreaded image processing performance."""

import os
import sys
import time
import threading
import multiprocessing
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import xlchemy_rust


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


def convert_image(input_path: str):
    """Convert a single image to AVIF."""
    decode_result = xlchemy_rust.decode_file(input_path)
    options = xlchemy_rust.PipelineOptions(
        format=xlchemy_rust.Format.Avif,
        quality=80
    )
    convert_result = xlchemy_rust.convert(decode_result.image, options)
    return len(convert_result.data)


def test_single_thread(num_images: int, image_size: int, tmp_dir: str):
    """Test single-threaded processing."""
    input_paths = []
    for i in range(num_images):
        path = os.path.join(tmp_dir, f'test_{i:03d}.jpg')
        create_test_image(path, image_size)
        input_paths.append(path)
    
    start_time = time.time()
    total_size = 0
    for path in input_paths:
        total_size += convert_image(path)
    elapsed = time.time() - start_time
    
    return elapsed, total_size


def test_multi_thread(num_images: int, image_size: int, num_threads: int, tmp_dir: str):
    """Test multi-threaded processing using ThreadPoolExecutor."""
    input_paths = []
    for i in range(num_images):
        path = os.path.join(tmp_dir, f'test_{i:03d}.jpg')
        create_test_image(path, image_size)
        input_paths.append(path)
    
    start_time = time.time()
    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        results = list(executor.map(convert_image, input_paths))
    total_size = sum(results)
    elapsed = time.time() - start_time
    
    return elapsed, total_size


def main():
    print("=" * 70)
    print("xlchemy_rust Multithreaded Performance Test")
    print("=" * 70)
    
    num_images = 20
    image_size = 512
    thread_counts = [1, 2, 4, 8, 16]
    
    print(f"Test parameters:")
    print(f"  Number of images: {num_images}")
    print(f"  Image size: {image_size}x{image_size}")
    print(f"  Thread counts: {thread_counts}")
    print(f"  CPU cores: {multiprocessing.cpu_count()}")
    print()
    
    import tempfile
    with tempfile.TemporaryDirectory() as tmp_dir:
        # Test single-threaded as baseline
        print("Testing single-threaded...")
        single_time, single_size = test_single_thread(num_images, image_size, tmp_dir)
        print(f"✓ Single-threaded completed")
        print(f"  Time: {single_time:.2f} seconds")
        print(f"  Total output: {single_size / 1024:.1f} KB")
        print()
        
        # Test multi-threaded
        print("Testing multi-threaded (ThreadPoolExecutor)...")
        results = []
        for threads in thread_counts:
            print(f"  Testing with {threads} threads...", end=' ')
            elapsed, total_size = test_multi_thread(num_images, image_size, threads, tmp_dir)
            speedup = single_time / elapsed
            results.append({
                'threads': threads,
                'time': elapsed,
                'speedup