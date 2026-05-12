"""Compare xlchemy_rust (ravif) vs AOM AV1 encoder for AVIF conversion."""

import os
import sys
import time
import subprocess
import xlchemy_rust


def create_test_image(output_path: str, size: int = 512):
    """Create a test image using PIL."""
    from PIL import Image
    import random
    
    img = Image.new('RGB', (size, size))
    pixels = img.load()
    
    # Create a gradient pattern
    for i in range(size):
        for j in range(size):
            r = (i + j) % 256
            g = (i * 2 + j) % 256
            b = (i + j * 2) % 256
            pixels[i, j] = (r, g, b)
    
    img.save(output_path, format='JPEG', quality=95)
    return output_path


def test_xlchemy_rust_avif(input_path: str, output_path: str, quality: int = 80):
    """Convert image to AVIF using xlchemy_rust (ravif)."""
    start_time = time.time()
    
    # Decode the image
    decode_result = xlchemy_rust.decode_file(input_path)
    
    # Convert to AVIF
    options = xlchemy_rust.PipelineOptions(
        format=xlchemy_rust.Format.Avif,
        quality=quality
    )
    convert_result = xlchemy_rust.convert(decode_result.image, options)
    
    # Save
    convert_result.save(output_path)
    
    elapsed = time.time() - start_time
    file_size = os.path.getsize(output_path)
    
    return elapsed, file_size


def test_aom_avif(input_path: str, output_path: str, quality: int = 80, threads: int = 4):
    """Convert image to AVIF using AOM AV1 encoder (avifenc)."""
    avifenc_path = "avifenc"  # Assuming avifenc is in PATH
    
    start_time = time.time()
    
    try:
        # Build command with correct avifenc arguments
        cmd = [
            avifenc_path,
            "-q", str(quality),
            "-j", str(threads),
            "-c", "aom",
            input_path,
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"AOM encoder error: {result.stderr}")
            return None, None
        
        elapsed = time.time() - start_time
        file_size = os.path.getsize(output_path)
        
        return elapsed, file_size
    except FileNotFoundError:
        print("avifenc not found in PATH. Skipping AOM test.")
        return None, None


def main():
    import tempfile
    
    print("=" * 70)
    print("AVIF Encoder Comparison: xlchemy_rust (ravif) vs AOM AV1")
    print("=" * 70)
    
    # Create test image
    with tempfile.TemporaryDirectory() as tmp_dir:
        input_path = os.path.join(tmp_dir, 'test_input.jpg')
        xlchemy_output = os.path.join(tmp_dir, 'xlchemy_output.avif')
        aom_output = os.path.join(tmp_dir, 'aom_output.avif')
        
        # Create a larger test image for better comparison
        create_test_image(input_path, size=512)
        input_size = os.path.getsize(input_path)
        print(f"Test image created: {input_path}")
        print(f"Input size: {input_size} bytes (512x512 JPEG)\n")
        
        # Test xlchemy_rust
        print("Testing xlchemy_rust (ravif)...")
        xlchemy_time, xlchemy_size = test_xlchemy_rust_avif(input_path, xlchemy_output, quality=80)
        print(f"✓ xlchemy_rust completed")
        print(f"  Time: {xlchemy_time:.2f} seconds")
        print(f"  Output size: {xlchemy_size} bytes")
        print(f"  Compression ratio: {(xlchemy_size / input_size * 100):.1f}%\n")
        
        # Test AOM AV1
        print("Testing AOM AV1 encoder...")
        aom_time, aom_size = test_aom_avif(input_path, aom_output, quality=80, threads=4)
        
        if aom_time is not None:
            print(f"✓ AOM AV1 completed")
            print(f"  Time: {aom_time:.2f} seconds")
            print(f"  Output size: {aom_size} bytes")
            print(f"  Compression ratio: {(aom_size / input_size * 100):.1f}%\n")
            
            # Comparison
            print("=" * 70)
            print("Comparison Results:")
            print("=" * 70)
            print(f"{'Encoder':<20} {'Time (s)':<15} {'Size (bytes)':<15} {'Ratio':<10}")
            print(f"{'-'*20} {'-'*15} {'-'*15} {'-'*10}")
            print(f"{'xlchemy_rust (ravif)':<20} {xlchemy_time:<15.2f} {xlchemy_size:<15} {(xlchemy_size / input_size * 100):<10.1f}%")
            print(f"{'AOM AV1':<20} {aom_time:<15.2f} {aom_size:<15} {(aom_size / input_size * 100):<10.1f}%")
            print()
            print(f"xlchemy_rust is {aom_time/xlchemy_time:.1f}x faster than AOM AV1")
            print(f"xlchemy_rust output is {(xlchemy_size/aom_size*100):.1f}% of AOM AV1 size")
        else:
            print("⚠ AOM AV1 test skipped (avifenc not found)")
            print("=" * 70)
            print("xlchemy_rust (ravif) Results:")
            print("=" * 70)
            print(f"  Time: {xlchemy_time:.2f} seconds")
            print(f"  Output size: {xlchemy_size} bytes")
            print(f"  Compression ratio: {(xlchemy_size / input_size * 100):.1f}%")


if __name__ == "__main__":
    main()
