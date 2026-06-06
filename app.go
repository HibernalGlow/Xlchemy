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
	if snapshot, err := a.config.LoadAppState(); err == nil && snapshot != nil {
		b, _ := json.Marshal(snapshot)
		return string(b)
	}

	output, modify, app := a.config.LoadSettings()
	data := map[string]interface{}{
		"domain": map[string]interface{}{
			"output": output,
			"modify": modify,
			"app":    app,
		},
	}
	b, _ := json.Marshal(data)
	return string(b)
}

// SaveSettings persists all settings.
func (a *AppService) SaveSettings(settingsJSON string) error {
	return a.config.SaveAppState(json.RawMessage(settingsJSON))
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

	addFile := func(path string, info os.FileInfo, anchorPath string) {
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
			AnchorPath: anchorPath,
		})
		seen[path] = struct{}{}
	}

	for _, p := range paths {
		info, err := os.Stat(p)
		if err != nil {
			continue
		}
		if info.IsDir() {
			anchorPath := p
			_ = filepath.Walk(p, func(path string, info os.FileInfo, err error) error {
				if err != nil || info.IsDir() {
					return nil
				}
				addFile(path, info, anchorPath)
				return nil
			})
			continue
		}
		addFile(p, info, filepath.Dir(p))
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
				AnchorPath: dirPath,
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
	GlobalUniquePathStore.Clear()

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

		if plan.Spec != nil {
			runConversion(ctx, plan.Items, plan.Spec.Output, plan.Spec.Modify, plan.Spec.App, threadCount)
		} else {
			runExecutionPlan(ctx, plan, threadCount)
		}

		if GlobalTaskStatus.WasCanceled() {
			App.Event.Emit("conversion:canceled", struct{}{})
		} else {
			App.Event.Emit("conversion:finished", struct{}{})
		}
	}()

	return nil
}

// buildLegacyPlan constructs an ExecutionPlan from legacy settings for backward compatibility.
// Mirrors frontend conversionOrchestrator.ts logic.
func buildLegacyPlan(items []FileItem, output OutputSettings, modify ModifySettings, settings AppSettings, toolchain ToolchainPaths) ExecutionPlan {
	policies := ResultPolicy{
		KeepIfLarger:     settings.KeepIfLarger,
		CopyIfLarger:     settings.CopyIfLarger,
		DeleteOriginal:   output.DeleteOriginal,
		DeleteOriginalMode: output.DeleteOriginalMode,
		KeepTimestamps:   modify.Misc.KeepTimestamps,
		IfFileExists:     output.IfFileExists,
	}

	threads := runtime.NumCPU()

	var tasks []ExecutionTask
	for _, item := range items {
		outputDir := item.Dir
		if output.CustomOutputDir && output.CustomOutputDirPath != "" {
			if output.KeepDirStruct {
				outputDir = filepath.Join(output.CustomOutputDirPath, item.Dir)
			} else {
				outputDir = output.CustomOutputDirPath
			}
		}
		outputExt := GetExtension(output.Format)
		if output.Format == "Lossless JPEG Transcoding" {
			outputExt = "jxl"
		}
		finalOutput := filepath.Join(outputDir, item.Name+"."+outputExt)

		// Step 1: Downscale
		currentInput := item.AbsPath
		if modify.Downscaling.Enabled {
			dsTask := buildDownscaleTask(item, modify, toolchain, threads)
			if dsTask != nil {
				tasks = append(tasks, *dsTask)
				currentInput = dsTask.OutputPath
			}
		}

		// Step 2: Encode
		encTask := buildEncodeTask(item, currentInput, finalOutput, output, modify, settings, toolchain, threads)
		tasks = append(tasks, encTask)

		// Step 3: Metadata
		if strings.HasPrefix(modify.Misc.KeepMetadata, "ExifTool") {
			metaTask := buildMetadataTask(item, finalOutput, modify, settings, toolchain)
			if metaTask != nil {
				tasks = append(tasks, *metaTask)
			}
		}
	}

	return ExecutionPlan{
		RunID:     "legacy",
		Items:     items,
		Tasks:     tasks,
		Policies:  policies,
		Toolchain: toolchain,
	}
}

func buildDownscaleTask(item FileItem, modify ModifySettings, toolchain ToolchainPaths, threads int) *ExecutionTask {
	ds := modify.Downscaling
	if !ds.Enabled {
		return nil
	}

	args := make([]string, 0, 4)
	if ds.Resample != "Default" {
		args = append(args, "-filter", ds.Resample)
	}

	switch ds.Mode {
	case "Resolution":
		if ds.Width > 0 && ds.Height > 0 {
			args = append(args, "-resize", fmt.Sprintf("%dx%d>", ds.Width, ds.Height))
		} else if ds.Width > 0 {
			args = append(args, "-resize", fmt.Sprintf("%dx>", ds.Width))
		} else if ds.Height > 0 {
			args = append(args, "-resize", fmt.Sprintf("x%d>", ds.Height))
		}
	case "Percent":
		args = append(args, "-resize", fmt.Sprintf("%.0f%%", ds.Percent))
	case "Shortest Side":
		if ds.ShortestSide > 0 {
			args = append(args, "-resize", fmt.Sprintf("%dx%d^>", ds.ShortestSide, ds.ShortestSide))
		}
	case "Longest Side":
		if ds.LongestSide > 0 {
			args = append(args, "-resize", fmt.Sprintf("%dx%d>", ds.LongestSide, ds.LongestSide))
		}
	case "Megapixels":
		mpx := int(ds.Megapixels * 1000000)
		if mpx > 0 {
			args = append(args, "-resize", fmt.Sprintf("%d@>", mpx))
		}
	case "File Size":
		if ds.FileSize > 0 {
			args = append(args, "-resize", "50%")
		}
	default:
		return nil
	}

	outputPath := item.AbsPath + ".downscaled_legacy"
	return &ExecutionTask{
		ID:         fmt.Sprintf("ds-%s", item.AbsPath),
		InputPath:  item.AbsPath,
		OutputPath: outputPath,
		Command:    toolchain.ImageMagickPath,
		Args:       append(args, item.AbsPath, outputPath),
		StepType:   "downscale",
	}
}

func buildEncodeTask(item FileItem, inputPath, outputPath string, output OutputSettings, modify ModifySettings, settings AppSettings, toolchain ToolchainPaths, threads int) ExecutionTask {
	switch output.Format {
	case "JPEG XL":
		return buildJXLTask(item, inputPath, outputPath, output, modify, settings, toolchain, threads)
	case "AVIF":
		return buildAVIFTask(item, inputPath, outputPath, output, modify, settings, toolchain, threads)
	case "JPEG":
		return buildJPEGTask(item, inputPath, outputPath, output, modify, settings, toolchain, threads)
	case "WebP":
		return buildWebPTask(item, inputPath, outputPath, output, modify, settings, toolchain, threads)
	case "PNG":
		return buildPNGTask(item, inputPath, outputPath, output, modify, settings, toolchain, threads)
	case "Lossless JPEG Transcoding":
		return buildLosslessJXLTask(item, inputPath, outputPath, output, settings, toolchain, threads)
	case "JPEG Reconstruction":
		return buildJPEGReconstructionTask(item, inputPath, outputPath, settings, toolchain, threads)
	default:
		panic(fmt.Sprintf("Unknown format: %s", output.Format))
	}
}

func buildJXLTask(item FileItem, inputPath, outputPath string, output OutputSettings, modify ModifySettings, settings AppSettings, toolchain ToolchainPaths, threads int) ExecutionTask {
	args := make([]string, 0, 10)
	if output.Lossless {
		args = append(args, "-q", "100")
		if settings.JXLAutolosslessJPEG && IsJPEGAlias(item.Ext) {
			args = append(args, "--lossless_jpeg=1")
		} else {
			args = append(args, "--lossless_jpeg=0")
		}
	} else {
		args = append(args, "-q", fmt.Sprintf("%d", output.Quality))
		args = append(args, "--lossless_jpeg=0")
	}
	args = append(args, "-e", fmt.Sprintf("%d", output.Effort))
	args = append(args, "--num_threads", fmt.Sprintf("%d", threads))
	if !output.Lossless && settings.JXLLossyModular {
		args = append(args, "--modular=1")
	}
	args = append(args, getMetadataArgs(toolchain.CJXLPath, modify.Misc.KeepMetadata, output.Lossless && IsJPEGAlias(item.Ext))...)
	if settings.EnableCustomArgs && settings.CJXLArgs != "" {
		args = append(args, strings.Fields(settings.CJXLArgs)...)
	}
	return ExecutionTask{
		ID:         fmt.Sprintf("enc-%s", item.AbsPath),
		InputPath:  inputPath,
		OutputPath: outputPath,
		Command:    toolchain.CJXLPath,
		Args:       append(args, inputPath, outputPath),
		StepType:   "encode",
	}
}

func buildAVIFTask(item FileItem, inputPath, outputPath string, output OutputSettings, modify ModifySettings, settings AppSettings, toolchain ToolchainPaths, threads int) ExecutionTask {
	if settings.AvifEncoder == "slimg" {
		return ExecutionTask{
			ID:         fmt.Sprintf("enc-%s", item.AbsPath),
			InputPath:  inputPath,
			OutputPath: outputPath,
			Command:    "slimg",
			Args:       []string{inputPath, outputPath, "-q", fmt.Sprintf("%d", output.Quality)},
			StepType:   "encode",
		}
	}
	args := []string{
		"-q", fmt.Sprintf("%d", output.Quality),
		"-s", fmt.Sprintf("%d", output.Effort),
		"-j", fmt.Sprintf("%d", threads),
	}
	if settings.AvifBitDepth != "Auto" {
		args = append(args, "--bitdepth", settings.AvifBitDepth)
	}
	switch settings.AvifEncoder {
	case "AOM AV1":
		args = append(args, "-c", "aom")
		if output.AOMAV1ChromaSub != "Default" {
			args = append(args, "-y", strings.ReplaceAll(output.AOMAV1ChromaSub, ":", ""))
		}
		if settings.AvifAOMIQTune {
			args = append(args, "-a", "tune=iq")
		}
	case "SVT-AV1-PSY":
		args = append(args, "-c", "svt", "-y", "420", "-a", "tune=4")
	}
	args = append(args, getMetadataArgs(toolchain.AvifEncPath, modify.Misc.KeepMetadata, false)...)
	if settings.EnableCustomArgs && settings.AvifEncArgs != "" {
		args = append(args, strings.Fields(settings.AvifEncArgs)...)
	}
	return ExecutionTask{
		ID:         fmt.Sprintf("enc-%s", item.AbsPath),
		InputPath:  inputPath,
		OutputPath: outputPath,
		Command:    toolchain.AvifEncPath,
		Args:       append(args, inputPath, outputPath),
		StepType:   "encode",
	}
}

func buildJPEGTask(item FileItem, inputPath, outputPath string, output OutputSettings, modify ModifySettings, settings AppSettings, toolchain ToolchainPaths, threads int) ExecutionTask {
	isJPEGLI := settings.JPGEncoder == "JPEGLI"
	args := make([]string, 0, 6)
	if isJPEGLI {
		args = append(args, "-q", fmt.Sprintf("%d", output.Quality))
		if settings.DisableProgressiveJPEGLI {
			args = append(args, "-p", "0")
		}
		if output.JPEGLIChromaSub != "Default" {
			args = append(args, "--chroma_subsampling", strings.ReplaceAll(output.JPEGLIChromaSub, ":", ""))
		}
	} else {
		args = append(args, "-quality", fmt.Sprintf("%d", output.Quality))
		if output.JPGChromaSub != "Default" {
			args = append(args, "-sampling-factor", output.JPGChromaSub)
		}
	}
	args = append(args, getMetadataArgs(toolchain.CJPEGLIPath, modify.Misc.KeepMetadata, false)...)
	if settings.EnableCustomArgs {
		if isJPEGLI && settings.CJPEGLIArgs != "" {
			args = append(args, strings.Fields(settings.CJPEGLIArgs)...)
		} else if !isJPEGLI && settings.IMArgs != "" {
			args = append(args, strings.Fields(settings.IMArgs)...)
		}
	}
	cmd := toolchain.CJPEGLIPath
	if !isJPEGLI {
		cmd = toolchain.ImageMagickPath
	}
	return ExecutionTask{
		ID:         fmt.Sprintf("enc-%s", item.AbsPath),
		InputPath:  inputPath,
		OutputPath: outputPath,
		Command:    cmd,
		Args:       append(args, inputPath, outputPath),
		StepType:   "encode",
	}
}

func buildWebPTask(item FileItem, inputPath, outputPath string, output OutputSettings, modify ModifySettings, settings AppSettings, toolchain ToolchainPaths, threads int) ExecutionTask {
	args := make([]string, 0, 6)
	if output.Lossless {
		args = append(args, "-define", "webp:lossless=true")
	} else {
		args = append(args, "-quality", fmt.Sprintf("%d", output.Quality))
	}
	threadLevel := 0
	if threads > 1 {
		threadLevel = 1
	}
	args = append(args, "-define", fmt.Sprintf("webp:thread-level=%d", threadLevel))
	args = append(args, "-define", fmt.Sprintf("webp:method=%d", output.Effort))
	args = append(args, getMetadataArgs(toolchain.ImageMagickPath, modify.Misc.KeepMetadata, false)...)
	if settings.EnableCustomArgs && settings.IMArgs != "" {
		args = append(args, strings.Fields(settings.IMArgs)...)
	}
	return ExecutionTask{
		ID:         fmt.Sprintf("enc-%s", item.AbsPath),
		InputPath:  inputPath,
		OutputPath: outputPath,
		Command:    toolchain.ImageMagickPath,
		Args:       append(args, inputPath, outputPath),
		StepType:   "encode",
	}
}

func buildPNGTask(item FileItem, inputPath, outputPath string, output OutputSettings, modify ModifySettings, settings AppSettings, toolchain ToolchainPaths, threads int) ExecutionTask {
	decoder := GetDecoder(item.Ext)
	if decoder == "" {
		decoder = toolchain.ImageMagickPath
	}
	args := make([]string, 0, 4)
	if decoder == toolchain.AvifDecPath {
		args = append(args, "-j", fmt.Sprintf("%d", threads))
	} else if decoder == toolchain.DJXLPath {
		args = append(args, "--num_threads", fmt.Sprintf("%d", threads))
	}
	args = append(args, getMetadataArgs(decoder, modify.Misc.KeepMetadata, false)...)
	return ExecutionTask{
		ID:         fmt.Sprintf("enc-%s", item.AbsPath),
		InputPath:  inputPath,
		OutputPath: outputPath,
		Command:    decoder,
		Args:       append(args, inputPath, outputPath),
		StepType:   "encode",
	}
}

func buildLosslessJXLTask(item FileItem, inputPath, outputPath string, output OutputSettings, settings AppSettings, toolchain ToolchainPaths, threads int) ExecutionTask {
	return ExecutionTask{
		ID:         fmt.Sprintf("enc-%s", item.AbsPath),
		InputPath:  inputPath,
		OutputPath: outputPath,
		Command:    toolchain.CJXLPath,
		Args:       []string{"-e", fmt.Sprintf("%d", output.Effort), "--num_threads", fmt.Sprintf("%d", threads), inputPath, outputPath},
		StepType:   "encode",
	}
}

func buildJPEGReconstructionTask(item FileItem, inputPath, outputPath string, settings AppSettings, toolchain ToolchainPaths, threads int) ExecutionTask {
	return ExecutionTask{
		ID:         fmt.Sprintf("enc-%s", item.AbsPath),
		InputPath:  inputPath,
		OutputPath: outputPath,
		Command:    toolchain.DJXLPath,
		Args:       []string{"--num_threads", fmt.Sprintf("%d", threads), "--jpeg_reconstruction", inputPath, outputPath},
		StepType:   "encode",
	}
}

func buildMetadataTask(item FileItem, outputPath string, modify ModifySettings, settings AppSettings, toolchain ToolchainPaths) *ExecutionTask {
	mode := modify.Misc.KeepMetadata
	if !strings.HasPrefix(mode, "ExifTool") {
		return nil
	}
	argsStr, ok := settings.ExifToolArgs[mode]
	if !ok || argsStr == "" {
		return nil
	}
	args := strings.Fields(argsStr)
	for i, arg := range args {
		switch arg {
		case `"$src"`, "$src":
			args[i] = item.AbsPath
		case `"$dst"`, "$dst":
			args[i] = outputPath
		}
	}
	return &ExecutionTask{
		ID:         fmt.Sprintf("meta-%s", item.AbsPath),
		InputPath:  item.AbsPath,
		OutputPath: outputPath,
		Command:    toolchain.ExifToolPath,
		Args:       args,
		StepType:   "metadata",
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
