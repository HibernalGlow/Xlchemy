"""Test xlchemy_rust parallel processing with Xlchemy-style thread management."""

import os
import time
import tempfile
from concurrent.futures import ThreadPoolExecutor
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


def convert_single_image(input_path: str, thread_id: int = 0):
    """Convert a single image to AVIF - simulating one worker."""
    decode_result = xlchemy_rust.decode_file(input_path)
    options = xlchemy_rust.PipelineOptions(
        format=xlchemy_rust.Format.Avif,
        quality=80
    )
    convert_result = xlchemy_rust.convert(decode_result.image, options)
    return len(convert_result.data)


def test_parallel_conversion(num_images: int, num_workers: int):
    """Test parallel image conversion simulating Xlchemy's worker model."""
    
    with tempfile.TemporaryDirectory() as tmp_dir:
        # Create test images
        input_paths = []
        for i in range(num_images):
            path = os.path.join(tmp_dir, f'test_{i:03d}.jpg')
            create_test_image(path, 512)
            input_paths.append(path)
        
        # Simulate Xlchemy's parallel processing
        start_time = time.time()
        
        # ThreadPoolExecutor simulates Xlchemy's QThreadPool
        with ThreadPoolExecutor(max_workers=num_workers) as executor:
            # Each worker processes one image at a time
            results = list(executor.map(convert_single_image, input_paths))
        
        elapsed = time.time() - start_time
        total_size = sum(results)
        
        return elapsed, total_size


def main():
    print("=" * 70)
    print("xlchemy_rust Parallel Processing Test")
    print("(Simulating Xlchemy's Thread Management Model)")
    print("=" * 70)
    
    num_images = 10
    worker_counts = [1, 2, 4, 8, 16]
    
    print(f"Test parameters:")
    print(f"  Number of images: {num_images}")
    print(f"  Image size: 512x512")
    print(f"  Worker counts: {worker_counts}")
    print()
    
    # Test single worker as baseline
    print("Testing single worker...")
    single_time, single_size = test_parallel_conversion(num_images, 1)
    print(f"✓ Single worker completed")
    print(f"  Time: {single_time:.2f} seconds")
    print(f"  Total output: {single_size / 1024:.1f} KB")
    print()
    
    # Test multiple workers
    print("Testing parallel workers...")
    results = []
    for workers in worker_counts:
        print(f"  Testing with {workers} workers...", end=' ')
        elapsed, total_size = test_parallel_conversion(num_images, workers)
        speedup = single_time / elapsed
        results.append({
            'workers': workers,
            'time': elapsed,
            'speedup': speedup
        })
        print(f"done ({elapsed:.2f}s, {speedup:.2f}x speedup)")
    
    print()
    print("=" * 70)
    print("Parallel Processing Results")
    print("=" * 70)
    print(f"{'Workers':<10} {'Time (s)':<15} {'Speedup':<10} {'Efficiency':<15}")
    print(f"{'-'*10} {'-'*15} {'-'*10} {'-'*15}")
    print(f"{1:<10} {single_time:<15.2f} {1.0:<10.2f} {'100%':<15}")
    
    for r in results:
        efficiency = (r['speedup'] / r['workers']) * 100
        print(f"{r['workers']:<10} {r['time']:<15.2f} {r['speedup']:<10.2f} {efficiency:<15.1f}%")
    
    print()
    print("Note: This simulates Xlchemy's worker model where each worker")
    print("      processes one image at a time using xlchemy_rust.")
    print("      Multiple workers run in parallel to process multiple images.")


if __name__ == "__main__":
    main()
