package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"
)

// TestAppServiceCreation tests basic service initialization
func TestAppServiceCreation(t *testing.T) {
	svc := NewAppService()
	if svc == nil {
		t.Fatal("NewAppService() returned nil")
	}
	if svc.config == nil {
		t.Error("config should be initialized")
	}
}

// TestGetConstants verifies constants are returned correctly
func TestGetConstants(t *testing.T) {
	svc := NewAppService()
	result := svc.GetConstants()
	
	var constants map[string]interface{}
	if err := json.Unmarshal([]byte(result), &constants); err != nil {
		t.Fatalf("Failed to parse constants: %v", err)
	}
	
	// Verify required fields exist
	requiredFields := []string{"version", "allowedInput", "allowedResampling", "cpuCount"}
	for _, field := range requiredFields {
		if _, ok := constants[field]; !ok {
			t.Errorf("Missing required field: %s", field)
		}
	}
	
	// Verify cpuCount is valid
	if cpuCount, ok := constants["cpuCount"].(float64); ok {
		if cpuCount <= 0 {
			t.Errorf("cpuCount should be positive, got %v", cpuCount)
		}
	}
}

// TestGetTooltips verifies tooltips are returned
func TestGetTooltips(t *testing.T) {
	svc := NewAppService()
	result := svc.GetTooltips()
	
	var tooltips map[string]string
	if err := json.Unmarshal([]byte(result), &tooltips); err != nil {
		t.Fatalf("Failed to parse tooltips: %v", err)
	}
	
	if len(tooltips) == 0 {
		t.Error("Tooltips should not be empty")
	}
	
	// Check some expected keys
	expectedKeys := []string{"format", "quality_jpeg_xl", "lossless", "effort"}
	for _, key := range expectedKeys {
		if _, ok := tooltips[key]; !ok {
			t.Errorf("Missing expected tooltip key: %s", key)
		}
	}
}

// TestSettingsPersistence tests save/load settings
func TestSettingsPersistence(t *testing.T) {
	svc := NewAppService()
	
	// Test saving settings
	testSettings := map[string]interface{}{
		"output": map[string]interface{}{
			"format":   "JPEG XL",
			"quality":  80,
			"lossless": false,
		},
		"modify": map[string]interface{}{
			"downscaling": map[string]interface{}{
				"enabled": false,
			},
		},
		"app": map[string]interface{}{
			"theme": "system",
		},
	}
	
	settingsJSON, _ := json.Marshal(testSettings)
	err := svc.SaveSettings(string(settingsJSON))
	if err != nil {
		t.Fatalf("SaveSettings failed: %v", err)
	}
	
	// Test loading settings
	loaded := svc.GetSettings()
	var loadedData map[string]interface{}
	if err := json.Unmarshal([]byte(loaded), &loadedData); err != nil {
		t.Fatalf("Failed to parse loaded settings: %v", err)
	}
	
	if _, ok := loadedData["output"]; !ok {
		t.Error("Loaded settings missing output section")
	}
	if _, ok := loadedData["modify"]; !ok {
		t.Error("Loaded settings missing modify section")
	}
	if _, ok := loadedData["app"]; !ok {
		t.Error("Loaded settings missing app section")
	}
}

// TestAddFiles tests file validation and item creation
func TestAddFiles(t *testing.T) {
	svc := NewAppService()
	
	// Create temp test files
	tempDir := t.TempDir()
	
	// Create a valid image file
	validFile := filepath.Join(tempDir, "test.jpg")
	if err := os.WriteFile(validFile, []byte("fake image data"), 0644); err != nil {
		t.Fatalf("Failed to create test file: %v", err)
	}
	
	// Create an invalid file
	invalidFile := filepath.Join(tempDir, "test.txt")
	if err := os.WriteFile(invalidFile, []byte("text data"), 0644); err != nil {
		t.Fatalf("Failed to create test file: %v", err)
	}
	
	// Test with mixed files
	result := svc.AddFiles([]string{validFile, invalidFile})
	
	var items []FileItem
	if err := json.Unmarshal([]byte(result), &items); err != nil {
		t.Fatalf("Failed to parse file items: %v", err)
	}
	
	// Should only include the valid image file
	if len(items) != 1 {
		t.Errorf("Expected 1 item, got %d", len(items))
	}
	
	if len(items) > 0 {
		item := items[0]
		if item.Name != "test" {
			t.Errorf("Expected name 'test', got '%s'", item.Name)
		}
		if item.Ext != "jpg" {
			t.Errorf("Expected ext 'jpg', got '%s'", item.Ext)
		}
		if item.AbsPath != validFile {
			t.Errorf("Expected path '%s', got '%s'", validFile, item.AbsPath)
		}
	}
}

// TestAddFilesWithDirectory tests directory scanning
func TestAddFilesWithDirectory(t *testing.T) {
	svc := NewAppService()
	
	// Create temp directory with multiple files
	tempDir := t.TempDir()
	
	// Create multiple image files
	for _, name := range []string{"img1.jpg", "img2.png", "img3.webp"} {
		path := filepath.Join(tempDir, name)
		if err := os.WriteFile(path, []byte("fake"), 0644); err != nil {
			t.Fatalf("Failed to create test file: %v", err)
		}
	}
	
	// Create a subdirectory with more files
	subDir := filepath.Join(tempDir, "subdir")
	if err := os.MkdirAll(subDir, 0755); err != nil {
		t.Fatalf("Failed to create subdirectory: %v", err)
	}
	
	for _, name := range []string{"img4.avif", "img5.jxl"} {
		path := filepath.Join(subDir, name)
		if err := os.WriteFile(path, []byte("fake"), 0644); err != nil {
			t.Fatalf("Failed to create test file: %v", err)
		}
	}
	
	// Test AddFiles with directory
	result := svc.AddFiles([]string{tempDir})
	
	var items []FileItem
	if err := json.Unmarshal([]byte(result), &items); err != nil {
		t.Fatalf("Failed to parse file items: %v", err)
	}
	
	// Should find all 5 image files
	if len(items) != 5 {
		t.Errorf("Expected 5 items, got %d", len(items))
	}
	
	// Verify no duplicates
	seen := make(map[string]bool)
	for _, item := range items {
		if seen[item.AbsPath] {
			t.Errorf("Duplicate path found: %s", item.AbsPath)
		}
		seen[item.AbsPath] = true
	}
}

// TestScanDirectory tests directory scanning functionality
func TestScanDirectory(t *testing.T) {
	svc := NewAppService()
	
	tempDir := t.TempDir()
	
	// Create test files
	for _, name := range []string{"a.jpg", "b.png", "c.txt", "d.webp"} {
		path := filepath.Join(tempDir, name)
		if err := os.WriteFile(path, []byte("fake"), 0644); err != nil {
			t.Fatalf("Failed to create test file: %v", err)
		}
	}
	
	result := svc.ScanDirectory(tempDir)
	
	var items []FileItem
	if err := json.Unmarshal([]byte(result), &items); err != nil {
		t.Fatalf("Failed to parse scanned items: %v", err)
	}
	
	// Should only include image files (3), not .txt
	if len(items) != 3 {
		t.Errorf("Expected 3 items, got %d", len(items))
	}
	
	// Verify extensions
	for _, item := range items {
		if item.Ext == "txt" {
			t.Errorf("Should not include .txt files")
		}
	}
}

// TestPresetManagement tests preset CRUD operations
func TestPresetManagement(t *testing.T) {
	svc := NewAppService()
	
	// Create a test preset
	testPreset := Preset{
		Output: OutputSettings{
			Format:  "JPEG XL",
			Quality: 85,
		},
		Modify: ModifySettings{
			Downscaling: DownscaleSettings{
				Enabled: false,
			},
		},
		App: AppSettings{
			Theme: "dark",
		},
	}
	
	presetJSON, _ := json.Marshal(testPreset)
	
	// Save preset
	err := svc.SavePreset("test-preset", string(presetJSON))
	if err != nil {
		t.Fatalf("SavePreset failed: %v", err)
	}
	
	// List presets
	presets := svc.ListPresets()
	found := false
	for _, name := range presets {
		if name == "test-preset" {
			found = true
			break
		}
	}
	if !found {
		t.Error("Saved preset not found in list")
	}
	
	// Load preset
	loaded, err := svc.LoadPreset("test-preset")
	if err != nil {
		t.Fatalf("LoadPreset failed: %v", err)
	}
	
	var loadedPreset Preset
	if err := json.Unmarshal([]byte(loaded), &loadedPreset); err != nil {
		t.Fatalf("Failed to parse loaded preset: %v", err)
	}
	
	if loadedPreset.Output.Format != "JPEG XL" {
		t.Errorf("Expected format 'JPEG XL', got '%s'", loadedPreset.Output.Format)
	}
	
	// Set as default
	if err := svc.SetDefaultPreset("test-preset"); err != nil {
		t.Fatalf("SetDefaultPreset failed: %v", err)
	}
	
	if defaultPreset := svc.GetDefaultPreset(); defaultPreset != "test-preset" {
		t.Errorf("Expected default preset 'test-preset', got '%s'", defaultPreset)
	}
	
	// Delete preset
	if err := svc.DeletePreset("test-preset"); err != nil {
		t.Fatalf("DeletePreset failed: %v", err)
	}
	
	// Verify deletion
	presets = svc.ListPresets()
	for _, name := range presets {
		if name == "test-preset" {
			t.Error("Deleted preset still exists")
		}
	}
}

// TestConversionState tests conversion state management
func TestConversionState(t *testing.T) {
	svc := NewAppService()
	
	// Initially not converting
	if svc.IsConverting() {
		t.Error("Should not be converting initially")
	}
	
	// Test that we can check state without panicking
	// Note: We can't fully test StartConversion without valid image files
	// and encoder binaries, but we can test state transitions
}

// TestVersionComparison tests version comparison logic
func TestVersionComparison(t *testing.T) {
	tests := []struct {
		a        string
		b        string
		expected int
	}{
		{"1.0.0", "1.0.1", -1},
		{"1.0.1", "1.0.0", 1},
		{"1.0.0", "1.0.0", 0},
		{"1.1.0", "1.0.5", 1},
		{"2.0.0", "1.9.9", 1},
		{"1.0", "1.0.0", 0},
		{"1.0.0", "1.0.0.1", -1},
	}
	
	for _, test := range tests {
		result := compareVersions(test.a, test.b)
		if result != test.expected {
			t.Errorf("compareVersions(%q, %q) = %d, expected %d", test.a, test.b, result, test.expected)
		}
	}
}

// TestIsAllowedInput tests input format validation
func TestIsAllowedInput(t *testing.T) {
	validFormats := []string{"jpg", "jpeg", "png", "webp", "avif", "jxl", "gif"}
	invalidFormats := []string{"txt", "pdf", "doc", "exe", ""}
	
	for _, format := range validFormats {
		if !IsAllowedInput(format) {
			t.Errorf("Expected %s to be allowed", format)
		}
	}
	
	for _, format := range invalidFormats {
		if IsAllowedInput(format) {
			t.Errorf("Expected %s to NOT be allowed", format)
		}
	}
}

// TestGetExtension tests format to extension mapping
func TestGetExtension(t *testing.T) {
	tests := map[string]string{
		"JPEG XL": "jxl",
		"AVIF":    "avif",
		"JPEG":    "jpg",
		"WebP":    "webp",
		"PNG":     "png",
	}
	
	for format, expected := range tests {
		result := GetExtension(format)
		if result != expected {
			t.Errorf("GetExtension(%q) = %q, expected %q", format, result, expected)
		}
	}
}

// TestIsJPEGAlias tests JPEG alias detection
func TestIsJPEGAlias(t *testing.T) {
	aliases := []string{"jpg", "jpeg", "jpe", "jfif"}
	nonAliases := []string{"png", "webp", "avif", "jxl"}
	
	for _, ext := range aliases {
		if !IsJPEGAlias(ext) {
			t.Errorf("Expected %s to be JPEG alias", ext)
		}
	}
	
	for _, ext := range nonAliases {
		if IsJPEGAlias(ext) {
			t.Errorf("Expected %s to NOT be JPEG alias", ext)
		}
	}
}

// TestHandleExistingFile tests file existence handling
func TestHandleExistingFile(t *testing.T) {
	tempDir := t.TempDir()
	
	// Test Replace mode
	testFile := filepath.Join(tempDir, "test.txt")
	os.WriteFile(testFile, []byte("original"), 0644)
	
	result := handleExistingFile(testFile, "Replace")
	if result != testFile {
		t.Errorf("Replace mode should return same path, got %s", result)
	}
	
	// Test Skip mode (file exists)
	result = handleExistingFile(testFile, "Skip")
	if result != testFile {
		t.Errorf("Skip mode should return same path, got %s", result)
	}
	
	// Test Rename mode
	os.WriteFile(testFile, []byte("original"), 0644)
	result = handleExistingFile(testFile, "Rename")
	expected := filepath.Join(tempDir, "test_1.txt")
	if result != expected {
		t.Errorf("Rename mode expected %s, got %s", expected, result)
	}
	
	// Test default mode
	result = handleExistingFile(testFile, "Unknown")
	if result != testFile {
		t.Errorf("Default mode should return same path, got %s", result)
	}
}

// TestFormatSize tests file size formatting
func TestFormatSize(t *testing.T) {
	tests := []struct {
		bytes    int64
		expected string
	}{
		{0, "0 B"},
		{512, "512 B"},
		{1024, "1.0 KB"},
		{1536, "1.5 KB"},
		{1024 * 1024, "1.00 MB"},
		{2 * 1024 * 1024, "2.00 MB"},
	}
	
	for _, test := range tests {
		result := formatSize(test.bytes)
		if result != test.expected {
			t.Errorf("formatSize(%d) = %q, expected %q", test.bytes, result, test.expected)
		}
	}
}

// TestFormatTimeLeft tests time formatting
func TestFormatTimeLeft(t *testing.T) {
	tests := []struct {
		duration time.Duration
		expected string
	}{
		{0, ""},
		{-1 * time.Second, ""},
		{30 * time.Second, "30 s left"},
		{90 * time.Second, "1 m 30 s left"},
		{3600 * time.Second, "1 h 0 m left"},
		{3661 * time.Second, "1 h 1 m left"},
	}
	
	for _, test := range tests {
		result := formatTimeLeft(test.duration)
		if result != test.expected {
			t.Errorf("formatTimeLeft(%v) = %q, expected %q", test.duration, result, test.expected)
		}
	}
}

// TestGetFileSize tests file size retrieval
func TestGetFileSize(t *testing.T) {
	tempDir := t.TempDir()
	testFile := filepath.Join(tempDir, "test.txt")
	
	// Test non-existent file
	_, err := getFileSize(testFile)
	if err == nil {
		t.Error("Expected error for non-existent file")
	}
	
	// Test existing file
	content := []byte("Hello, World!")
	os.WriteFile(testFile, content, 0644)
	
	size, err := getFileSize(testFile)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if size != int64(len(content)) {
		t.Errorf("Expected size %d, got %d", len(content), size)
	}
}

// TestGetMetadataArgs tests metadata argument generation
func TestGetMetadataArgs(t *testing.T) {
	// Test Encoder - Wipe mode
	args := getMetadataArgs(CJXlPath, "Encoder - Wipe", false)
	if len(args) == 0 {
		t.Error("Expected metadata wipe args for cjxl")
	}
	
	// Test Encoder - Preserve mode
	args = getMetadataArgs(CJXlPath, "Encoder - Preserve", false)
	if len(args) != 0 {
		t.Error("Expected no args for preserve mode")
	}
	
	// Test ExifTool mode (should return nil)
	args = getMetadataArgs(CJXlPath, "ExifTool - Copy All", false)
	if args != nil {
		t.Error("Expected nil for ExifTool mode")
	}
	
	// Test lossless JPEG (should not strip metadata)
	args = getMetadataArgs(CJXlPath, "Encoder - Wipe", true)
	if len(args) != 0 {
		t.Error("Expected no args for lossless JPEG")
	}
}

// TestBuildLegacyPlan tests plan generation from legacy settings
func TestBuildLegacyPlan(t *testing.T) {
	items := []FileItem{
		{AbsPath: "/tmp/test.jpg", Name: "test", Ext: "jpg", Dir: "/tmp"},
	}
	
	output := OutputSettings{
		Format:  "JPEG XL",
		Quality: 80,
		Effort:  7,
	}
	
	modify := ModifySettings{
		Downscaling: DownscaleSettings{Enabled: false},
	}
	
	settings := AppSettings{
		KeepIfLarger: true,
	}
	
	toolchain := ToolchainPaths{
		CJXLPath:        "cjxl",
		DJXLPath:        "djxl",
		AvifEncPath:     "avifenc",
		AvifDecPath:     "avifdec",
		CJPEGLIPath:     "cjpegli",
		ImageMagickPath: "magick",
		ExifToolPath:    "exiftool",
		OxiPNGPath:      "oxipng",
	}
	
	plan := buildLegacyPlan(items, output, modify, settings, toolchain)
	
	if plan.RunID != "legacy" {
		t.Errorf("Expected RunID 'legacy', got '%s'", plan.RunID)
	}
	
	if len(plan.Items) != 1 {
		t.Errorf("Expected 1 item, got %d", len(plan.Items))
	}
	
	if !plan.Policies.KeepIfLarger {
		t.Error("Expected KeepIfLarger to be true")
	}
	
	if len(plan.Tasks) == 0 {
		t.Error("Expected at least one task")
	}
	
	// Verify task has correct structure
	for _, task := range plan.Tasks {
		if task.ID == "" {
			t.Error("Task ID should not be empty")
		}
		if task.Command == "" {
			t.Error("Task command should not be empty")
		}
		if task.StepType == "" {
			t.Error("Task step type should not be empty")
		}
	}
}

// TestBuildJXLTask tests JPEG XL task building
func TestBuildJXLTask(t *testing.T) {
	item := FileItem{AbsPath: "/tmp/test.jpg", Name: "test", Ext: "jpg"}
	output := OutputSettings{Format: "JPEG XL", Quality: 85, Effort: 7, Lossless: false}
	modify := ModifySettings{Misc: MiscSettings{KeepMetadata: "Encoder - Preserve"}}
	settings := AppSettings{}
	toolchain := ToolchainPaths{CJXLPath: "cjxl"}
	
	task := buildJXLTask(item, item.AbsPath, "/tmp/output.jxl", output, modify, settings, toolchain, 4)
	
	if task.Command != "cjxl" {
		t.Errorf("Expected command 'cjxl', got '%s'", task.Command)
	}
	
	if task.StepType != "encode" {
		t.Errorf("Expected step type 'encode', got '%s'", task.StepType)
	}
	
	// Verify args contain expected flags
	argsStr := strings.Join(task.Args, " ")
	if !strings.Contains(argsStr, "-q") {
		t.Error("Expected quality flag in args")
	}
	if !strings.Contains(argsStr, "-e") {
		t.Error("Expected effort flag in args")
	}
}

// TestBuildAVIFTask tests AVIF task building
func TestBuildAVIFTask(t *testing.T) {
	item := FileItem{AbsPath: "/tmp/test.png", Name: "test", Ext: "png"}
	output := OutputSettings{Format: "AVIF", Quality: 80, Effort: 4}
	modify := ModifySettings{Misc: MiscSettings{KeepMetadata: "Encoder - Preserve"}}
	settings := AppSettings{AvifEncoder: "AOM AV1"}
	toolchain := ToolchainPaths{AvifEncPath: "avifenc"}
	
	task := buildAVIFTask(item, item.AbsPath, "/tmp/output.avif", output, modify, settings, toolchain, 4)
	
	if task.Command != "avifenc" {
		t.Errorf("Expected command 'avifenc', got '%s'", task.Command)
	}
	
	argsStr := strings.Join(task.Args, " ")
	if !strings.Contains(argsStr, "-c aom") {
		t.Error("Expected AOM encoder flag")
	}
}

// TestBuildJPEGTask tests JPEG task building
func TestBuildJPEGTask(t *testing.T) {
	item := FileItem{AbsPath: "/tmp/test.png", Name: "test", Ext: "png"}
	output := OutputSettings{Format: "JPEG", Quality: 90}
	modify := ModifySettings{Misc: MiscSettings{KeepMetadata: "Encoder - Preserve"}}
	settings := AppSettings{JPGEncoder: "JPEGLI"}
	toolchain := ToolchainPaths{CJPEGLIPath: "cjpegli", ImageMagickPath: "magick"}
	
	task := buildJPEGTask(item, item.AbsPath, "/tmp/output.jpg", output, modify, settings, toolchain, 4)
	
	if task.Command != "cjpegli" {
		t.Errorf("Expected command 'cjpegli', got '%s'", task.Command)
	}
	
	// Test with ImageMagick encoder
	settings.JPGEncoder = "libjpeg"
	task = buildJPEGTask(item, item.AbsPath, "/tmp/output.jpg", output, modify, settings, toolchain, 4)
	
	if task.Command != "magick" {
		t.Errorf("Expected command 'magick', got '%s'", task.Command)
	}
}

// TestBuildWebPTask tests WebP task building
func TestBuildWebPTask(t *testing.T) {
	item := FileItem{AbsPath: "/tmp/test.png", Name: "test", Ext: "png"}
	output := OutputSettings{Format: "WebP", Quality: 85, Effort: 4, Lossless: true}
	modify := ModifySettings{Misc: MiscSettings{KeepMetadata: "Encoder - Preserve"}}
	settings := AppSettings{}
	toolchain := ToolchainPaths{ImageMagickPath: "magick"}
	
	task := buildWebPTask(item, item.AbsPath, "/tmp/output.webp", output, modify, settings, toolchain, 4)
	
	if task.Command != "magick" {
		t.Errorf("Expected command 'magick', got '%s'", task.Command)
	}
	
	argsStr := strings.Join(task.Args, " ")
	if !strings.Contains(argsStr, "webp:lossless=true") {
		t.Error("Expected lossless flag")
	}
}

// TestBuildPNGTask tests PNG task building
func TestBuildPNGTask(t *testing.T) {
	item := FileItem{AbsPath: "/tmp/test.jpg", Name: "test", Ext: "jpg"}
	output := OutputSettings{Format: "PNG"}
	modify := ModifySettings{Misc: MiscSettings{KeepMetadata: "Encoder - Preserve"}}
	settings := AppSettings{}
	toolchain := ToolchainPaths{ImageMagickPath: "magick", DJXLPath: "djxl", AvifDecPath: "avifdec"}
	
	task := buildPNGTask(item, item.AbsPath, "/tmp/output.png", output, modify, settings, toolchain, 4)
	
	if task.Command == "" {
		t.Error("Expected non-empty command")
	}
}

// TestBuildLosslessJXLTask tests lossless JPEG transcoding task
func TestBuildLosslessJXLTask(t *testing.T) {
	item := FileItem{AbsPath: "/tmp/test.jpg", Name: "test", Ext: "jpg"}
	output := OutputSettings{Format: "Lossless JPEG Transcoding", Effort: 7}
	settings := AppSettings{}
	toolchain := ToolchainPaths{CJXLPath: "cjxl"}
	
	task := buildLosslessJXLTask(item, item.AbsPath, "/tmp/output.jxl", output, settings, toolchain, 4)
	
	if task.Command != "cjxl" {
		t.Errorf("Expected command 'cjxl', got '%s'", task.Command)
	}
	
	argsStr := strings.Join(task.Args, " ")
	if !strings.Contains(argsStr, "-e") {
		t.Error("Expected effort flag")
	}
}

// TestBuildJPEGReconstructionTask tests JPEG reconstruction task
func TestBuildJPEGReconstructionTask(t *testing.T) {
	item := FileItem{AbsPath: "/tmp/test.jxl", Name: "test", Ext: "jxl"}
	settings := AppSettings{}
	toolchain := ToolchainPaths{DJXLPath: "djxl"}
	
	task := buildJPEGReconstructionTask(item, item.AbsPath, "/tmp/output.jpg", settings, toolchain, 4)
	
	if task.Command != "djxl" {
		t.Errorf("Expected command 'djxl', got '%s'", task.Command)
	}
	
	argsStr := strings.Join(task.Args, " ")
	if !strings.Contains(argsStr, "--jpeg_reconstruction") {
		t.Error("Expected jpeg_reconstruction flag")
	}
}

// TestBuildMetadataTask tests metadata task building
func TestBuildMetadataTask(t *testing.T) {
	item := FileItem{AbsPath: "/tmp/test.jpg", Name: "test", Ext: "jpg"}
	modify := ModifySettings{Misc: MiscSettings{KeepMetadata: "ExifTool - Copy All"}}
	settings := AppSettings{
		ExifToolArgs: map[string]string{
			"ExifTool - Copy All": "-TagsFromFile $src -all:all $dst -overwrite_original",
		},
	}
	toolchain := ToolchainPaths{ExifToolPath: "exiftool"}
	
	task := buildMetadataTask(item, "/tmp/output.jpg", modify, settings, toolchain)
	
	if task == nil {
		t.Fatal("Expected non-nil metadata task")
	}
	
	if task.Command != "exiftool" {
		t.Errorf("Expected command 'exiftool', got '%s'", task.Command)
	}
	
	if task.StepType != "metadata" {
		t.Errorf("Expected step type 'metadata', got '%s'", task.StepType)
	}
	
	// Verify $src and $dst were replaced
	argsStr := strings.Join(task.Args, " ")
	if strings.Contains(argsStr, "$src") {
		t.Error("$src should have been replaced")
	}
	if strings.Contains(argsStr, "$dst") {
		t.Error("$dst should have been replaced")
	}
}

// TestBuildMetadataTaskNoArgs tests metadata task with missing args
func TestBuildMetadataTaskNoArgs(t *testing.T) {
	item := FileItem{AbsPath: "/tmp/test.jpg", Name: "test", Ext: "jpg"}
	modify := ModifySettings{Misc: MiscSettings{KeepMetadata: "ExifTool - Copy All"}}
	settings := AppSettings{ExifToolArgs: map[string]string{}}
	toolchain := ToolchainPaths{ExifToolPath: "exiftool"}
	
	task := buildMetadataTask(item, "/tmp/output.jpg", modify, settings, toolchain)
	
	if task != nil {
		t.Error("Expected nil task when no args configured")
	}
}

// TestBuildMetadataTaskNonExifTool tests metadata task with non-ExifTool mode
func TestBuildMetadataTaskNonExifTool(t *testing.T) {
	item := FileItem{AbsPath: "/tmp/test.jpg", Name: "test", Ext: "jpg"}
	modify := ModifySettings{Misc: MiscSettings{KeepMetadata: "Encoder - Preserve"}}
	settings := AppSettings{}
	toolchain := ToolchainPaths{ExifToolPath: "exiftool"}
	
	task := buildMetadataTask(item, "/tmp/output.jpg", modify, settings, toolchain)
	
	if task != nil {
		t.Error("Expected nil task for non-ExifTool mode")
	}
}

// TestBuildDownscaleTask tests downscaling task building
func TestBuildDownscaleTask(t *testing.T) {
	item := FileItem{AbsPath: "/tmp/test.jpg", Name: "test", Ext: "jpg"}
	
	// Test Resolution mode
	modify := ModifySettings{
		Downscaling: DownscaleSettings{
			Enabled: true,
			Mode:    "Resolution",
			Width:   1920,
			Height:  1080,
		},
	}
	toolchain := ToolchainPaths{ImageMagickPath: "magick"}
	
	task := buildDownscaleTask(item, modify, toolchain, 4)
	
	if task == nil {
		t.Fatal("Expected non-nil downscale task")
	}
	
	if task.StepType != "downscale" {
		t.Errorf("Expected step type 'downscale', got '%s'", task.StepType)
	}
	
	argsStr := strings.Join(task.Args, " ")
	if !strings.Contains(argsStr, "1920") || !strings.Contains(argsStr, "1080") {
		t.Error("Expected resize dimensions in args")
	}
	
	// Test Percent mode
	modify.Downscaling.Mode = "Percent"
	modify.Downscaling.Percent = 50
	
	task = buildDownscaleTask(item, modify, toolchain, 4)
	if task == nil {
		t.Fatal("Expected non-nil downscale task for Percent mode")
	}
	
	argsStr = strings.Join(task.Args, " ")
	if !strings.Contains(argsStr, "50%") {
		t.Error("Expected percent value in args")
	}
	
	// Test disabled downscaling
	modify.Downscaling.Enabled = false
	task = buildDownscaleTask(item, modify, toolchain, 4)
	if task != nil {
		t.Error("Expected nil task when downscaling disabled")
	}
}

// TestRunConversionPlanValidation tests plan validation
func TestRunConversionPlanValidation(t *testing.T) {
	svc := NewAppService()
	
	// Test with invalid JSON
	err := svc.RunConversionPlan("invalid json", 4)
	if err == nil {
		t.Error("Expected error for invalid JSON")
	}
	
	// Test concurrent conversion prevention
	// Note: We can't fully test RunConversionPlan without a running Wails app
	// because it calls App.Event.Emit which requires the Wails runtime.
	// Instead, we test the concurrent check logic directly.
	
	// Simulate conversion in progress
	svc.mu.Lock()
	svc.converting = true
	svc.mu.Unlock()
	
	// Create a temp file for the test
	tempDir := t.TempDir()
	testFile := filepath.Join(tempDir, "test.jpg")
	os.WriteFile(testFile, []byte("fake image data"), 0644)
	
	validPlan := ExecutionPlan{
		RunID: "test",
		Items: []FileItem{{AbsPath: testFile, Name: "test", Ext: "jpg"}},
		Tasks: []ExecutionTask{
			{ID: "1", Command: "echo", Args: []string{"test"}, StepType: "encode"},
		},
	}
	planJSON, _ := json.Marshal(validPlan)
	
	// Should fail due to concurrent conversion
	err2 := svc.RunConversionPlan(string(planJSON), 4)
	if err2 == nil {
		t.Error("Expected error for concurrent conversion")
	}
	if !strings.Contains(err2.Error(), "already in progress") {
		t.Errorf("Expected 'already in progress' error, got: %v", err2)
	}
	
	// Reset state
	svc.mu.Lock()
	svc.converting = false
	svc.mu.Unlock()
}

// TestCancelConversion tests cancellation
func TestCancelConversion(t *testing.T) {
	svc := NewAppService()
	
	// Should not panic when not converting
	svc.CancelConversion()
	
	// Verify state
	if svc.IsConverting() {
		t.Error("Should not be converting after cancel")
	}
}

// TestGetCPUCount tests CPU count retrieval
func TestGetCPUCount(t *testing.T) {
	svc := NewAppService()
	count := svc.GetCPUCount()
	
	if count <= 0 {
		t.Errorf("Expected positive CPU count, got %d", count)
	}
	
	if count != runtime.NumCPU() {
		t.Errorf("Expected %d, got %d", runtime.NumCPU(), count)
	}
}

// TestCheckForUpdatesDisabled tests update checker when disabled
func TestCheckForUpdatesDisabled(t *testing.T) {
	// Note: UpdateCheckerEnabled is a const, cannot be changed at runtime
	// This test verifies the behavior when the const is false
	// For now, just verify the method returns a valid response
	
	svc := NewAppService()
	result := svc.CheckForUpdates()
	
	var data map[string]interface{}
	if err := json.Unmarshal([]byte(result), &data); err != nil {
		t.Fatalf("Failed to parse result: %v", err)
	}
	
	// Should have an "available" field
	if _, ok := data["available"]; !ok {
		t.Error("Expected 'available' field in response")
	}
}

// TestProcessManager tests process manager functionality
func TestProcessManager(t *testing.T) {
	// Clear any existing processes
	GlobalProcessManager.Clear()
	
	// Test adding and terminating processes
	cmd := exec.CommandContext(context.Background(), "sleep", "10")
	err := cmd.Start()
	if err != nil {
		t.Skipf("Cannot start test process: %v", err)
	}
	
	GlobalProcessManager.Add(cmd)
	
	// Verify process was added
	if len(GlobalProcessManager.processes) == 0 {
		t.Error("Expected process to be in manager")
	}
	
	// Terminate all
	GlobalProcessManager.TerminateAll()
	
	// Verify process was removed
	if len(GlobalProcessManager.processes) != 0 {
		t.Error("Expected process to be removed after termination")
	}
}

// TestTaskStatus tests task status management
func TestTaskStatus(t *testing.T) {
	// Reset status
	GlobalTaskStatus.Reset()
	
	if GlobalTaskStatus.WasCanceled() {
		t.Error("Should not be canceled initially")
	}
	
	GlobalTaskStatus.Cancel()
	
	if !GlobalTaskStatus.WasCanceled() {
		t.Error("Should be canceled after Cancel()")
	}
	
	GlobalTaskStatus.Reset()
	
	if GlobalTaskStatus.WasCanceled() {
		t.Error("Should not be canceled after Reset()")
	}
}

// TestRAMOptimizer tests RAM optimizer initialization
func TestRAMOptimizer(t *testing.T) {
	// Reset optimizer - "Disabled" mode
	GlobalRAMOptimizer.Initialize("Disabled", "", 4)
	
	if GlobalRAMOptimizer.Enabled {
		t.Error("Should not be enabled after initialization with Disabled")
	}
	
	// Test with enabled
	GlobalRAMOptimizer.Initialize("Dynamic", "(all, 50, 1/2)", 4)
	
	if !GlobalRAMOptimizer.Enabled {
		t.Error("Should be enabled after initialization with Dynamic")
	}
}

// BenchmarkAddFiles benchmarks file addition
func BenchmarkAddFiles(b *testing.B) {
	svc := NewAppService()
	tempDir := b.TempDir()
	
	// Create test files
	files := make([]string, 100)
	for i := 0; i < 100; i++ {
		files[i] = filepath.Join(tempDir, fmt.Sprintf("img%d.jpg", i))
		os.WriteFile(files[i], []byte("fake"), 0644)
	}
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		svc.AddFiles(files)
	}
}

// BenchmarkScanDirectory benchmarks directory scanning
func BenchmarkScanDirectory(b *testing.B) {
	svc := NewAppService()
	tempDir := b.TempDir()
	
	// Create test files in nested directories
	for i := 0; i < 50; i++ {
		subDir := filepath.Join(tempDir, fmt.Sprintf("dir%d", i%10))
		os.MkdirAll(subDir, 0755)
		path := filepath.Join(subDir, fmt.Sprintf("img%d.jpg", i))
		os.WriteFile(path, []byte("fake"), 0644)
	}
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		svc.ScanDirectory(tempDir)
	}
}