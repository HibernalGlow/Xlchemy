import json
from unittest.mock import MagicMock, patch

from data.preset_manager import PresetManager


def test_full_preset_flow(tmp_path, monkeypatch):
    d = tmp_path / "presets"
    d.mkdir()
    monkeypatch.setattr("data.preset_manager.PRESETS_DIR", str(d))
    f = tmp_path / "default.json"
    monkeypatch.setattr("data.preset_manager.DEFAULT_PRESET_FILE", str(f))

    pm = PresetManager()

    all_settings = {
        "output": {
            "format": "AVIF",
            "quality": 60,
            "lossless": False,
            "effort": 7,
        },
        "settings": {
            "keep_if_larger": True,
            "avif_bit_depth": "10",
        },
        "modify": {
            "downscaling": {"enabled": True, "mode": "Percent", "percent": 50},
        },
    }

    pm.save("my_preset", all_settings)
    pm.setDefault("my_preset")

    loaded = pm.load("my_preset")
    assert loaded is not None

    assert loaded["output"]["format"] == "AVIF"
    assert loaded["output"]["quality"] == 60
    assert loaded["settings"]["keep_if_larger"] is True
    assert loaded["settings"]["avif_bit_depth"] == "10"
    assert loaded["modify"]["downscaling"]["enabled"] is True
    assert loaded["modify"]["downscaling"]["mode"] == "Percent"

    assert pm.getDefault() == "my_preset"


def test_apply_preset_handles_missing_output_key(tmp_path, monkeypatch):
    d = tmp_path / "presets"
    d.mkdir()
    monkeypatch.setattr("data.preset_manager.PRESETS_DIR", str(d))
    f = tmp_path / "default.json"
    monkeypatch.setattr("data.preset_manager.DEFAULT_PRESET_FILE", str(f))

    pm = PresetManager()

    old_preset = {
        "settings": {"keep_if_larger": True},
        "modify": {"downscaling": {"enabled": False}},
    }
    pm.save("old_preset", old_preset)

    loaded = pm.load("old_preset")
    assert loaded is not None

    output_data = loaded.get("output")
    settings_data = loaded.get("settings")
    modify_data = loaded.get("modify")

    assert output_data is None
    assert settings_data is not None
    assert modify_data is not None

    assert not output_data
    assert settings_data
    assert modify_data


def test_apply_preset_handles_empty_output_dict(tmp_path, monkeypatch):
    d = tmp_path / "presets"
    d.mkdir()
    monkeypatch.setattr("data.preset_manager.PRESETS_DIR", str(d))
    f = tmp_path / "default.json"
    monkeypatch.setattr("data.preset_manager.DEFAULT_PRESET_FILE", str(f))

    pm = PresetManager()

    preset_with_empty_output = {
        "output": {},
        "settings": {"keep_if_larger": True},
        "modify": {"downscaling": {"enabled": False}},
    }
    pm.save("empty_output", preset_with_empty_output)

    loaded = pm.load("empty_output")
    output_data = loaded.get("output")

    assert output_data is not None
    assert output_data == {}
    assert not output_data


def test_get_all_settings_includes_output():
    mock_output = MagicMock()
    mock_output.getSettings.return_value = {
        "format": "WebP",
        "quality": 90,
    }
    mock_settings = MagicMock()
    mock_settings.getSettings.return_value = {
        "keep_if_larger": False,
    }
    mock_modify = MagicMock()
    mock_modify.getSettings.return_value = {
        "downscaling": {"enabled": True},
    }

    all_settings = {
        "output": mock_output.getSettings(),
        "settings": mock_settings.getSettings(),
        "modify": mock_modify.getSettings(),
    }

    assert "output" in all_settings
    assert all_settings["output"]["format"] == "WebP"
    assert all_settings["output"]["quality"] == 90
    assert "settings" in all_settings
    assert "modify" in all_settings
