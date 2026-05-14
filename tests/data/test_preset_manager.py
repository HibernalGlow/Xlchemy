import os
import json
import shutil
import tempfile

import pytest

from data.preset_manager import PresetManager


@pytest.fixture
def preset_dir(tmp_path, monkeypatch):
    d = tmp_path / "presets"
    d.mkdir()
    monkeypatch.setattr("data.preset_manager.PRESETS_DIR", str(d))
    return d


@pytest.fixture
def pm(preset_dir):
    return PresetManager()


def test_list_presets_empty(pm):
    assert pm.listPresets() == []


def test_save_and_list(pm):
    pm.save("test", {"output": {"format": "AVIF"}})
    assert pm.listPresets() == ["test"]


def test_save_multiple_sorted(pm):
    pm.save("beta", {"output": {}})
    pm.save("alpha", {"output": {}})
    assert pm.listPresets() == ["alpha", "beta"]


def test_load(pm):
    data = {"output": {"format": "JPEG XL", "quality": 80}}
    pm.save("my_preset", data)
    loaded = pm.load("my_preset")
    assert loaded == data


def test_load_nonexistent(pm):
    assert pm.load("missing") is None


def test_delete(pm):
    pm.save("to_delete", {"output": {}})
    assert pm.exists("to_delete")
    pm.delete("to_delete")
    assert not pm.exists("to_delete")
    assert pm.listPresets() == []


def test_delete_nonexistent(pm):
    assert pm.delete("ghost") is True


def test_exists(pm):
    assert not pm.exists("nope")
    pm.save("yep", {"output": {}})
    assert pm.exists("yep")


def test_overwrite(pm):
    pm.save("dup", {"output": {"format": "AVIF"}})
    pm.save("dup", {"output": {"format": "WebP"}})
    loaded = pm.load("dup")
    assert loaded["output"]["format"] == "WebP"


def test_load_corrupt_json(preset_dir, pm):
    path = os.path.join(str(preset_dir), "bad.json")
    with open(path, "w") as f:
        f.write("{invalid json")
    assert pm.load("bad") is None


def test_save_data_integrity(pm, preset_dir):
    data = {
        "output": {"format": "JPEG XL", "quality": 80, "lossless": True},
        "settings": {"keep_if_larger": True},
        "modify": {"downscaling": {"enabled": False}},
    }
    pm.save("full", data)
    path = os.path.join(str(preset_dir), "full.json")
    with open(path, "r", encoding="utf-8") as f:
        saved = json.load(f)
    assert saved == data
