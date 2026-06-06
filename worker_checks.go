package main

import (
	"context"
	"fmt"
	"os"
	"regexp"
	"strings"
)

const outputFreeSpaceBuffer = 10 * 1024 * 1024

var imageCountPattern = regexp.MustCompile(`\d+`)

var imagePageCount = func(ctx context.Context, imagePath string) (int, string, error) {
	stdout, stderr, err := RunBinary(
		ctx,
		ImageMagickPath,
		[]string{"identify", "-ping", "-format", "%n\n"},
		imagePath,
		"",
		false,
	)
	if err != nil && GlobalTaskStatus.WasCanceled() {
		return -1, stderr, err
	}

	match := imageCountPattern.FindString(stdout)
	if match == "" {
		return -1, stderr, nil
	}

	var pages int
	if _, scanErr := fmt.Sscanf(match, "%d", &pages); scanErr != nil {
		return -1, stderr, scanErr
	}

	return pages, stderr, nil
}

func validateWorkerConflicts(ctx context.Context, srcExt, srcImagePath, targetFormat string, downscaling bool) *conversionError {
	srcExt = strings.ToLower(strings.TrimSpace(srcExt))

	switch srcExt {
	case "gif", "apng":
		validRoutines := map[string]map[string]bool{
			"gif": {
				"JPEG XL": true,
				"WebP":    true,
			},
			"apng": {
				"JPEG XL": true,
			},
		}

		if !validRoutines[srcExt][targetFormat] {
			return &conversionError{"CF0", fmt.Sprintf("Transcoding %s -> %s is not supported", strings.ToUpper(srcExt), targetFormat)}
		}
		if downscaling {
			return &conversionError{"CF1", "Downscaling is not supported for animation"}
		}
	case "tif", "tiff", "webp":
		pageNum, stderr, err := imagePageCount(ctx, srcImagePath)
		if err != nil && GlobalTaskStatus.WasCanceled() {
			return &conversionError{"X0", "Canceled"}
		}
		if pageNum < 1 {
			return &conversionError{"CF2", fmt.Sprintf("Cannot detect image's page count. %s", stderr)}
		}
		if pageNum > 1 {
			if srcExt == "webp" {
				return &conversionError{"CF3", "Animated WebP is not supported as input."}
			}
			return &conversionError{"CF3", "Multipage images are not supported."}
		}
	}

	return nil
}

func validateOutputSpace(srcPath, outputDir string) *conversionError {
	info, err := os.Stat(srcPath)
	if err != nil {
		return &conversionError{"S1", fmt.Sprintf("Geting file size failed. %s", err)}
	}

	freeSpace := diskFreeBytes(outputDir)
	if freeSpace != -1 && freeSpace <= info.Size()*2+outputFreeSpaceBuffer {
		return &conversionError{"S2", "No space left on device."}
	}

	return nil
}
