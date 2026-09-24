"""How many cores the thread count may be raised to.

``os.cpu_count()`` counts logical CPUs. On an Intel or AMD Mac every two of those
are SMT siblings of one core, so a batch that lines up one encoder thread per
logical CPU actually packs two threads onto each core and every file finishes
later. Apple Silicon has no SMT, so this only changes the ceiling where it is
wrong today.
"""

import functools
import logging
import os
import platform
import subprocess
from typing import NamedTuple

_LOGICAL = "hw.ncpu"
_PHYSICAL = "hw.physicalcpu"
_PERFORMANCE = "hw.perflevel0.physicalcpu"
_EFFICIENCY = "hw.perflevel1.physicalcpu"


class Topology(NamedTuple):
    logical: int
    physical: int
    performance: int      # 0 when the OS does not split the cores
    efficiency: int       # 0 when the OS does not split the cores


def _sysctl(names: tuple[str, ...]) -> dict[str, int]:
    """One spawn for the whole set. Unknown oids are simply absent."""
    try:
        proc = subprocess.run(
            ["sysctl", *names],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            timeout=5,
            text=True,
        )
    except (OSError, subprocess.SubprocessError) as e:
        logging.debug(f"[cpu_topology] sysctl failed. {e}")
        return {}

    values = {}
    for line in proc.stdout.splitlines():
        name, _, value = line.partition(":")
        try:
            parsed = int(value.strip())
        except ValueError:
            continue
        if parsed > 0:
            values[name.strip()] = parsed

    return values


@functools.lru_cache(maxsize=1)
def topology() -> Topology:
    logical = os.cpu_count() or 1

    if platform.system() == "Darwin":
        found = _sysctl((_LOGICAL, _PHYSICAL, _PERFORMANCE, _EFFICIENCY))
    else:
        found = {}

    perf = found.get(_PERFORMANCE, 0)
    eff = found.get(_EFFICIENCY, 0)
    physical = found.get(_PHYSICAL) or (perf + eff)

    if physical < 1:
        physical = logical
    physical = min(physical, logical)

    if perf or eff:
        logging.info(f"[cpu_topology] {logical} logical / {physical} physical cores ({perf}P + {eff}E)")
    else:
        logging.info(f"[cpu_topology] {logical} logical / {physical} physical cores")

    return Topology(logical=logical, physical=physical, performance=perf, efficiency=eff)


def coreCount() -> int:
    """Cores an encoder thread can have to itself."""
    return max(1, topology().physical)
