#!/usr/bin/env python3
"""Build script for xlchemy-rust Python bindings."""

import subprocess
import sys
import os

def main():
    print("Building xlchemy-rust Python bindings...")
    
    dav1d_path = os.path.join(os.path.dirname(os.path.dirname(os.path.realpath(__file__))), "prebuilt")
    pkgconfig_path = os.path.join(dav1d_path, "lib", "pkgconfig")
    bin_path = os.path.join(dav1d_path, "bin")
    
    pkgconf_path = r"D:\scoop\apps\pkgconf\current"
    if not os.path.exists(pkgconf_path):
        pkgconf_path = r"D:\scoop\apps\pkgconfiglite\current"
    if not os.path.exists(pkgconf_path):
        pkgconf_path = ""
    
    env = os.environ.copy()
    env["PKG_CONFIG_PATH"] = pkgconfig_path
    env["PKG_CONFIG_ALLOW_SYSTEM_CFLAGS"] = "1"
    if pkgconf_path:
        env["PATH"] = bin_path + ";" + pkgconf_path + ";" + env.get("PATH", "")
    else:
        env["PATH"] = bin_path + ";" + env.get("PATH", "")
    
    print(f"Setting PKG_CONFIG_PATH: {pkgconfig_path}")
    print(f"Adding to PATH: {bin_path}, {pkgconf_path}")
    
    try:
        subprocess.run([sys.executable, "-m", "maturin", "develop", "--release"], 
                      check=True, env=env)
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