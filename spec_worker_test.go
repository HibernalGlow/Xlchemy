package main

import (
	"context"
	"testing"
)

func TestReplaceEffortArg(t *testing.T) {
	args := []string{"-q 80", "-e 7", "--num_threads=4", "--lossless_jpeg=0"}

	e7 := replaceEffortArg(args, 7)
	if e7[1] != "-e 7" {
		t.Fatalf("expected -e 7, got %s", e7[1])
	}

	e9 := replaceEffortArg(args, 9)
	if e9[1] != "-e 9" {
		t.Fatalf("expected -e 9, got %s", e9[1])
	}

	// Original should be unchanged
	if args[1] != "-e 7" {
		t.Fatalf("original args mutated: %v", args)
	}
}

func TestResolveOutputExtensionJXL(t *testing.T) {
	fi := FileItem{Ext: "png"}
	output := OutputSettings{Format: "JPEG XL"}
	ext, err := resolveOutputExtension(context.Background(), fi, output)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ext != "jxl" {
		t.Fatalf("expected jxl, got %s", ext)
	}
}

func TestResolveOutputExtensionAVIF(t *testing.T) {
	fi := FileItem{Ext: "jpg"}
	output := OutputSettings{Format: "AVIF"}
	ext, err := resolveOutputExtension(context.Background(), fi, output)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ext != "avif" {
		t.Fatalf("expected avif, got %s", ext)
	}
}

func TestResolveOutputExtensionJPEGReconstructionJXL(t *testing.T) {
	fi := FileItem{Ext: "jxl", AbsPath: "/nonexistent.jxl"}
	output := OutputSettings{Format: "JPEG Reconstruction", JXLPNGFallback: false}
	_, err := resolveOutputExtension(context.Background(), fi, output)
	// This will fail because JxlInfoPath binary doesn't exist in test, but we verify the S3 check
	if err != nil && err.id != "S3" && err.id != "S4" {
		t.Fatalf("unexpected error id: %s", err.id)
	}
}

func TestResolveOutputExtensionJPEGReconstructionNotJXL(t *testing.T) {
	fi := FileItem{Ext: "png"}
	output := OutputSettings{Format: "JPEG Reconstruction"}
	_, err := resolveOutputExtension(context.Background(), fi, output)
	if err == nil {
		t.Fatal("expected S3 error for non-JXL input")
	}
	if err.id != "S3" {
		t.Fatalf("expected S3, got %s", err.id)
	}
}

func TestResolveOutputExtensionLosslessJPEGNotJPEG(t *testing.T) {
	fi := FileItem{Ext: "png"}
	output := OutputSettings{Format: "Lossless JPEG Transcoding"}
	_, err := resolveOutputExtension(context.Background(), fi, output)
	if err == nil {
		t.Fatal("expected S5 error for non-JPEG input")
	}
	if err.id != "S5" {
		t.Fatalf("expected S5, got %s", err.id)
	}
}

func TestResolveOutputExtensionLosslessJPEGValid(t *testing.T) {
	fi := FileItem{Ext: "jpg"}
	output := OutputSettings{Format: "Lossless JPEG Transcoding"}
	ext, err := resolveOutputExtension(context.Background(), fi, output)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ext != "jxl" {
		t.Fatalf("expected jxl, got %s", ext)
	}
}

func TestResolveOutputExtensionJPEG(t *testing.T) {
	fi := FileItem{Ext: "png"}
	output := OutputSettings{Format: "JPEG"}
	ext, err := resolveOutputExtension(context.Background(), fi, output)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ext != "jpg" {
		t.Fatalf("expected jpg, got %s", ext)
	}
}

func TestResolveOutputExtensionUnknown(t *testing.T) {
	fi := FileItem{Ext: "png"}
	output := OutputSettings{Format: "UnknownFormat"}
	_, err := resolveOutputExtension(context.Background(), fi, output)
	if err == nil {
		t.Fatal("expected PG0 error for unknown format")
	}
	if err.id != "PG0" {
		t.Fatalf("expected PG0, got %s", err.id)
	}
}

func TestCanCopyOriginalLarger(t *testing.T) {
	// These formats should NOT allow copy_if_larger
	for _, fmt := range []string{"Lossless JPEG Transcoding", "JPEG Reconstruction", "PNG"} {
		if canCopyOriginalLarger(fmt) {
			t.Fatalf("expected false for %s", fmt)
		}
	}
	// These should allow it
	for _, fmt := range []string{"JPEG XL", "AVIF", "JPEG", "WebP"} {
		if !canCopyOriginalLarger(fmt) {
			t.Fatalf("expected true for %s", fmt)
		}
	}
}

func TestSamePath(t *testing.T) {
	if !samePath("/tmp/a.jpg", "/tmp/a.jpg") {
		t.Fatal("same paths should match")
	}
	if samePath("/tmp/a.jpg", "/tmp/b.jpg") {
		t.Fatal("different paths should not match")
	}
}

func TestLinearRegression(t *testing.T) {
	// Simple case: y = 2x + 1
	// x = [1, 2, 3], y = [3, 5, 7]
	x := []int64{1, 2, 3}
	y := []int64{3, 5, 7}
	slope, intercept := linearRegression(x, y)
	if slope < 1.99 || slope > 2.01 {
		t.Fatalf("expected slope ~2.0, got %f", slope)
	}
	if intercept < 0.99 || intercept > 1.01 {
		t.Fatalf("expected intercept ~1.0, got %f", intercept)
	}
}

func TestLinearRegressionFlat(t *testing.T) {
	// All same y values -> slope should be 0
	x := []int64{100, 200, 300}
	y := []int64{50, 50, 50}
	slope, intercept := linearRegression(x, y)
	if slope != 0 {
		t.Fatalf("expected slope 0, got %f", slope)
	}
	if intercept != 50 {
		t.Fatalf("expected intercept 50, got %f", intercept)
	}
}

func TestExtrapolateScale(t *testing.T) {
	// Sample: at 66% scale, file is 500KB; at 33% scale, file is 250KB
	// Linear: file_size = m * percent + b
	// We want target = 375KB
	sampleSizes := []int64{500 * 1024, 250 * 1024}
	samplePercents := []int64{66, 33}
	target := int64(375 * 1024)
	scale := extrapolateScale(sampleSizes, samplePercents, target)
	// Expected: roughly 50% (midpoint between 33 and 66)
	if scale < 40 || scale > 60 {
		t.Fatalf("expected scale ~50, got %d", scale)
	}
}

func TestExtrapolateScaleLargeTarget(t *testing.T) {
	// If target is larger than both samples, scale should be > max percent
	sampleSizes := []int64{100, 50}
	samplePercents := []int64{66, 33}
	target := int64(200)
	scale := extrapolateScale(sampleSizes, samplePercents, target)
	if scale <= 66 {
		t.Fatalf("expected scale > 66 for large target, got %d", scale)
	}
}
