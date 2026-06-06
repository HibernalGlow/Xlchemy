package main

import (
	"context"
	"fmt"
	"os"
)

func runSmallestLossless(
	ctx context.Context,
	fi FileItem,
	currentPath string,
	currentExt string,
	outputDir string,
	output OutputSettings,
	modify ModifySettings,
	settings AppSettings,
	threads int,
) (specConversionResult, *conversionError) {
	pathPool := make(map[string]string)
	for key, enabled := range output.SmallestFormatPool {
		if !enabled {
			continue
		}
		switch key {
		case "png", "webp", "jxl":
			pathPool[key] = getUniqueTmpFilePath(outputDir, key)
		}
	}

	if len(pathPool) == 0 {
		return specConversionResult{}, &conversionError{"SL0", "No formats selected."}
	}

	jxlLosslessJPEG := settings.JXLAutolosslessJPEG && IsJPEGAlias(fi.Ext)

	if pngPath, ok := pathPool["png"]; ok {
		if err := copyFile(currentPath, pngPath); err != nil {
			return specConversionResult{}, &conversionError{"SL1", fmt.Sprintf("Failed to copy file. %s", err)}
		}

		args := []string{
			fmt.Sprintf("-o %d", ternaryInt(output.MaxCompression, 4, 2)),
			fmt.Sprintf("-t %d", threads),
			"--np",
			"--nc",
		}
		if !output.SmallestFormatPool["webp"] {
			args = append(args, "--nb")
		}
		args = append(args, getMetadataArgs(OxiPNGPath, modify.Misc.KeepMetadata, false)...)

		_, stderr, err := RunBinary(ctx, OxiPNGPath, args, pngPath, "", false)
		if err != nil || !fileExists(pngPath) {
			return specConversionResult{}, &conversionError{"SL5", stderr}
		}
	}

	if webpPath, ok := pathPool["webp"]; ok {
		args := []string{
			fmt.Sprintf("-define webp:thread-level=%d", ternaryInt(threads > 1, 1, 0)),
			"-define webp:method=6",
			"-define webp:lossless=true",
		}
		args = append(args, getMetadataArgs(ImageMagickPath, modify.Misc.KeepMetadata, false)...)

		_, stderr, err := RunBinary(ctx, ImageMagickPath, args, currentPath, webpPath, true)
		if err != nil || !fileExists(webpPath) {
			return specConversionResult{}, &conversionError{"SL5", stderr}
		}
	}

	if jxlPath, ok := pathPool["jxl"]; ok {
		args := []string{
			"-q 100",
			fmt.Sprintf("-e %d", ternaryInt(output.MaxCompression, 9, 7)),
			fmt.Sprintf("--num_threads=%d", threads),
			fmt.Sprintf("--lossless_jpeg=%d", ternaryInt(jxlLosslessJPEG, 1, 0)),
		}
		if output.SmallestFormatPool["webp"] {
			args = append(args, "--override_bitdepth=8")
		}
		args = append(args, getMetadataArgs(CJXlPath, modify.Misc.KeepMetadata, jxlLosslessJPEG)...)

		srcPath := currentPath
		if jxlLosslessJPEG {
			srcPath = fi.AbsPath
		}

		_, stderr, err := RunBinary(ctx, CJXlPath, args, srcPath, jxlPath, false)
		if err != nil || !fileExists(jxlPath) {
			return specConversionResult{}, &conversionError{"SL5", stderr}
		}
	}

	var (
		smallestKey  string
		smallestPath string
		smallestSize int64 = -1
	)

	for key, path := range pathPool {
		size, err := getFileSize(path)
		if err != nil {
			return specConversionResult{}, &conversionError{"SL2", fmt.Sprintf("Failed to get file sizes. %s", err)}
		}
		if smallestSize < 0 || size < smallestSize {
			smallestKey = key
			smallestPath = path
			smallestSize = size
		}
	}

	for key, path := range pathPool {
		if key == smallestKey {
			continue
		}
		if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
			return specConversionResult{}, &conversionError{"SL4", fmt.Sprintf("Failed to delete tmp files. %s", err)}
		}
	}

	return specConversionResult{
		outputPath:      smallestPath,
		outputExt:       smallestKey,
		losslessJPEG:    smallestKey == "jxl" && jxlLosslessJPEG,
		reportedDstSize: smallestSize,
	}, nil
}

func ternaryInt(condition bool, ifTrue, ifFalse int) int {
	if condition {
		return ifTrue
	}
	return ifFalse
}
