//go:build slimg

package main

import (
	"context"
	"os"
)

// convertAVIFWithSlimg converts an image to AVIF using slimg library.
func convertAVIFWithSlimg(ctx context.Context, srcPath string, dstPath string, quality int) *conversionError {
	// Check if canceled
	if GlobalTaskStatus.WasCanceled() {
		return &conversionError{"X0", "Canceled"}
	}

	// Decode the source image
	result, err := SlimgDecodeFile(srcPath)
	if err != nil {
		return &conversionError{"S1", err.Error()}
	}

	// Check if canceled again
	if GlobalTaskStatus.WasCanceled() {
		return &conversionError{"X0", "Canceled"}
	}

	// Convert to AVIF
	avifQuality := uint8(quality)
	if avifQuality > 100 {
		avifQuality = 100
	}

	convertResult, err := SlimgConvert(result.Pixels, result.Width, result.Height, SlimgFormatAvif, avifQuality)
	if err != nil {
		return &conversionError{"C3", err.Error()}
	}

	// Write the output file
	if err := os.WriteFile(dstPath, convertResult.Data, 0644); err != nil {
		return &conversionError{"F1", err.Error()}
	}

	return nil
}

// isSlimgAvailable returns true when slimg is compiled in.
func isSlimgAvailable() bool {
	return true
}