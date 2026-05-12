"""Test xlchemy_rust with larger images to demonstrate parallel processing."""

import os
import time
import tempfile
from concurrent.futures import ThreadPoolExecutor
import xlchemy_rust


def create_test_image(output_path: str, size: int = 1024):
    """Create a larger test image using PIL."""
    from