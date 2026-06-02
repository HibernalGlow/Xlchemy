package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"sync"
)

// ConfigStore handles reading/writing settings and presets as JSON files.
type ConfigStore struct {
	mu sync.Mutex
}

func NewConfigStore() *ConfigStore {
	return &ConfigStore{}
}

func (cs *ConfigStore) ensureDir() {
	_ = os.MkdirAll(ConfigLocation, 0755)
	_ = os.MkdirAll(filepath.Join(ConfigLocation, "presets"), 0755)
}

func (cs *ConfigStore) configPath(name string) string {
	return filepath.Join(ConfigLocation, name+".json")
}

func (cs *ConfigStore) presetDir() string {
	return filepath.Join(ConfigLocation, "presets")
}

func (cs *ConfigStore) presetPath(name string) string {
	return filepath.Join(cs.presetDir(), name+".json")
}

// LoadSettings loads saved settings or returns defaults.
func (cs *ConfigStore) LoadSettings() (OutputSettings, ModifySettings, AppSettings) {
	cs.mu.Lock()
	defer cs.mu.Unlock()

	output := DefaultOutputSettings()
	modify := DefaultModifySettings()
	app := DefaultAppSettings()

	if data, err := os.ReadFile(cs.configPath("OutputTab")); err == nil {
		_ = json.Unmarshal(data, &output)
	}
	if data, err := os.ReadFile(cs.configPath("ModifyTab")); err == nil {
		_ = json.Unmarshal(data, &modify)
	}
	if data, err := os.ReadFile(cs.configPath("SettingsTab")); err == nil {
		_ = json.Unmarshal(data, &app)
	}

	return output, modify, app
}

// SaveSettings persists settings to disk.
func (cs *ConfigStore) SaveSettings(output OutputSettings, modify ModifySettings, app AppSettings) error {
	cs.mu.Lock()
	defer cs.mu.Unlock()
	cs.ensureDir()

	for _, pair := range []struct {
		name string
		data interface{}
	}{
		{"OutputTab", output},
		{"ModifyTab", modify},
		{"SettingsTab", app},
	} {
		b, err := json.MarshalIndent(pair.data, "", "  ")
		if err != nil {
			return err
		}
		if err := os.WriteFile(cs.configPath(pair.name), b, 0644); err != nil {
			return err
		}
	}
	return nil
}

// Preset holds all settings for a saved preset.
type Preset struct {
	Output OutputSettings `json:"output"`
	Modify ModifySettings `json:"modify"`
	App    AppSettings    `json:"app"`
}

// ListPresets returns the names of all saved presets.
func (cs *ConfigStore) ListPresets() []string {
	cs.mu.Lock()
	defer cs.mu.Unlock()

	entries, err := os.ReadDir(cs.presetDir())
	if err != nil {
		return nil
	}
	var names []string
	for _, e := range entries {
		if !e.IsDir() && filepath.Ext(e.Name()) == ".json" {
			names = append(names, e.Name()[:len(e.Name())-5])
		}
	}
	sort.Strings(names)
	return names
}

// SavePreset saves a preset to disk.
func (cs *ConfigStore) SavePreset(name string, preset Preset) error {
	cs.mu.Lock()
	defer cs.mu.Unlock()
	cs.ensureDir()

	b, err := json.MarshalIndent(preset, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(cs.presetPath(name), b, 0644)
}

// LoadPreset loads a preset by name.
func (cs *ConfigStore) LoadPreset(name string) (*Preset, error) {
	cs.mu.Lock()
	defer cs.mu.Unlock()

	data, err := os.ReadFile(cs.presetPath(name))
	if err != nil {
		return nil, err
	}
	var preset Preset
	if err := json.Unmarshal(data, &preset); err != nil {
		return nil, err
	}
	return &preset, nil
}

// DeletePreset removes a preset from disk.
func (cs *ConfigStore) DeletePreset(name string) error {
	cs.mu.Lock()
	defer cs.mu.Unlock()
	return os.Remove(cs.presetPath(name))
}

// GetDefaultPreset returns the name of the default preset (stored in a file).
func (cs *ConfigStore) GetDefaultPreset() string {
	cs.mu.Lock()
	defer cs.mu.Unlock()

	data, err := os.ReadFile(filepath.Join(cs.presetDir(), "_default"))
	if err != nil {
		return ""
	}
	return string(data)
}

// SetDefaultPreset sets the default preset name.
func (cs *ConfigStore) SetDefaultPreset(name string) error {
	cs.mu.Lock()
	defer cs.mu.Unlock()
	cs.ensureDir()
	return os.WriteFile(filepath.Join(cs.presetDir(), "_default"), []byte(name), 0644)
}
