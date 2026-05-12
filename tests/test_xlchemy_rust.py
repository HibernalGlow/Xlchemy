"""Test xlchemy_rust image conversion functionality."""

import os
import pytest
import xlchemy_rust


def test_module_import():
    """Test that xlchemy_rust module can be imported."""
    assert xlchemy_rust is not None
    assert hasattr(xlchemy_rust, 'Format')
    assert hasattr(xlchemy_rust, 'decode_file')
    assert hasattr(xlchemy_rust, 'convert')


def test_format_avif():
    """Test that AVIF format is available."""
    assert hasattr(xlchemy_rust.Format, 'Avif')
    avif_format = xlchemy_rust.Format.Avif
    assert avif_format is not None
    assert avif_format.extension() == 'avif'


def create_test_jpg(output_path: str):
    """Create a simple test JPG image using PIL."""
    from PIL import Image
    img = Image.new('RGB', (100, 100), color='red')
    img.save(output_path, format='JPEG')
    return output_path


def test_jpg_to_avif_conversion(tmp_path):
    """Test converting JPG to AVIF using xlchemy_rust."""
    # Create a test JPG
    input_path = str(tmp_path / 'test_input.jpg')
    create_test_jpg(input_path)
    assert os.path.exists(input_path)
    
    # Convert to AVIF
    output_path = str(tmp_path / 'test_output.avif')
    
    # Decode the JPG
    decode_result = xlchemy_rust.decode_file(input_path)
    assert decode_result is not None
    assert decode_result.image is not None
    assert decode_result.format is not None
    
    # Convert to AVIF
    options = xlchemy_rust.PipelineOptions(
        format=xlchemy_rust.Format.Avif,
        quality=80
    )
    convert_result = xlchemy_rust.convert(decode_result.image, options)
    
    # Verify result
    assert convert_result is not None
    assert convert_result.data is not None
    assert len(convert_result.data) > 0
    assert convert_result.format == xlchemy_rust.Format.Avif
    
    # Save the result
    convert_result.save(output_path)
    assert os.path.exists(output_path)
    assert os.path.getsize(output_path) > 0
    
    print(f"Successfully converted JPG to AVIF!")
    print(f"Input size: {os.path.getsize(input_path)} bytes")
    print(f"Output size: {os.path.getsize(output_path)} bytes")


def test_optimize_jpg(tmp_path):
    """Test optimizing a JPG image."""
    # Create a test JPG
    input_path = str(tmp_path / 'test_optimize.jpg')
    create_test_jpg(input_path)
    
    # Read the file data
    with open(input_path, 'rb') as f:
        data = f.read()
    
    # Optimize
    result = xlchemy_rust.optimize(data, 80)
    assert result is not None
    assert result.data is not None
    assert len(result.data) > 0
    
    print(f"Successfully optimized JPG!")
    print(f"Original size: {len(data)} bytes")
    print(f"Optimized size: {len(result.data)} bytes")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
