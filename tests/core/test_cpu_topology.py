"""core.cpu_topology: what the thread ceiling is built from."""

import subprocess
from contextlib import ExitStack, contextmanager
from unittest.mock import patch

import pytest

import core.cpu_topology as cpu_topology


class Completed:
    def __init__(self, stdout):
        self.stdout = stdout


def sysctlOutput(ncpu=None, physicalcpu=None, perf=None, eff=None):
    lines = []
    for name, value in (
        ("hw.ncpu", ncpu),
        ("hw.physicalcpu", physicalcpu),
        ("hw.perflevel0.physicalcpu", perf),
        ("hw.perflevel1.physicalcpu", eff),
    ):
        if value is not None:
            lines.append(f"{name}: {value}")

    return "\n".join(lines) + ("\n" if lines else "")


@contextmanager
def env(logical, system="Darwin", stdout=None, run=None):
    """Patches the three outside facts topology() reads."""
    if run is None:
        run = lambda *args, **kwargs: Completed(stdout or "")

    with ExitStack() as stack:
        stack.enter_context(patch("core.cpu_topology.platform.system", return_value=system))
        stack.enter_context(patch("core.cpu_topology.os.cpu_count", return_value=logical))
        yield stack.enter_context(patch("core.cpu_topology.subprocess.run", side_effect=run))


@pytest.fixture(autouse=True)
def uncached():
    cpu_topology.topology.cache_clear()
    yield
    cpu_topology.topology.cache_clear()


def test_apple_silicon_reports_the_p_e_split():
    with env(10, stdout=sysctlOutput(10, 10, 4, 6)):
        assert cpu_topology.topology() == (10, 10, 4, 6)
        assert cpu_topology.coreCount() == 10


def test_names_come_from_a_single_spawn():
    with env(10, stdout=sysctlOutput(10, 10, 4, 6)) as run:
        cpu_topology.topology()
        cpu_topology.topology()
        cpu_topology.coreCount()

    run.assert_called_once_with(
        ["sysctl", "hw.ncpu", "hw.physicalcpu", "hw.perflevel0.physicalcpu", "hw.perflevel1.physicalcpu"],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        timeout=5,
        text=True,
    )


def test_smt_machine_is_counted_in_cores_not_threads():
    with env(8, stdout=sysctlOutput(8, 4)):
        assert cpu_topology.topology() == (8, 4, 0, 0)
        assert cpu_topology.coreCount() == 4


def test_physical_count_is_derived_from_the_perf_levels():
    with env(10, stdout=sysctlOutput(10, None, 4, 6)):
        assert cpu_topology.topology() == (10, 10, 4, 6)


def test_nonsense_output_falls_back_to_logical():
    with env(6, stdout="sysctl: unknown oid 'hw.physicalcpu'\nhw.ncpu: twelve\n"):
        assert cpu_topology.topology() == (6, 6, 0, 0)


def test_missing_sysctl_falls_back_to_logical():
    def raiseOSError(*args, **kwargs):
        raise OSError("no sysctl")

    with env(6, run=raiseOSError):
        assert cpu_topology.coreCount() == 6


def test_physical_never_exceeds_logical():
    with env(4, stdout=sysctlOutput(4, 99)):
        assert cpu_topology.topology() == (4, 4, 0, 0)


def test_other_platforms_do_not_call_sysctl():
    def mustNotSpawn(*args, **kwargs):
        raise AssertionError("sysctl must not be read off Darwin")

    with env(12, system="Linux", run=mustNotSpawn):
        assert cpu_topology.topology() == (12, 12, 0, 0)
        assert cpu_topology.coreCount() == 12


def test_unreadable_cpu_count_still_offers_one_thread():
    with env(None, system="Linux"):
        assert cpu_topology.coreCount() == 1
