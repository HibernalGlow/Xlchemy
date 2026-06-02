#!/usr/bin/env python3
"""
Xlchemy Conversion Speed Benchmark
Compares direct binary calls vs Python wrapper overhead for image conversion.

Usage:
    python scripts/bench_convert.py --iterations 5 --test-image tests/test_images/test.jpg
"""

import argparse
import os
import platform
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from statistics import mean, stdev

# --- Binary path resolution ---

def get_program_folder() -> Path:
    """Resolve the Xlchemy program folder containing bin/ directory."""
    # Check relative to script location
    script_dir = Path(__file__).resolve().parent.parent
    candidates = [
        script_dir,  # running from project root
        script_dir.parent,  # running from scripts/
    ]
    for candidate in candidates:
        if (candidate / "bin").exists():
            return candidate
        if (candidate / "prebuilt").exists():
            return candidate

    # Fallback: use the directory of the executable (xlchemy.exe)
    return script_dir


def get_binary_path(name: str) -> str:
    """Get the full path to a binary, or return name if on PATH."""
    folder = get_program_folder()
    system = platform.system().lower()

    path_map = {
        "windows": {
            "cjxl": "bin/win/libjxl/cjxl.exe",
            "djxl": "bin/win/libjxl/djxl.exe",
            "cjpegli": "bin/win/libjxl/cjpegli.exe",
            "avifenc": "bin/win/libavif/avifenc.exe",
            "avifdec": "bin/win/libavif/avifdec.exe",
            "magick": "bin/win/imagemagick/magick.exe",
            "oxipng": "bin/win/oxipng/oxipng.exe",
        },
        "linux": {
            "cjxl": "bin/linux/cjxl",
            "djxl": "bin/linux/djxl",
            "cjpegli": "bin/linux/cjpegli",
            "avifenc": "bin/linux/avifenc",
            "avifdec": "bin/linux/avifdec",
            "magick": "bin/linux/imagemagick/magick",
            "oxipng": "bin/linux/oxipng",
        },
        "darwin": {
            "cjxl": "bin/macos/cjxl",
            "djxl": "bin/macos/djxl",
            "cjpegli": "bin/macos/cjpegli",
            "avifenc": "bin/macos/libavif/avifenc",
            "avifdec": "bin/macos/libavif/avifdec",
            "magick": "bin/macos/imagemagick/magick",
            "oxipng": "bin/macos/oxipng",
        },
    }

    sys_key = "windows" if system == "windows" else ("darwin" if system == "darwin" else "linux")
    rel_path = path_map.get(sys_key, {}).get(name)

    if rel_path:
        full_path = folder / rel_path
        if full_path.exists():
            return str(full_path)

    # Fallback: try system PATH
    found = shutil.which(name)
    if found:
        return found

    return name  # Last resort


# --- Benchmark definitions ---

BENCHMARKS = [
    {
        "name": "JPEG XL (lossy)",
        "binary": "cjxl",
        "args": ["-q", "80", "--lossless_jpeg=0", "-e", "7", "--num_threads=4"],
        "ext": ".jxl",
    },
    {
        "name": "JPEG XL (lossless)",
        "binary": "cjxl",
        "args": ["-q", "100", "--lossless_jpeg=0", "-e", "7", "--num_threads=4"],
        "ext": ".jxl",
    },
    {
        "name": "AVIF (AOM AV1)",
        "binary": "avifenc",
        "args": ["-q", "80", "-s", "5", "-j", "4", "-c", "aom"],
        "ext": ".avif",
    },
    {
        "name": "AVIF (SVT-AV1-PSY)",
        "binary": "avifenc",
        "args": ["-q", "80", "-s", "5", "-j", "4", "-c", "svt", "-y", "420", "-a", "tune=4"],
        "ext": "_svt.avif",
    },
    {
        "name": "AVIF (slimg)",
        "binary": "avifenc",
        "args": ["-q", "80", "-s", "5", "-j", "4", "-c", "aom"],
        "ext": "_slimg.avif",
        "use_slimg": True,
    },
    {
        "name": "JPEG (JPEGLI)",
        "binary": "cjpegli",
        "args": ["-q", "80"],
        "ext": "_jpegli.jpg",
    },
    {
        "name": "WebP (lossy)",
        "binary": "magick",
        "args_after_input": True,
        "args": ["-quality", "80", "-define", "webp:thread-level=1", "-define", "webp:method=5"],
        "ext": ".webp",
    },
    {
        "name": "Lossless JXL Transcoding",
        "binary": "cjxl",
        "args": ["--lossless_jpeg=1", "-e", "7", "--num_threads=4"],
        "ext": "_lossless.jxl",
        "requires_jpeg": True,
    },
]


def run_once(binary: str, args: list[str], src: str, dst: str, args_after_input: bool = False) -> float:
    """Run a single conversion and return elapsed time in seconds."""
    if args_after_input:
        cmd = [binary, src] + args + [dst]
    else:
        cmd = [binary] + args + [src, dst]

    start = time.perf_counter()
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    elapsed = time.perf_counter() - start

    if result.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(cmd)}\nstderr: {result.stderr}")

    return elapsed


def run_benchmark(bench: dict, src: str, iterations: int, warmup: int = 2) -> dict:
    """Run a benchmark and return timing statistics."""
    binary = get_binary_path(bench["binary"])
    args = bench["args"]
    ext = bench["ext"]
    args_after_input = bench.get("args_after_input", False)
    requires_jpeg = bench.get("requires_jpeg", False)

    # Skip lossless JXL transcoding if input is not JPEG
    if requires_jpeg and not src.lower().endswith((".jpg", ".jpeg")):
        return {"name": bench["name"], "skipped": True, "reason": "Input is not JPEG"}

    # Check binary exists
    if not shutil.which(binary) and not Path(binary).exists():
        return {"name": bench["name"], "skipped": True, "reason": f"Binary not found: {bench['binary']}"}

    times = []

    with tempfile.TemporaryDirectory(prefix="xlchemy_bench_") as tmpdir:
        dst = os.path.join(tmpdir, f"output{ext}")

        # Warmup runs
        for _ in range(warmup):
            try:
                run_once(binary, args, src, dst, args_after_input)
            except RuntimeError:
                return {"name": bench["name"], "skipped": True, "reason": "Warmup failed"}
            os.remove(dst) if os.path.exists(dst) else None

        # Measured runs
        for i in range(iterations):
            try:
                t = run_once(binary, args, src, dst, args_after_input)
                times.append(t)
            except RuntimeError as e:
                return {"name": bench["name"], "skipped": True, "reason": str(e)}
            os.remove(dst) if os.path.exists(dst) else None

    result = {
        "name": bench["name"],
        "skipped": False,
        "iterations": iterations,
        "avg": mean(times),
        "min": min(times),
        "max": max(times),
    }
    if len(times) >= 2:
        result["stdev"] = stdev(times)
    return result


def run_python_benchmark(bench: dict, src: str, iterations: int, warmup: int = 2) -> dict:
    """Run a benchmark through the Python wrapper and return timing statistics."""
    project_root = str(get_program_folder())

    # Build a Python script that calls the Xlchemy Python wrapper
    bench_name = bench["name"]
    ext = bench["ext"]
    requires_jpeg = bench.get("requires_jpeg", False)

    if requires_jpeg and not src.lower().endswith((".jpg", ".jpeg")):
        return {"name": bench["name"] + " (Python)", "skipped": True, "reason": "Input is not JPEG"}

    # We'll call the binary through Python subprocess to measure wrapper overhead
    binary = get_binary_path(bench["binary"])
    args = bench["args"]
    args_after_input = bench.get("args_after_input", False)

    if not shutil.which(binary) and not Path(binary).exists():
        return {"name": bench["name"] + " (Python)", "skipped": True, "reason": f"Binary not found: {bench['binary']}"}

    # Use subprocess.Popen like the Python wrapper does
    times = []

    with tempfile.TemporaryDirectory(prefix="xlchemy_bench_py_") as tmpdir:
        dst = os.path.join(tmpdir, f"output{ext}")

        # Warmup
        for _ in range(warmup):
            try:
                if args_after_input:
                    cmd = [binary, src] + args + [dst]
                else:
                    cmd = [binary] + args + [src, dst]
                proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                proc.communicate(timeout=120)
                if proc.returncode != 0:
                    raise RuntimeError("Warmup failed")
            except Exception:
                return {"name": bench["name"] + " (Python)", "skipped": True, "reason": "Warmup failed"}
            os.remove(dst) if os.path.exists(dst) else None

        # Measured runs
        for _ in range(iterations):
            start = time.perf_counter()
            if args_after_input:
                cmd = [binary, src] + args + [dst]
            else:
                cmd = [binary] + args + [src, dst]
            proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            proc.communicate(timeout=120)
            elapsed = time.perf_counter() - start

            if proc.returncode != 0:
                return {"name": bench["name"] + " (Python)", "skipped": True, "reason": "Run failed"}
            times.append(elapsed)
            os.remove(dst) if os.path.exists(dst) else None

    result = {
        "name": bench["name"] + " (Python)",
        "skipped": False,
        "iterations": iterations,
        "avg": mean(times),
        "min": min(times),
        "max": max(times),
    }
    if len(times) >= 2:
        result["stdev"] = stdev(times)
    return result


def format_time(seconds: float) -> str:
    if seconds < 0.001:
        return f"{seconds * 1_000_000:.0f} µs"
    elif seconds < 1:
        return f"{seconds * 1000:.1f} ms"
    else:
        return f"{seconds:.3f} s"


def print_results(direct_results: list[dict], python_results: list[dict]):
    """Print a comparison table."""
    print("\n" + "=" * 80)
    print("Xlchemy Conversion Speed Benchmark Results")
    print("=" * 80)

    # Header
    print(f"\n{'Format':<30} {'Direct':>12} {'Python':>12} {'Delta':>10}")
    print("-" * 66)

    for d, p in zip(direct_results, python_results):
        name = d["name"]

        if d.get("skipped"):
            print(f"{name:<30} {'SKIPPED':>12} {'-':>12} {'-':>10}  ({d.get('reason', '')})")
            continue

        direct_avg = d["avg"]
        direct_str = format_time(direct_avg)

        if p.get("skipped"):
            print(f"{name:<30} {direct_str:>12} {'SKIPPED':>12} {'-':>10}")
            continue

        python_avg = p["avg"]
        python_str = format_time(python_avg)

        delta_pct = ((python_avg - direct_avg) / direct_avg) * 100 if direct_avg > 0 else 0
        delta_str = f"+{delta_pct:.1f}%" if delta_pct >= 0 else f"{delta_pct:.1f}%"

        print(f"{name:<30} {direct_str:>12} {python_str:>12} {delta_str:>10}")

    print("-" * 66)
    print("\nNote: 'Direct' uses subprocess.run(), 'Python' uses subprocess.Popen()")
    print("      Delta shows Python overhead relative to Direct call.\n")


def main():
    parser = argparse.ArgumentParser(description="Xlchemy Conversion Speed Benchmark")
    parser.add_argument(
        "--iterations", "-n", type=int, default=5,
        help="Number of iterations per benchmark (default: 5)"
    )
    parser.add_argument(
        "--test-image", "-i", type=str, default="tests/test_images/test.jpg",
        help="Path to test image (default: tests/test_images/test.jpg)"
    )
    parser.add_argument(
        "--warmup", "-w", type=int, default=2,
        help="Number of warmup runs (default: 2)"
    )
    parser.add_argument(
        "--python-only", action="store_true",
        help="Only run Python wrapper benchmarks"
    )
    parser.add_argument(
        "--direct-only", action="store_true",
        help="Only run direct binary benchmarks"
    )
    args = parser.parse_args()

    # Resolve test image path
    test_image = Path(args.test_image)
    if not test_image.is_absolute():
        test_image = Path.cwd() / test_image

    if not test_image.exists():
        print(f"Error: Test image not found: {test_image}")
        sys.exit(1)

    # Warn if test image is small
    file_size = test_image.stat().st_size
    if file_size < 100_000:
        print(f"Warning: Test image is only {file_size / 1024:.1f}KB. Results may not be representative.")
        print("         Consider using a larger image for more accurate benchmarks.")

    print(f"Test image: {test_image} ({file_size / 1024:.1f} KB)")
    print(f"Iterations: {args.iterations} (warmup: {args.warmup})")
    print(f"System: {platform.system()} {platform.release()} ({platform.machine()})")

    direct_results = []
    python_results = []

    for bench in BENCHMARKS:
        print(f"\nRunning: {bench['name']}...")

        if not args.python_only:
            result = run_benchmark(bench, str(test_image), args.iterations, args.warmup)
            direct_results.append(result)
            if not result.get("skipped"):
                print(f"  Direct: {format_time(result['avg'])} (±{format_time(result.get('stdev', 0))})")
            else:
                print(f"  Direct: SKIPPED ({result.get('reason', '')})")

        if not args.direct_only:
            result = run_python_benchmark(bench, str(test_image), args.iterations, args.warmup)
            python_results.append(result)
            if not result.get("skipped"):
                print(f"  Python: {format_time(result['avg'])} (±{format_time(result.get('stdev', 0))})")
            else:
                print(f"  Python: SKIPPED ({result.get('reason', '')})")

    if direct_results and python_results:
        print_results(direct_results, python_results)
    elif direct_results:
        print("\n--- Direct Binary Results ---")
        for r in direct_results:
            if r.get("skipped"):
                print(f"  {r['name']}: SKIPPED ({r.get('reason', '')})")
            else:
                print(f"  {r['name']}: {format_time(r['avg'])}")
    elif python_results:
        print("\n--- Python Wrapper Results ---")
        for r in python_results:
            if r.get("skipped"):
                print(f"  {r['name']}: SKIPPED ({r.get('reason', '')})")
            else:
                print(f"  {r['name']}: {format_time(r['avg'])}")


if __name__ == "__main__":
    main()
