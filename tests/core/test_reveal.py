import os

import pytest

from core.reveal import build_reveal_command, reveal


def test_darwin_uses_open_dash_capital_R():
    assert build_reveal_command("/tmp/a.png", system="Darwin") == ("open", "-R", "/tmp/a.png")


def test_windows_uses_explorer_select_with_backslashes():
    cmd = build_reveal_command(r"C:/Users/me/a.png", system="Windows")
    assert cmd[0] == "explorer"
    assert cmd[1] == "/select,"
    assert "/" not in cmd[2]
    assert cmd[2].endswith(r"a.png")


def test_linux_falls_back_to_the_containing_folder():
    cmd = build_reveal_command("/tmp/deep/a.png", system="Linux")
    assert cmd[0] == "xdg-open"
    assert os.path.basename(cmd[1]) == "deep"


def test_unknown_platform_raises():
    with pytest.raises(ValueError):
        build_reveal_command("/tmp/a.png", system="Plan9")


def test_missing_file_is_reported_not_raised(tmp_path):
    ok, msg = reveal(str(tmp_path / "nope.png"), system="Darwin")
    assert ok is False
    assert "not found" in msg.lower()


def test_reveal_runs_the_built_command(tmp_path, monkeypatch):
    target = tmp_path / "a.png"
    target.write_bytes(b"x")
    seen = {}

    def fake_run(cmd, **kwargs):
        seen["cmd"] = cmd
        seen["kwargs"] = kwargs

    monkeypatch.setattr("core.reveal.subprocess.run", fake_run)
    ok, msg = reveal(str(target), system="Darwin")
    assert (ok, msg) == (True, "")
    assert seen["cmd"] == ("open", "-R", str(target))


def test_reveal_reports_a_failing_file_manager(tmp_path, monkeypatch):
    target = tmp_path / "a.png"
    target.write_bytes(b"x")

    def boom(cmd, **kwargs):
        raise OSError("no file manager here")

    monkeypatch.setattr("core.reveal.subprocess.run", boom)
    ok, msg = reveal(str(target), system="Linux")
    assert ok is False
    assert "file manager" in msg.lower()
