"""Compare xlchemy_rust vs AOM AV1 for batch image processing."""

import os
import time
import subprocess
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


def convert_with_slimg(input_path: str, output_path: str):
    """Convert image to AVIF using xlchemy_rust."""
    decode_result = xlchemy_rust.decode_file(input_path)
    options = xlchemy_rust.PipelineOptions(
        format=xlchemy_rust.Format.Avif,
        quality=80
    )
    convert_result = xlchemy_rust.convert(decode_result.image, options)
    convert_result.save(output_path)
    return os.path.getsize(output_path)


def convert_with_aom(input_path: str, output_path: str, threads: int = 1):
    """Convert image to AVIF using AOM AV1 encoder."""
    cmd = [
        'avifenc',
        '-q', '80',
        '-j', str(threads),
        '-c', 'aom',
        input_path,
        output_path
    ]
    result = subprocess.run(cmd, capture_output=True)
    if result.returncode != 0:
        raise Exception(f"AOM encoding failed: {result.stderr.decode()}")
    return os.path.getsize(output_path)


def batch_convert_slimg(input_paths: list, output_dir: str, num_workers: int):
    """Batch convert images using xlchemy_rust with parallel workers."""
    start_time = time.time()
    output_paths = [os.path.join(output_dir, f'output_{i:03d}.avif') 
                   for i in range(len(input_paths))]
    
    with ThreadPoolExecutor(max_workers=num_workers) as executor:
        results = list(executor.map(convert_with_slimg, input_paths, output_paths))
    
    elapsed = time.time() - start_time
    total_size = sum(results)
    return elapsed, total_size


def batch_convert_aom(input_paths: list, output_dir: str, num_workers: int, threads_per_worker: int):
    """Batch convert images using AOM with parallel workers."""
    start_time = time.time()
    output_paths = [os.path.join(output_dir, f'output_{i:03d}.avif') 
                   for i in range(len(input_paths))]
    
    def convert_with_threads(args):
        return convert_with_aom(*args, threads=threads_per_worker)
    
    with ThreadPoolExecutor(max_workers=num_workers) as executor:
        results = list(executor.map(convert_with_threads, zip(input_paths, output_paths)))
    
    elapsed = time.time() - start_time
    total_size = sum(results)
    return elapsed, total_size


def main():
    print("=" * 70)
    print("Batch Image Conversion Comparison")
    print("xlchemy_rust (ravif) vs AOM AV1")
    print("=" * 70)
    
    num_images = 20
    image_size = 512
    num_workers_list = [1, 2, 4, 8]
    
    print(f"Test parameters:")
    print(f"  Number of images: {num_images}")
    print(f"  Image size: {image_size}x{image_size}")
    print(f"  Worker counts: {num_workers_list}")
    print()
    
    # Create test images
    with tempfile.TemporaryDirectory() as tmp_dir:
        input_dir = os.path.join(tmp_dir, 'input')
        slimg_output_dir = os.path.join(tmp_dir, 'slimg_output')
        aom_output_dir = os.path.join(tmp_dir, 'aom_output')
        
        os.makedirs(input_dir)
        os.makedirs(slimg_output_dir)
        os.makedirs(aom_output_dir)
        
        input_paths = []
        for i in range(num_images):
            path = os.path.join(input_dir, f'test_{i:03d}.jpg')
            create_test_image(path, image_size)
            input_paths.append(path)
        
        input_total = sum(os.path.getsize(p) for p in input_paths)
        print(f"Created {num_images} test images ({input_total / 1024 / 1024:.2f} MB total)")
        print()
        
        # Test xlchemy_rust
        print("Testing xlchemy_rust (ravif)...")
        slimg_results = []
        for workers in num_workers_list:
            print(f"  {workers} worker(s)...", end=' ')
            elapsed, total_size = batch_convert_slimg(input_paths, slimg_output_dir, workers)
            slimg_results.append({
                'workers': workers,
                'time': elapsed,
                'size': total_size
            })
            print(f"{elapsed:.2f}s")
        
        print()
        print("Testing AOM AV1...")
        aom_results = []
        for workers in num_workers_list:
            threads_per_worker = max(1, 4 // workers)  # Distribute threads
            print(f"  {workers} worker(s) ({threads_per_worker} threads each)...", end=' ')
            elapsed, total_size = batch_convert_aom(input_paths, aom_output_dir, workers, threads_per_worker)
            aom_results.append({
                'workers': workers,
                'time': elapsed,
                'size': total_size
            })
            print(f"{elapsed:.2f}s")
        
        # Results comparison
        print()
        print("=" * 70)
        print("Batch Conversion Results")
        print("=" * 70)
        print(f"{'Workers':<10} {'xlchemy_rust':<15} {'AOM AV1':<15} {'Speedup':<10}")
        print(f"{'-'*10} {'-'*15} {'-'*15} {'-'*10}")
        
        for slimg, aom in zip(slimg_results, aom_results):
            speedup = aom['time'] / slimg['time']
            print(f"{slimg['workers']:<10} {slimg['time']:<15.2f} {aom['time']:<15.2f} {speedup:<10.2f}x")
        
        print()
        print("=" * 70)
        print("File Size Comparison")
        print("=" * 70)
        slimg_total = slimg_results[0]['size']
        aom_total = aom_results[0]['size']
        print(f"xlchemy_rust total: {slimg_total / 1024:.1f} KB")
        print(f"AOM AV1 total: {aom_total / 1024:.1f} KB")
        print(f"xlchemy_rust is {(slimg_total / aom_total * 100):.1f}% of AOM size")


if __name__ == "__main__":
    main()
