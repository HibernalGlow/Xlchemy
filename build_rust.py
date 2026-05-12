#!/usr/bin/env python3
"""Build script for xlchemy-rust Python bindings."""

import subprocess
import sys
import os

def main():
    print("Building xlchemy-rust Python bindings...")
    
    try:
        subprocess.run([sys.executable, "-m", "maturin", "develop", "--release"], check=True)
        print("\nBuild successful! The xlchemy_rust module is now available.")
    except subprocess.CalledProcessError as e:
        print(f"\nBuild failed with error: {e}")
        sys.exit(1)
    except FileNotFoundError:
        print("\nError: maturin not found. Please install it first:")
        print("  pip install maturin")
        sys.exit(1)

if __name__ == "__main__":
    main()
