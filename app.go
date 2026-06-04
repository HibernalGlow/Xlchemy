package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

// AppService is the main Wails service exposed to the frontend.
type AppService struct {
	config     *ConfigStore
	converting bool
	mu         sync.Mutex
	cancelFunc context.CancelFunc
}

func NewAppService() *AppService {
	return &AppService{
		config: NewConfigStore(),
	}
}

// GetConstants returns app constants (version, allowed inputs, etc.).
func (a *AppService) GetConstants() string {
	data := map[string]interface{}{
		"version":            Version,
		"allowedInput":       AllowedInput,
		"allowedResampling":  AllowedResampling,
		"allowedInputFilters": AllowedInputFilters,
		"jpegAliases":        JPEGAliases,
		"cpuCount":           runtime.NumCPU(),
		"updateCheckerEnabled": UpdateCheckerEnabled,
	}
	b, _ := json.Marshal(data)
	return string(b)
}

// GetTooltips returns all tooltip texts.
func (a *AppService) GetTooltips() string {
	b, _ := json.Marshal(getTooltips())
	return string(b)
}

// GetSettings loads persisted settings.
func (a *AppService) GetSettings() string {
	output, modify, app := a.config.LoadSettings()
	data := map[string]interface{}{
		"output": output,
		"modify": modify,
		"app":    app,
	}
	b, _ := json.Marshal(data)
	return string(b)
}

// SaveSettings persists all settings.
func (a *AppService) SaveSettings(settingsJSON string) error {
	var data struct {
		Output OutputSettings `json:"output"`
		Modify ModifySettings `json:"modify"`
		App    AppSettings    `json:"app"`
	}
	if err := json.Unmarshal([]byte(settingsJSON), &data); err != nil {
		return err
	}
	return a.config.SaveSettings(data.Output, data.Modify, data.App)
}

// ListPresets returns all preset names.
func (a *AppService) ListPresets() []string {
	return a.config.ListPresets()
}

// SavePreset saves a new preset.
func (a *AppService) SavePreset(name string, presetJSON string) error {
	var preset Preset
	if err := json.Unmarshal([]byte(presetJSON), &preset); err != nil {
		return err
	}
	return a.config.SavePreset(name, preset)
}

// LoadPreset loads a preset by name.
func (a *AppService) LoadPreset(name string) (string, error) {
	preset, err := a.config.LoadPreset(name)
	if err != nil {
		return "", err
	}
	b, _ := json.Marshal(preset)
	return string(b), nil
}

// DeletePreset removes a preset.
func (a *AppService) DeletePreset(name string) error {
	return a.config.DeletePreset(name)
}

// SetDefaultPreset sets the default preset.
func (a *AppService) SetDefaultPreset(name string) error {
	return a.config.SetDefaultPreset(name)
}

// GetDefaultPreset returns the default preset name.
func (a *AppService) GetDefaultPreset() string {
	return a.config.GetDefaultPreset()
}

// AddFiles validates and returns file items for the given paths.
func (a *AppService) AddFiles(paths []string) string {
	var items []FileItem
	seen := make(map[string]struct{})

	addFile := func(path string, info os.FileInfo) {
		if _, ok := seen[path]; ok {
			return
		}
		ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(path), "."))
		if !IsAllowedInput(ext) {
			return
		}
		items = append(items, FileItem{
			AbsPath: path,
			Name:    strings.TrimSuffix(filepath.Base(path), filepath.Ext(path)),
			Ext:     ext,
			Dir:     filepath.Dir(path),
			Size:    info.Size(),
		})
		seen[path] = struct{}{}
	}

	for _, p := range paths {
		info, err := os.Stat(p)
		if err != nil {
			continue
		}
		if info.IsDir() {
			_ = filepath.Walk(p, func(path string, info os.FileInfo, err error) error {
				if err != nil || info.IsDir() {
					return nil
				}
				addFile(path, info)
				return nil
			})
			continue
		}
		addFile(p, info)
	}
	b, _ := json.Marshal(items)
	return string(b)
}

// ScanDirectory recursively scans a directory for allowed images.
func (a *AppService) ScanDirectory(dirPath string) string {
	var items []FileItem
	seen := make(map[string]struct{})
	_ = filepath.Walk(dirPath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}
		if _, ok := seen[path]; ok {
			return nil
		}
		ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(path), "."))
		if IsAllowedInput(ext) {
			items = append(items, FileItem{
				AbsPath: path,
				Name:    strings.TrimSuffix(filepath.Base(path), filepath.Ext(path)),
				Ext:     ext,
				Dir:     filepath.Dir(path),
				Size:    info.Size(),
			})
			seen[path] = struct{}{}
		}
		return nil
	})
	b, _ := json.Marshal(items)
	return string(b)
}

// StartConversion begins a batch conversion (legacy API - delegates to plan-based execution).
func (a *AppService) StartConversion(itemsJSON string, outputJSON string, modifyJSON string, settingsJSON string, threadCount int) error {
	// Build an ExecutionPlan from legacy parameters and delegate
	var items []FileItem
	var output OutputSettings
	var modify ModifySettings
	var settings AppSettings

	if err := json.Unmarshal([]byte(itemsJSON), &items); err != nil {
		return fmt.Errorf("invalid items: %w", err)
	}
	if err := json.Unmarshal([]byte(outputJSON), &output); err != nil {
		return fmt.Errorf("invalid output settings: %w", err)
	}
	if err := json.Unmarshal([]byte(modifyJSON), &modify); err != nil {
		return fmt.Errorf("invalid modify settings: %w", err)
	}
	if err := json.Unmarshal([]byte(settingsJSON), &settings); err != nil {
		return fmt.Errorf("invalid app settings: %w", err)
	}

	// Build toolchain from known constants
	toolchain := ToolchainPaths{
		CJXLPath:        CJXlPath,
		DJXLPath:        DJXlPath,
		AvifEncPath:     AvifEncPath,
		AvifDecPath:     AvifDecPath,
		CJPEGLIPath:     CJPEGLIPath,
		ImageMagickPath: ImageMagickPath,
		ExifToolPath:    ExifToolPath,
		OxiPNGPath:      OxiPNGPath,
	}

	// Build plan
	plan := buildLegacyPlan(items, output, modify, settings, toolchain)
	planJSON, _ := json.Marshal(plan)

	return a.RunConversionPlan(string(planJSON), threadCount)
}

// RunConversionPlan executes a frontend-generated ExecutionPlan.
func (a *AppService) RunConversionPlan(planJSON string, threadCount int) error {
	a.mu.Lock()
	if a.converting {
		a.mu.Unlock()
		return fmt.Errorf("conversion already in progress")
	}
	a.converting = true
	a.mu.Unlock()

	var plan ExecutionPlan
	if err := json.Unmarshal([]byte(planJSON), &plan); err != nil {
		a.mu.Lock()
		a.converting = false
		a.mu.Unlock()
		return fmt.Errorf("invalid execution plan: %w", err)
	}

	// Reset state
	GlobalTaskStatus.Reset()
	GlobalProcessManager.Clear()

	ctx, cancel := context.WithCancel(context.Background())
	a.mu.Lock()
	a.cancelFunc = cancel
	a.mu.Unlock()

	// Emit started event
	App.Event.Emit("conversion:started", struct{}{})

	// Run conversion in a goroutine
	go func() {
		defer func() {
			cancel()
			a.mu.Lock()
			a.converting = false
			a.mu.Unlock()
		}()

		runExecutionPlan(ctx, plan, threadCount)

		if GlobalTaskStatus.WasCanceled() {
			App.Event.Emit("conversion:canceled", struct{}{})
		} else {
			App.Event.Emit("conversion:finished", struct{}{})
		}
	}()

	return nil
}

// buildLegacyPlan constructs an ExecutionPlan from legacy settings for backward compatibility.
func buildLegacyPlan(items []FileItem, output OutputSettings, modify ModifySettings, settings AppSettings, toolchain ToolchainPaths) ExecutionPlan {
	// This is a shim: the frontend now generates plans directly.
	// We construct a minimal plan that preserves old behavior.
	return ExecutionPlan{
		RunID:     "legacy",
		Items:     items,
		Tasks:     []ExecutionTask{}, // Tasks would be built here if needed
		Policies:  ResultPolicy{},
		Toolchain: toolchain,
	}
}

// CancelConversion cancels an ongoing conversion.
func (a *AppService) CancelConversion() {
	GlobalTaskStatus.Cancel()
	GlobalProcessManager.TerminateAll()
	a.mu.Lock()
	if a.cancelFunc != nil {
		a.cancelFunc()
	}
	a.mu.Unlock()
}

// IsConverting returns whether conversion is in progress.
func (a *AppService) IsConverting() bool {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.converting
}

// GetCPUCount returns the number of CPU cores.
func (a *AppService) GetCPUCount() int {
	return runtime.NumCPU()
}

// CheckForUpdates checks for a newer version.
func (a *AppService) CheckForUpdates() string {
	if !UpdateCheckerEnabled {
		return `{"available": false}`
	}

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(UpdateCheckerURL)
	if err != nil {
		return `{"available": false, "error": "network error"}`
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return `{"available": false, "error": "read error"}`
	}

	var remote struct {
		Version string `json:"version"`
		URL     string `json:"url"`
	}
	if err := json.Unmarshal(body, &remote); err != nil {
		return `{"available": false, "error": "parse error"}`
	}

	available := compareVersions(Version, remote.Version) < 0
	result := map[string]interface{}{
		"available":      available,
		"currentVersion": Version,
		"remoteVersion":  remote.Version,
		"url":            remote.URL,
	}
	b, _ := json.Marshal(result)
	return string(b)
}

// compareVersions returns -1 if a < b, 0 if equal, 1 if a > b.
func compareVersions(a, b string) int {
	partsA := strings.Split(a, ".")
	partsB := strings.Split(b, ".")
	maxLen := len(partsA)
	if len(partsB) > maxLen {
		maxLen = len(partsB)
	}
	for i := 0; i < maxLen; i++ {
		var va, vb int
		if i < len(partsA) {
			fmt.Sscanf(partsA[i], "%d", &va)
		}
		if i < len(partsB) {
			fmt.Sscanf(partsB[i], "%d", &vb)
		}
		if va < vb {
			return -1
		}
		if va > vb {
			return 1
		}
	}
	return 0
}
