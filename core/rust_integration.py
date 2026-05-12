"""
Integration module for using xlchemy_rust in Xlchemy's core functionality.

This module provides a bridge between Xlchemy's existing architecture
and the high-performance Rust bindings.
"""

import logging
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

try:
    from xlchemy_rust import (
        Format,
        decode_file as rust_decode_file,
        decode as rust_decode,
        convert as rust_convert,
        optimize as rust_optimize,
        PipelineOptions,
        ResizeMode,
        format_from_extension,
        format_from_magic_bytes,
    )
    RUST_AVAILABLE = True
except ImportError:
    RUST_AVAILABLE = False
    logger.warning("xlchemy_rust not available. Using fallback implementations.")


FORMAT_MAP = {
    "jpg": Format.Jpeg if RUST_AVAILABLE else None,
    "jpeg": Format.Jpeg if RUST_AVAILABLE else None,
    "png": Format.Png if RUST_AVAILABLE else None,
    "webp": Format.WebP if RUST_AVAILABLE else None,
    "avif": Format.Avif if RUST_AVAILABLE else None,
    "jxl": Format.Jxl if RUST_AVAILABLE else None,
    "qoi": Format.Qoi if RUST_AVAILABLE else None,
}


def is_rust_available() -> bool:
    """Check if Rust bindings are available."""
    return RUST_AVAILABLE


def get_format_from_extension(ext: str) -> Optional[Format]:
    """Get Format enum from file extension."""
    if not RUST_AVAILABLE:
        return None
    return FORMAT_MAP.get(ext.lower())


def convert_with_rust(
    input_path: str,
    output_path: str,
    target_format: str,
    quality: int = 80,
    max_width: Optional[int] = None,
    max_height: Optional[int] = None,
) -> Tuple[bool, str]:
    """
    Convert an image using Rust bindings.
    
    Args:
        input_path: Path to input image
        output_path: Path for output image
        target_format: Target format (avif, jxl, webp, jpg, png)
        quality: Encoding quality (0-100)
        max_width: Optional max width for resizing
        max_height: Optional max height for resizing
    
    Returns:
        Tuple of (success, message)
    """
    if not RUST_AVAILABLE:
        return False, "Rust bindings not available"
    
    target = get_format_from_extension(target_format)
    if target is None:
        return False, f"Unsupported format: {target_format}"
    
    try:
        result = rust_decode_file(input_path)
        
        resize_mode = None
        if max_width and max_height:
            resize_mode = ResizeMode.fit(max_width, max_height)
        elif max_width:
            resize_mode = ResizeMode.width(max_width)
        elif max_height:
            resize_mode = ResizeMode.height(max_height)
        
        options = PipelineOptions(
            format=target,
            quality=quality,
            resize=resize_mode,
        )
        
        output = rust_convert(result.image, options)
        output.save(output_path)
        
        return True, f"Converted to {target_format}: {output.width}x{output.height}"
    
    except Exception as e:
        logger.error(f"Rust conversion failed: {e}")
        return False, str(e)


def optimize_with_rust(
    input_path: str,
    output_path: str,
    quality: int = 80,
) -> Tuple[bool, str]:
    """
    Optimize an image using Rust bindings.
    
    Args:
        input_path: Path to input image
        output_path: Path for output image
        quality: Encoding quality (0-100)
    
    Returns:
        Tuple of (success, message)
    """
    if not RUST_AVAILABLE:
        return False, "Rust bindings not available"
    
    try:
        with open(input_path, "rb") as f:
            data = f.read()
        
        result = rust_optimize(data, quality)
        result.save(output_path)
        
        original_size = len(data)
        new_size = len(result.data)
        reduction = 100 * (1 - new_size / original_size)
        
        return True, f"Optimized: {original_size} -> {new_size} bytes ({reduction:.1f}% reduction)"
    
    except Exception as e:
        logger.error(f"Rust optimization failed: {e}")
        return False, str(e)


def decode_image_info(input_path: str) -> Optional[Tuple[int, int, str]]:
    """
    Get image dimensions and format using Rust bindings.
    
    Args:
        input_path: Path to image
    
    Returns:
        Tuple of (width, height, format_name) or None on failure
    """
    if not RUST_AVAILABLE:
        return None
    
    try:
        result = rust_decode_file(input_path)
        format_name = str(result.format)
        return (result.image.width, result.image.height, format_name)
    
    except Exception as e:
        logger.error(f"Failed to decode image info: {e}")
        return None
