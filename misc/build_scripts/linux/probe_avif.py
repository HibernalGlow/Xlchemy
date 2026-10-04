#!/usr/bin/env python3
"""Diagnostic: run the app's own AVIF decode dispatch and print what really happens.

test_convert.py's test_avif_decode only asserts that the output folder is non-empty, so
when it fails the CI log shows nothing about *why*. This script goes through the same
functions core/worker.py uses for a PNG target (getDecoder -> getDecoderArgs -> runBinary)
and prints the resolved paths, the argument list, and any exception.

It always exits 0: it is a diagnostic, not a gate.
"""

import os
import sys
import traceback

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


def main() -> None:
    sample = os.path.join("tests", "test_images", "test.jpg")
    if not os.path.isfile(sample):
        print(f"[probe] no sample at {sample}; skipping")
        return

    try:
        from data.constants import AVIFENC_PATH
        from core.convert import (
            getDecoder,
            getDecoderArgs,
            getImageRes,
            runBinary,
        )
    except Exception:
        print("[probe] cannot import the decode path:")
        traceback.print_exc()
        return

    avif = "/tmp/xlc_probe_app.avif"
    png = "/tmp/xlc_probe_app.png"

    print(f"[probe] encoder={AVIFENC_PATH}")
    try:
        runBinary(AVIFENC_PATH, ["-q", "60"], os.path.abspath(sample), avif)
        print(f"[probe] encode ok, size={os.path.getsize(avif)}")
    except Exception:
        print("[probe] encode raised:")
        traceback.print_exc()
        return

    decoder = getDecoder("avif")
    args = getDecoderArgs(decoder, 4)
    print(f"[probe] decoder={decoder} args={args}")
    print(f"[probe] getImageRes={getImageRes(avif)}")

    try:
        stdout, stderr = runBinary(decoder, args, os.path.abspath(avif), png)
        print(f"[probe] runBinary ok stdout={stdout!r} stderr={stderr!r}")
    except Exception:
        print("[probe] runBinary raised:")
        traceback.print_exc()

    print(f"[probe] output exists={os.path.isfile(png)}")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
    sys.exit(0)
