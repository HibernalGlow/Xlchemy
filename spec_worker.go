package main

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

type specConversionResult struct {
	outputPath       string
	outputExt        string
	losslessJPEG     bool
	reportedDstSize  int64
}

func runWorkerSpec(ctx context.Context, idx int, fi FileItem, output OutputSettings, modify ModifySettings, settings AppSettings, threads int) (int64, int64, bool, *conversionError) {
	if !fileExists(fi.AbsPath) {
		return 0, 0, false, &conversionError{"C0", "File not found"}
	}

	outputDir := getOutputDir(fi, output)
	if err := os.MkdirAll(outputDir, 0o755); err != nil {
		return 0, 0, false, &conversionError{"S0", fmt.Sprintf("Failed to create output directory: %s", err)}
	}

	srcSize, _ := getFileSize(fi.AbsPath)
	srcAccessTime, srcModTime := sourceTimes(fi.AbsPath)

	if err := validateWorkerConflicts(ctx, fi.Ext, fi.AbsPath, output.Format, modify.Downscaling.Enabled); err != nil {
		return srcSize, 0, false, err
	}
	if err := validateOutputSpace(fi.AbsPath, outputDir); err != nil {
		return srcSize, 0, false, err
	}

	currentPath := fi.AbsPath
	currentExt := fi.Ext
	cleanupPaths := make([]string, 0, 4)
	defer func() {
		for _, path := range cleanupPaths {
			removeQuiet(path)
		}
	}()

	if needsDecodeProxy(output.Format, fi.Ext, settings, modify.Downscaling.Enabled) {
		proxyPath, err := generateProxy(ctx, fi.AbsPath, fi.Ext, outputDir)
		if err != nil {
			return srcSize, 0, false, err
		}
		cleanupPaths = append(cleanupPaths, proxyPath)
		currentPath = proxyPath
		currentExt = "png"
	}

	if modify.Downscaling.Enabled {
		downscaledPath := getUniqueTmpFilePath(outputDir, "png")
		if err := applyDownscaling(ctx, currentPath, downscaledPath, modify, threads); err != nil {
			removeQuiet(downscaledPath)
			return srcSize, 0, false, err
		}
		cleanupPaths = append(cleanupPaths, downscaledPath)
		currentPath = downscaledPath
		currentExt = "png"
	}

	result, err := executeSpecConversion(ctx, fi, currentPath, currentExt, outputDir, output, modify, settings, threads)
	if err != nil {
		if result.outputPath != "" {
			removeQuiet(result.outputPath)
		}
		return srcSize, 0, false, err
	}

	if result.outputPath == "" || !fileExists(result.outputPath) {
		return srcSize, 0, false, &conversionError{"F2", "Conversion failed (output not found)."}
	}
	if size, _ := getFileSize(result.outputPath); size == 0 {
		removeQuiet(result.outputPath)
		return srcSize, 0, false, &conversionError{"F3", "Conversion failed (output is empty)."}
	}

	if strings.HasPrefix(modify.Misc.KeepMetadata, "ExifTool") && !result.losslessJPEG {
		if err := runExifTool(fi.AbsPath, result.outputPath, modify.Misc.KeepMetadata, settings.ExifToolArgs); err != nil {
			return srcSize, 0, false, &conversionError{"E2", err.Error()}
		}
	}

	dstSize, _ := getFileSize(result.outputPath)
	if result.reportedDstSize > 0 {
		dstSize = result.reportedDstSize
	}

	finalOutput := buildFinalOutputPath(outputDir, fi.Name, result.outputExt)
	sameAsOriginal := samePath(fi.AbsPath, finalOutput)

	if output.IfFileExists == "Skip" && fileExists(finalOutput) {
		removeQuiet(result.outputPath)
		return srcSize, 0, true, nil
	}

	if settings.KeepIfLarger && dstSize >= srcSize {
		removeQuiet(result.outputPath)
		return srcSize, dstSize, false, nil
	}

	if settings.CopyIfLarger && dstSize >= srcSize && canCopyOriginalLarger(output.Format) && !sameAsOriginal {
		removeQuiet(result.outputPath)

		copyTarget := finalOutput
		switch output.IfFileExists {
		case "Rename", "Skip":
			copyTarget = getUniqueFilePath(outputDir, fi.Name, fi.Ext)
		case "Replace":
			if fileExists(copyTarget) {
				removeQuiet(copyTarget)
			}
		}

		if err := copyFile(fi.AbsPath, copyTarget); err != nil {
			return srcSize, 0, false, &conversionError{"F1", fmt.Sprintf("Copy original failed: %s", err)}
		}
		if modify.Misc.KeepTimestamps {
			_ = os.Chtimes(copyTarget, srcAccessTime, srcModTime)
		}
		if output.DeleteOriginal && !samePath(fi.AbsPath, copyTarget) {
			deleteOriginal(fi.AbsPath, output.DeleteOriginalMode)
		}
		return srcSize, srcSize, false, nil
	}

	targetOutput := finalOutput
	switch output.IfFileExists {
	case "Rename":
		targetOutput = getUniqueFilePath(outputDir, fi.Name, result.outputExt)
	case "Skip":
		if fileExists(targetOutput) {
			removeQuiet(result.outputPath)
			return srcSize, 0, true, nil
		}
	case "Replace":
		if fileExists(targetOutput) && sameAsOriginal {
			if (settings.KeepIfLarger || settings.CopyIfLarger) && dstSize >= srcSize {
				targetOutput = getUniqueFilePath(outputDir, fi.Name, result.outputExt)
				break
			}
			if !output.CustomOutputDir && output.DeleteOriginal {
				deleteOriginal(targetOutput, output.DeleteOriginalMode)
				break
			}
		}
		if fileExists(targetOutput) {
			removeQuiet(targetOutput)
		}
	}

	if err := os.Rename(result.outputPath, targetOutput); err != nil {
		return srcSize, 0, false, &conversionError{"F1", fmt.Sprintf("Rename failed: %s", err)}
	}

	if modify.Misc.KeepTimestamps {
		_ = os.Chtimes(targetOutput, srcAccessTime, srcModTime)
	}

	if output.DeleteOriginal && !samePath(fi.AbsPath, targetOutput) {
		deleteOriginal(fi.AbsPath, output.DeleteOriginalMode)
	}

	finalSize, _ := getFileSize(targetOutput)
	return srcSize, finalSize, false, nil
}

func executeSpecConversion(
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
	if output.Format == "Smallest Lossless" {
		return runSmallestLossless(ctx, fi, currentPath, currentExt, outputDir, output, modify, settings, threads)
	}

	outputExt, err := resolveOutputExtension(ctx, fi, output)
	if err != nil {
		return specConversionResult{}, err
	}

	tmpOutput := getUniqueTmpFilePath(outputDir, outputExt)
	result := specConversionResult{
		outputPath:   tmpOutput,
		outputExt:    outputExt,
		losslessJPEG: isLosslessJPEGOutput(fi, currentPath, currentExt, output, settings),
	}

	taskItem := FileItem{
		AbsPath: currentPath,
		Name:    fi.Name,
		Ext:     currentExt,
		Dir:     filepath.Dir(currentPath),
		Size:    fi.Size,
	}

	switch output.Format {
	case "JPEG XL":
		if err := convertJXL(ctx, taskItem, tmpOutput, output, modify, settings, threads); err != nil {
			return result, err
		}
	case "AVIF":
		if err := convertAVIF(ctx, taskItem, tmpOutput, output, modify, settings, threads); err != nil {
			return result, err
		}
	case "JPEG":
		if err := convertJPEG(ctx, taskItem, tmpOutput, output, modify, settings, threads); err != nil {
			return result, err
		}
	case "WebP":
		if err := convertWebP(ctx, taskItem, tmpOutput, output, modify, settings, threads); err != nil {
			return result, err
		}
	case "PNG":
		if err := convertPNG(ctx, taskItem, tmpOutput, output, modify, settings, threads); err != nil {
			return result, err
		}
	case "Lossless JPEG Transcoding":
		if err := convertLosslessJPEGSpec(ctx, fi, tmpOutput, output, settings, threads); err != nil {
			return result, err
		}
		result.losslessJPEG = true
	case "JPEG Reconstruction":
		if outputExt == "jpg" {
			if err := convertJPEGReconstruction(ctx, taskItem, tmpOutput, output, settings, threads); err != nil {
				return result, err
			}
		} else {
			if err := convertPNG(ctx, taskItem, tmpOutput, output, modify, settings, threads); err != nil {
				return result, err
			}
		}
	default:
		return result, &conversionError{"C0", fmt.Sprintf("Unknown format: %s", output.Format)}
	}

	return result, nil
}

func resolveOutputExtension(ctx context.Context, fi FileItem, output OutputSettings) (string, *conversionError) {
	switch output.Format {
	case "JPEG Reconstruction":
		if strings.ToLower(fi.Ext) != "jxl" {
			return "", &conversionError{"S3", "Only JPEG XL images are allowed."}
		}
		ext, err := getExtensionJXL(ctx, fi.AbsPath)
		if err != nil {
			return "", &conversionError{"S4", err.Error()}
		}
		if ext != "jpg" && !output.JXLPNGFallback {
			return "", &conversionError{"S4", "Reconstruction data not found."}
		}
		return ext, nil
	case "Lossless JPEG Transcoding":
		if !IsJPEGAlias(fi.Ext) {
			return "", &conversionError{"S5", "Only JPEG images are allowed."}
		}
		return "jxl", nil
	default:
		ext := GetExtension(output.Format)
		if ext == "" {
			return "", &conversionError{"PG0", fmt.Sprintf("No extension declared for %s", output.Format)}
		}
		return ext, nil
	}
}

func getExtensionJXL(ctx context.Context, srcPath string) (string, error) {
	output, err := RunBinaryOutput(ctx, JxlInfoPath, srcPath)
	if err != nil {
		return "", err
	}
	if strings.Contains(output, "JPEG bitstream reconstruction data available") {
		return "jpg", nil
	}
	return "png", nil
}

func convertLosslessJPEGSpec(ctx context.Context, fi FileItem, dstPath string, output OutputSettings, settings AppSettings, threads int) *conversionError {
	if !IsJPEGAlias(fi.Ext) {
		return &conversionError{"S5", "Only JPEG images are allowed."}
	}

	sourcePath := fi.AbsPath
	normalizedPath := ""
	cleanupNormalized := func() {
		if normalizedPath != "" {
			removeQuiet(normalizedPath)
		}
	}
	defer cleanupNormalized()

	normalize := func() *conversionError {
		normalizedPath = getUniqueTmpFilePath(filepath.Dir(dstPath), "jpg")
		success, _, stderr := normalizeJPEG(ctx, fi.AbsPath, normalizedPath)
		if !success {
			return &conversionError{"lossless_jpeg_2", fmt.Sprintf("Normalizing failed. %s", stderr)}
		}
		sourcePath = normalizedPath
		return nil
	}

	if output.JXLNormalizeEnable && output.JXLNormalizeWhen == "Always" {
		if err := normalize(); err != nil {
			return err
		}
	}

	success, _, stderr := transcodeJPEGToJPEGXL(ctx, sourcePath, dstPath, output.Effort, threads)
	if !success {
		if normalizedPath == "" && output.JXLNormalizeEnable && output.JXLNormalizeWhen == "On Fail" {
			if err := normalize(); err != nil {
				return err
			}
			success, _, stderr = transcodeJPEGToJPEGXL(ctx, sourcePath, dstPath, output.Effort, threads)
			if !success {
				return &conversionError{"lossless_jpeg_3", fmt.Sprintf("Transcoding failed. Image may be CMYK or of other unsupported type.\n\n%s", stderr)}
			}
		} else if normalizedPath != "" {
			return &conversionError{"lossless_jpeg_4", fmt.Sprintf("Transcoding failed. Image may be CMYK or of other unsupported type.\n\n%s", stderr)}
		} else {
			return &conversionError{"lossless_jpeg_5", fmt.Sprintf("Transcoding failed most likely due to the limitations of Lossless JPEG Transcoding. Enabling \"Normalize\" may help; however you should review the documentation before doing so.\n\n%s", stderr)}
		}
	}

	if output.JXLVerify {
		verifyPath := getUniqueTmpFilePath(filepath.Dir(dstPath), "jpg")
		ok, _, verifyErr, verifyFailure := verifyJPEGXLReconstructionData(ctx, dstPath, sourcePath, verifyPath, threads)
		if verifyFailure != nil {
			msg := verifyFailure.Error()
			if strings.HasPrefix(msg, "jxl_verify_1:") {
				return &conversionError{"jxl_verify_1", strings.TrimPrefix(msg, "jxl_verify_1: ")}
			}
			return &conversionError{"jxl_verify_0", strings.TrimPrefix(msg, "jxl_verify_0: ")}
		}
		if !ok {
			removeQuiet(dstPath)
			return &conversionError{"lossless_jpeg_0", fmt.Sprintf("Verification failed. %s", verifyErr)}
		}
	}

	return nil
}

func isLosslessJPEGOutput(fi FileItem, currentPath, currentExt string, output OutputSettings, settings AppSettings) bool {
	if output.Format != "JPEG XL" || !output.Lossless || !settings.JXLAutolosslessJPEG {
		return false
	}
	return samePath(fi.AbsPath, currentPath) && IsJPEGAlias(currentExt)
}

func samePath(a, b string) bool {
	cleanA := filepath.Clean(a)
	cleanB := filepath.Clean(b)
	if runtime.GOOS == "windows" {
		return strings.EqualFold(cleanA, cleanB)
	}
	return cleanA == cleanB
}

func sourceTimes(path string) (time.Time, time.Time) {
	info, err := os.Stat(path)
	if err != nil {
		return time.Time{}, time.Time{}
	}
	return info.ModTime(), info.ModTime()
}

func canCopyOriginalLarger(format string) bool {
	switch format {
	case "Lossless JPEG Transcoding", "JPEG Reconstruction", "PNG":
		return false
	default:
		return true
	}
}

func deleteOriginal(path, mode string) {
	if mode == "To Trash" {
		if err := moveToTrash(path); err == nil {
			return
		}
	}
	removeQuiet(path)
}

func copyFile(srcPath, dstPath string) error {
	src, err := os.Open(srcPath)
	if err != nil {
		return err
	}
	defer src.Close()

	dst, err := os.Create(dstPath)
	if err != nil {
		return err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return err
	}
	return dst.Close()
}
