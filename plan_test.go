package main

import (
	"encoding/json"
	"testing"
)

func TestBuildLegacyPlan_JXL(t *testing.T) {
	items := []FileItem{
		{AbsPath: "/test/image.jpg", Name: "image", Ext: "jpg", Dir: "/test", Size: 1024},
	}
	output := DefaultOutputSettings()
	output.Format = "JPEG XL"
	output.Quality = 80
	output.Effort = 7
	modify := DefaultModifySettings()
	settings := DefaultAppSettings()

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
		t.Errorf("expected RunID=legacy, got %s", plan.RunID)
	}
	if len(plan.Items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(plan.Items))
	}
	if len(plan.Tasks) != 1 {
		t.Fatalf("expected 1 task, got %d", len(plan.Tasks))
	}

	task := plan.Tasks[0]
	if task.StepType != "encode" {
		t.Errorf("expected stepType=encode, got %s", task.StepType)
	}
	if task.Command != "cjxl" {
		t.Errorf("expected command=cjxl, got %s", task.Command)
	}
	if len(task.Args) == 0 {
		t.Fatal("expected args, got none")
	}

	// Check quality arg
	foundQuality := false
	for i, arg := range task.Args {
		if arg == "-q" && i+1 < len(task.Args) && task.Args[i+1] == "80" {
			foundQuality = true
			break
		}
	}
	if !foundQuality {
		t.Errorf("expected quality 80 in args, got %v", task.Args)
	}

	// Verify JSON round-trip
	planJSON, err := json.Marshal(plan)
	if err != nil {
		t.Fatalf("failed to marshal plan: %v", err)
	}

	var parsed ExecutionPlan
	if err := json.Unmarshal(planJSON, &parsed); err != nil {
		t.Fatalf("failed to unmarshal plan: %v", err)
	}
	if len(parsed.Tasks) != 1 {
		t.Errorf("expected 1 task after round-trip, got %d", len(parsed.Tasks))
	}
}

func TestBuildLegacyPlan_WithDownscale(t *testing.T) {
	items := []FileItem{
		{AbsPath: "/test/image.png", Name: "image", Ext: "png", Dir: "/test", Size: 2048},
	}
	output := DefaultOutputSettings()
	output.Format = "AVIF"
	modify := DefaultModifySettings()
	modify.Downscaling.Enabled = true
	modify.Downscaling.Mode = "Percent"
	modify.Downscaling.Percent = 50
	settings := DefaultAppSettings()

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

	if len(plan.Tasks) != 2 {
		t.Fatalf("expected 2 tasks (downscale + encode), got %d", len(plan.Tasks))
	}

	if plan.Tasks[0].StepType != "downscale" {
		t.Errorf("expected first task=downscale, got %s", plan.Tasks[0].StepType)
	}
	if plan.Tasks[1].StepType != "encode" {
		t.Errorf("expected second task=encode, got %s", plan.Tasks[1].StepType)
	}
}

func TestBuildLegacyPlan_WithExifTool(t *testing.T) {
	items := []FileItem{
		{AbsPath: "/test/image.jpg", Name: "image", Ext: "jpg", Dir: "/test", Size: 1024},
	}
	output := DefaultOutputSettings()
	modify := DefaultModifySettings()
	modify.Misc.KeepMetadata = "ExifTool - Wipe"
	settings := DefaultAppSettings()

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

	if len(plan.Tasks) != 2 {
		t.Fatalf("expected 2 tasks (encode + metadata), got %d", len(plan.Tasks))
	}

	metaTask := plan.Tasks[1]
	if metaTask.StepType != "metadata" {
		t.Errorf("expected metadata task, got %s", metaTask.StepType)
	}
	if metaTask.Command != "exiftool" {
		t.Errorf("expected exiftool command, got %s", metaTask.Command)
	}
}

func TestResolveCommandPath(t *testing.T) {
	toolchain := ToolchainPaths{
		CJXLPath:        "/usr/bin/cjxl",
		DJXLPath:        "/usr/bin/djxl",
		AvifEncPath:     "/usr/bin/avifenc",
		AvifDecPath:     "/usr/bin/avifdec",
		CJPEGLIPath:     "/usr/bin/cjpegli",
		ImageMagickPath: "/usr/bin/magick",
		ExifToolPath:    "/usr/bin/exiftool",
		OxiPNGPath:      "/usr/bin/oxipng",
	}

	tests := []struct {
		input    string
		expected string
	}{
		{"cjxl", "/usr/bin/cjxl"},
		{"djxl", "/usr/bin/djxl"},
		{"avifenc", "/usr/bin/avifenc"},
		{"avifdec", "/usr/bin/avifdec"},
		{"cjpegli", "/usr/bin/cjpegli"},
		{"magick", "/usr/bin/magick"},
		{"imagemagick", "/usr/bin/magick"},
		{"exiftool", "/usr/bin/exiftool"},
		{"oxipng", "/usr/bin/oxipng"},
		{"C:\\absolute\\path.exe", "C:\\absolute\\path.exe"}, // absolute paths pass through
	}

	for _, tt := range tests {
		result := resolveCommandPath(tt.input, toolchain)
		if result != tt.expected {
			t.Errorf("resolveCommandPath(%q) = %q, want %q", tt.input, result, tt.expected)
		}
	}
}
