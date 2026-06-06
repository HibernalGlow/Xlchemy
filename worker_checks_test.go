package main

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestValidateWorkerConflictsAnimatedUnsupported(t *testing.T) {
	err := validateWorkerConflicts(context.Background(), "gif", "/tmp/image.gif", "AVIF", false)
	if err == nil {
		t.Fatal("expected conflict error")
	}
	if err.id != "CF0" {
		t.Fatalf("expected CF0, got %s", err.id)
	}
}

func TestValidateWorkerConflictsAnimatedDownscale(t *testing.T) {
	err := validateWorkerConflicts(context.Background(), "gif", "/tmp/image.gif", "JPEG XL", true)
	if err == nil {
		t.Fatal("expected conflict error")
	}
	if err.id != "CF1" {
		t.Fatalf("expected CF1, got %s", err.id)
	}
}

func TestValidateWorkerConflictsMultipage(t *testing.T) {
	original := imagePageCount
	imagePageCount = func(ctx context.Context, imagePath string) (int, string, error) {
		return 2, "", nil
	}
	defer func() {
		imagePageCount = original
	}()

	err := validateWorkerConflicts(context.Background(), "tiff", "/tmp/image.tiff", "JPEG XL", false)
	if err == nil {
		t.Fatal("expected conflict error")
	}
	if err.id != "CF3" {
		t.Fatalf("expected CF3, got %s", err.id)
	}
}

func TestValidateWorkerConflictsAnimatedWebP(t *testing.T) {
	original := imagePageCount
	imagePageCount = func(ctx context.Context, imagePath string) (int, string, error) {
		return 2, "", nil
	}
	defer func() {
		imagePageCount = original
	}()

	err := validateWorkerConflicts(context.Background(), "webp", "/tmp/image.webp", "JPEG XL", false)
	if err == nil {
		t.Fatal("expected conflict error")
	}
	if err.id != "CF3" || !strings.Contains(err.msg, "Animated WebP") {
		t.Fatalf("unexpected conflict error: %+v", err)
	}
}

func TestValidateOutputSpaceLowDisk(t *testing.T) {
	tempDir := t.TempDir()
	srcPath := filepath.Join(tempDir, "src.png")
	if err := os.WriteFile(srcPath, make([]byte, 1024), 0o644); err != nil {
		t.Fatalf("write source: %v", err)
	}

	original := diskFreeBytes
	diskFreeBytes = func(path string) int64 {
		return 1024
	}
	defer func() {
		diskFreeBytes = original
	}()

	err := validateOutputSpace(srcPath, tempDir)
	if err == nil {
		t.Fatal("expected low disk space error")
	}
	if err.id != "S2" {
		t.Fatalf("expected S2, got %s", err.id)
	}
}
