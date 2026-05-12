"""
Example usage of xlchemy_rust for image processing.

This module demonstrates how to use the high-performance Rust bindings
for image format conversion, including AVIF support.
"""

from xlchemy_rust import (
    Format,
    decode_file,
    convert,
    PipelineOptions,
    ResizeMode,
    CropMode,
    ExtendMode,
    FillColor,
)


def convert_to_avif(input_path: str, output_path: str, quality: int = 80) -> None:
    """
    Convert an image to AVIF format.
    
    Args:
        input_path: Path to the input image
        output_path: Path for the output AVIF file
        quality: Encoding quality (0-100)
    """
    result = decode_file(input_path)
    
    options = PipelineOptions(
        format=Format.Avif,
        quality=quality,
    )
    
    output = convert(result.image, options)
    output.save(output_path)
    
    print(f"Converted {input_path} to AVIF: {output_path}")
    print(f"  Original: {result.image.width}x{result.image.height}")
    print(f"  Output: {output.width}x{output.height}, {len(output.data)} bytes")


def convert_to_jxl(input_path: str, output_path: str, quality: int = 80) -> None:
    """
    Convert an image to JPEG XL format.
    
    Args:
        input_path: Path to the input image
        output_path: Path for the output JXL file
        quality: Encoding quality (0-100)
    """
    result = decode_file(input_path)
    
    options = PipelineOptions(
        format=Format.Jxl,
        quality=quality,
    )
    
    output = convert(result.image, options)
    output.save(output_path)
    
    print(f"Converted {input_path} to JXL: {output_path}")


def resize_and_convert(
    input_path: str,
    output_path: str,
    target_format: Format,
    max_width: int,
    max_height: int,
    quality: int = 80,
) -> None:
    """
    Resize an image to fit within bounds and convert to target format.
    
    Args:
        input_path: Path to the input image
        output_path: Path for the output file
        target_format: Target format (Format.Avif, Format.Jxl, etc.)
        max_width: Maximum width
        max_height: Maximum height
        quality: Encoding quality (0-100)
    """
    result = decode_file(input_path)
    
    options = PipelineOptions(
        format=target_format,
        quality=quality,
        resize=ResizeMode.fit(max_width, max_height),
    )
    
    output = convert(result.image, options)
    output.save(output_path)
    
    print(f"Resized and converted {input_path}")
    print(f"  Original: {result.image.width}x{result.image.height}")
    print(f"  Output: {output.width}x{output.height}")


def optimize_image(input_path: str, output_path: str, quality: int = 80) -> None:
    """
    Optimize an image by re-encoding at the given quality.
    
    Args:
        input_path: Path to the input image
        output_path: Path for the output file
        quality: Encoding quality (0-100)
    """
    with open(input_path, "rb") as f:
        data = f.read()
    
    from xlchemy_rust import optimize
    result = optimize(data, quality)
    result.save(output_path)
    
    print(f"Optimized {input_path}")
    print(f"  Original size: {len(data)} bytes")
    print(f"  Optimized size: {len(result.data)} bytes")
    print(f"  Reduction: {100 * (1 - len(result.data) / len(data)):.1f}%")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 3:
        print("Usage: python example_usage.py <input> <output> [quality]")
        print("Example: python example_usage.py input.png output.avif 80")
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    quality = int(sys.argv[3]) if len(sys.argv) > 3 else 80
    
    ext = output_path.lower().split(".")[-1]
    format_map = {
        "avif": Format.Avif,
        "jxl": Format.Jxl,
        "webp": Format.WebP,
        "jpg": Format.Jpeg,
        "jpeg": Format.Jpeg,
        "png": Format.Png,
    }
    
    if ext in format_map:
        result = decode_file(input_path)
        options = PipelineOptions(format=format_map[ext], quality=quality)
        output = convert(result.image, options)
        output.save(output_path)
        print(f"Converted {input_path} to {output_path}")
    else:
        print(f"Unknown format: {ext}")
