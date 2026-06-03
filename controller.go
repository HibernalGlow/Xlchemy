package main

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// runConversion orchestrates the batch conversion process.
func runConversion(ctx context.Context, items []FileItem, output OutputSettings, modify ModifySettings, settings AppSettings, threadCount int) {
	total := len(items)
	if total == 0 {
		return
	}

	var completed atomic.Int32
	startTime := time.Now()

	// Create a semaphore to limit concurrent workers
	sem := make(chan struct{}, threadCount)
	var wg sync.WaitGroup

	// Emit initial progress
	App.Event.Emit("conversion:progress", ProgressEvent{
		Completed: 0,
		Total:     total,
		Line1:     "Starting the conversion...",
		Line2:     "",
	})

	for i, item := range items {
		if GlobalTaskStatus.WasCanceled() {
			break
		}

		sem <- struct{}{} // acquire
		wg.Add(1)

		go func(idx int, fi FileItem) {
			defer func() {
				<-sem // release
				wg.Done()
			}()

			if GlobalTaskStatus.WasCanceled() {
				return
			}

			// Run the worker for this file
			srcSize, dstSize, skipped, exc := runWorker(ctx, idx, fi, output, modify, settings, threadCount)

			if exc != nil {
				App.Event.Emit("conversion:exception", ExceptionEvent{
					ID:   exc.id,
					Msg:  exc.msg,
					Path: fi.AbsPath,
				})
			}

			n := completed.Add(1)

			if !skipped {
				line1 := ""
				if srcSize > 0 && dstSize > 0 {
					srcStr := formatSize(srcSize)
					dstStr := formatSize(dstSize)
					pct := float64(srcSize-dstSize) / float64(srcSize) * 100
					pctStr := fmt.Sprintf("-%.0f%%", pct)
					if pct < 0 {
						pctStr = fmt.Sprintf("+%.0f%%", -pct)
					}
					line1 = fmt.Sprintf("%s : %s → %s (%s)", filepath.Base(fi.AbsPath), srcStr, dstStr, pctStr)
				} else {
					line1 = fmt.Sprintf("Converted %d out of %d images", n, total)
				}

				// ETA calculation
				elapsed := time.Since(startTime)
				remaining := time.Duration(0)
				if n > 0 {
					perItem := elapsed / time.Duration(n)
					remaining = perItem * time.Duration(total-int(n))
				}
				line2 := formatTimeLeft(remaining)

				App.Event.Emit("conversion:progress", ProgressEvent{
					Completed: int(n),
					Total:     total,
					Line1:     line1,
					Line2:     line2,
				})
			}
		}(i, item)
	}

	wg.Wait()
}

type conversionError struct {
	id  string
	msg string
}

// runWorker processes a single file conversion.
func runWorker(ctx context.Context, idx int, fi FileItem, output OutputSettings, modify ModifySettings, settings AppSettings, threads int) (int64, int64, bool, *conversionError) {
	// Check if file still exists
	if _, err := os.Stat(fi.AbsPath); os.IsNotExist(err) {
		return 0, 0, false, &conversionError{"C0", "File not found"}
	}

	// Get output directory
	outputDir := fi.Dir
	if output.CustomOutputDir && output.CustomOutputDirPath != "" {
		if filepath.IsAbs(output.CustomOutputDirPath) {
			outputDir = output.CustomOutputDirPath
		} else if !output.KeepDirStruct {
			outputDir = filepath.Join(fi.Dir, output.CustomOutputDirPath)
		}
	}
	if output.KeepDirStruct && output.CustomOutputDir {
		// Preserve relative structure from anchor
		outputDir = filepath.Join(output.CustomOutputDirPath, fi.Dir)
	}

	// Create output directory
	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return 0, 0, false, &conversionError{"S0", fmt.Sprintf("Failed to create output directory: %s", err)}
	}

	// Determine output extension
	outputExt := GetExtension(output.Format)
	if output.Format == "Lossless JPEG Transcoding" {
		outputExt = "jxl"
	}

	// Build output path
	finalOutput := filepath.Join(outputDir, fi.Name+"."+outputExt)

	// Skip if exists
	if output.IfFileExists == "Skip" {
		if _, err := os.Stat(finalOutput); err == nil {
			return 0, 0, true, nil
		}
	}

	// Create temp output path
	tmpOutput := finalOutput + ".tmp_" + fmt.Sprintf("%d", idx)

	// Get source file size
	srcSize, _ := getFileSize(fi.AbsPath)

	// Handle downscaling if enabled
	var actualSrcPath string
	if modify.Downscaling.Enabled {
		// Create temp file for downscaled image
		downscaledPath := fi.AbsPath + ".downscaled_" + fmt.Sprintf("%d", idx)
		err := applyDownscaling(ctx, fi.AbsPath, downscaledPath, modify, threads)
		if err != nil {
			_ = os.Remove(downscaledPath)
			return srcSize, 0, false, err
		}
		actualSrcPath = downscaledPath
	} else {
		actualSrcPath = fi.AbsPath
	}

	// Run the actual conversion based on format
	var err *conversionError
	switch output.Format {
	case "JPEG XL":
		err = convertJXL(ctx, FileItem{AbsPath: actualSrcPath, Name: fi.Name, Ext: fi.Ext, Dir: fi.Dir}, tmpOutput, output, modify, settings, threads)
	case "AVIF":
		err = convertAVIF(ctx, FileItem{AbsPath: actualSrcPath, Name: fi.Name, Ext: fi.Ext, Dir: fi.Dir}, tmpOutput, output, modify, settings, threads)
	case "JPEG":
		err = convertJPEG(ctx, FileItem{AbsPath: actualSrcPath, Name: fi.Name, Ext: fi.Ext, Dir: fi.Dir}, tmpOutput, output, modify, settings, threads)
	case "WebP":
		err = convertWebP(ctx, FileItem{AbsPath: actualSrcPath, Name: fi.Name, Ext: fi.Ext, Dir: fi.Dir}, tmpOutput, output, modify, settings, threads)
	case "PNG":
		err = convertPNG(ctx, FileItem{AbsPath: actualSrcPath, Name: fi.Name, Ext: fi.Ext, Dir: fi.Dir}, tmpOutput, output, modify, settings, threads)
	case "Lossless JPEG Transcoding":
		err = convertLosslessJPEG(ctx, FileItem{AbsPath: actualSrcPath, Name: fi.Name, Ext: fi.Ext, Dir: fi.Dir}, tmpOutput, output, settings, threads)
	case "JPEG Reconstruction":
		err = convertJPEGReconstruction(ctx, FileItem{AbsPath: actualSrcPath, Name: fi.Name, Ext: fi.Ext, Dir: fi.Dir}, tmpOutput, output, settings, threads)
	default:
		err = &conversionError{"C0", fmt.Sprintf("Unknown format: %s", output.Format)}
	}

	// Clean up downscaled temp file
	if modify.Downscaling.Enabled && actualSrcPath != fi.AbsPath {
		_ = os.Remove(actualSrcPath)
	}

	if err != nil {
		// Clean up tmp file
		_ = os.Remove(tmpOutput)
		return srcSize, 0, false, err
	}

	if GlobalTaskStatus.WasCanceled() {
		_ = os.Remove(tmpOutput)
		return srcSize, 0, false, &conversionError{"X0", "Canceled"}
	}

	// Get source file timestamps before any modifications
	var srcModTime, srcAccessTime time.Time
	if modify.Misc.KeepTimestamps || settings.KeepIfLarger || settings.CopyIfLarger {
		if info, statErr := os.Stat(fi.AbsPath); statErr == nil {
			srcModTime = info.ModTime()
			srcAccessTime = info.ModTime() // Use mod time as access time approximation
		}
	}

	// Rename tmp to final
	finalOutput = handleExistingFile(finalOutput, output.IfFileExists)
	if renameErr := os.Rename(tmpOutput, finalOutput); renameErr != nil {
		return srcSize, 0, false, &conversionError{"F1", fmt.Sprintf("Rename failed: %s", renameErr)}
	}

	// Run ExifTool post-processing if needed
	if strings.HasPrefix(modify.Misc.KeepMetadata, "ExifTool") {
		if err := runExifTool(fi.AbsPath, finalOutput, modify.Misc.KeepMetadata, settings.ExifToolArgs); err != nil {
			// Log error but don't fail the conversion
			fmt.Printf("[ExifTool] %s\n", err.Error())
		}
	}

	dstSize, _ := getFileSize(finalOutput)

	// Handle KeepIfLarger / CopyIfLarger
	keepOriginal := false
	if settings.KeepIfLarger && dstSize >= srcSize {
		// Result is larger or equal, keep original and delete result
		_ = os.Remove(finalOutput)
		keepOriginal = true
	} else if settings.CopyIfLarger && dstSize >= srcSize {
		// Result is larger or equal, copy original to output location
		_ = os.Remove(finalOutput)
		_ = os.Rename(fi.AbsPath, finalOutput)
		keepOriginal = true
	}

	// Apply timestamps to output file if requested
	if modify.Misc.KeepTimestamps && !keepOriginal {
		_ = os.Chtimes(finalOutput, srcAccessTime, srcModTime)
	}

	// Delete original file if requested (and not keeping due to size)
	if output.DeleteOriginal && !keepOriginal {
		if output.DeleteOriginalMode == "To Trash" {
			// Move to trash (recycle bin on Windows)
			if err := moveToTrash(fi.AbsPath); err != nil {
				// Fallback to permanent delete if trash fails
				_ = os.Remove(fi.AbsPath)
			}
		} else {
			// Permanent delete
			_ = os.Remove(fi.AbsPath)
		}
	}

	return srcSize, dstSize, false, nil
}

// convertJXL converts an image to JPEG XL format.
func convertJXL(ctx context.Context, fi FileItem, dstPath string, output OutputSettings, modify ModifySettings, settings AppSettings, threads int) *conversionError {
	args := make([]string, 0, 6)

	if output.Lossless {
		args = append(args, "-q 100")
		if settings.JXLAutolosslessJPEG && IsJPEGAlias(fi.Ext) {
			args = append(args, "--lossless_jpeg=1")
		} else {
			args = append(args, "--lossless_jpeg=0")
		}
	} else {
		args = append(args, fmt.Sprintf("-q %d", output.Quality))
		args = append(args, "--lossless_jpeg=0")
	}

	args = append(args, fmt.Sprintf("-e %d", output.Effort))
	args = append(args, fmt.Sprintf("--num_threads=%d", threads))

	if !output.Lossless && output.JXLModular {
		args = append(args, "--modular=1")
	}

	// Metadata args
	args = append(args, getMetadataArgs(CJXlPath, modify.Misc.KeepMetadata, false)...)

	// Custom args
	if settings.EnableCustomArgs && settings.CJXLArgs != "" {
		args = append(args, settings.CJXLArgs)
	}

	_, stderr, err := RunBinary(ctx, CJXlPath, args, fi.AbsPath, dstPath, false)
	if err != nil {
		if GlobalTaskStatus.WasCanceled() {
			return &conversionError{"X0", "Canceled"}
		}
		return &conversionError{"C3", fmt.Sprintf("[cjxl] %s", stderr)}
	}

	if _, statErr := os.Stat(dstPath); os.IsNotExist(statErr) {
		return &conversionError{"C3", fmt.Sprintf("[cjxl] %s", stderr)}
	}
	return nil
}

// convertAVIF converts an image to AVIF format.
func convertAVIF(ctx context.Context, fi FileItem, dstPath string, output OutputSettings, modify ModifySettings, settings AppSettings, threads int) *conversionError {
	// Handle slimg encoder separately (uses native library, not avifenc)
	if settings.AvifEncoder == "slimg" {
		return convertAVIFWithSlimg(ctx, fi.AbsPath, dstPath, output.Quality)
	}

	args := []string{
		fmt.Sprintf("-q %d", output.Quality),
		fmt.Sprintf("-s %d", output.Effort),
		fmt.Sprintf("-j %d", threads),
	}

	switch settings.AvifEncoder {
	case "AOM AV1":
		args = append(args, "-c aom")
		if output.AOMAV1ChromaSub != "Default" {
			args = append(args, fmt.Sprintf("-y %s", strings.ReplaceAll(output.AOMAV1ChromaSub, ":", "")))
		}
		if settings.AvifAOMIQTune {
			args = append(args, "-a tune=iq")
		}
	case "SVT-AV1-PSY":
		args = append(args, "-c svt")
		args = append(args, "-y 420")
		args = append(args, "-a tune=4")
	}

	args = append(args, getMetadataArgs(AvifEncPath, modify.Misc.KeepMetadata, false)...)

	if settings.EnableCustomArgs && settings.AvifEncArgs != "" {
		args = append(args, settings.AvifEncArgs)
	}

	_, stderr, err := RunBinary(ctx, AvifEncPath, args, fi.AbsPath, dstPath, false)
	if err != nil {
		if GlobalTaskStatus.WasCanceled() {
			return &conversionError{"X0", "Canceled"}
		}
		return &conversionError{"C3", fmt.Sprintf("[avifenc] %s", stderr)}
	}
	return nil
}

// convertJPEG converts an image to JPEG format.
func convertJPEG(ctx context.Context, fi FileItem, dstPath string, output OutputSettings, modify ModifySettings, settings AppSettings, threads int) *conversionError {
	var encoderPath string
	var args []string

	if settings.JPGEncoder == "JPEGLI" {
		encoderPath = CJPEGLIPath
		args = []string{fmt.Sprintf("-q %d", output.Quality)}
		if settings.DisableProgressiveJPEGLI {
			args = append(args, "-p 0")
		}
		if output.JPEGLIChromaSub != "Default" {
			args = append(args, fmt.Sprintf("--chroma_subsampling=%s", strings.ReplaceAll(output.JPEGLIChromaSub, ":", "")))
		}
	} else {
		encoderPath = ImageMagickPath
		args = []string{fmt.Sprintf("-quality %d", output.Quality)}
		if output.JPGChromaSub != "Default" {
			args = append(args, fmt.Sprintf("-sampling-factor %s", output.JPGChromaSub))
		}
	}

	args = append(args, getMetadataArgs(encoderPath, modify.Misc.KeepMetadata, false)...)

	if settings.EnableCustomArgs {
		if encoderPath == CJPEGLIPath && settings.CJPEGLIArgs != "" {
			args = append(args, settings.CJPEGLIArgs)
		} else if encoderPath == ImageMagickPath && settings.IMArgs != "" {
			args = append(args, settings.IMArgs)
		}
	}

	_, stderr, err := RunBinary(ctx, encoderPath, args, fi.AbsPath, dstPath, encoderPath == ImageMagickPath)
	if err != nil {
		if GlobalTaskStatus.WasCanceled() {
			return &conversionError{"X0", "Canceled"}
		}
		name := filepath.Base(encoderPath)
		return &conversionError{"C3", fmt.Sprintf("[%s] %s", name, stderr)}
	}
	return nil
}

// convertWebP converts an image to WebP format.
func convertWebP(ctx context.Context, fi FileItem, dstPath string, output OutputSettings, modify ModifySettings, settings AppSettings, threads int) *conversionError {
	args := []string{}
	if output.Lossless {
		args = append(args, "-define webp:lossless=true")
	} else {
		args = append(args, fmt.Sprintf("-quality %d", output.Quality))
	}
	threadLevel := 0
	if threads > 1 {
		threadLevel = 1
	}
	args = append(args, fmt.Sprintf("-define webp:thread-level=%d", threadLevel))
	args = append(args, fmt.Sprintf("-define webp:method=%d", output.Effort))

	args = append(args, getMetadataArgs(ImageMagickPath, modify.Misc.KeepMetadata, false)...)

	if settings.EnableCustomArgs && settings.IMArgs != "" {
		args = append(args, settings.IMArgs)
	}

	_, stderr, err := RunBinary(ctx, ImageMagickPath, args, fi.AbsPath, dstPath, true)
	if err != nil {
		if GlobalTaskStatus.WasCanceled() {
			return &conversionError{"X0", "Canceled"}
		}
		return &conversionError{"C3", fmt.Sprintf("[magick] %s", stderr)}
	}
	return nil
}

// convertPNG converts an image to PNG format (decode only, then oxipng).
func convertPNG(ctx context.Context, fi FileItem, dstPath string, output OutputSettings, modify ModifySettings, settings AppSettings, threads int) *conversionError {
	decoder := GetDecoder(fi.Ext)
	if decoder == "" {
		return &conversionError{"C4", fmt.Sprintf("No decoder for %s", fi.Ext)}
	}
	args := GetDecoderArgs(decoder, threads)
	args = append(args, getMetadataArgs(decoder, modify.Misc.KeepMetadata, false)...)

	_, stderr, err := RunBinary(ctx, decoder, args, fi.AbsPath, dstPath, decoder == ImageMagickPath)
	if err != nil {
		if GlobalTaskStatus.WasCanceled() {
			return &conversionError{"X0", "Canceled"}
		}
		return &conversionError{"C3", fmt.Sprintf("[decode] %s", stderr)}
	}
	return nil
}

// convertLosslessJPEG transcodes JPEG to JXL losslessly.
func convertLosslessJPEG(ctx context.Context, fi FileItem, dstPath string, output OutputSettings, settings AppSettings, threads int) *conversionError {
	if !IsJPEGAlias(fi.Ext) {
		return &conversionError{"S5", "Only JPEG images are allowed."}
	}
	args := []string{
		fmt.Sprintf("-e %d", output.Effort),
		fmt.Sprintf("--num_threads=%d", threads),
	}
	_, stderr, err := RunBinary(ctx, CJXlPath, args, fi.AbsPath, dstPath, false)
	if err != nil {
		if GlobalTaskStatus.WasCanceled() {
			return &conversionError{"X0", "Canceled"}
		}
		return &conversionError{"C3", fmt.Sprintf("[cjxl] %s", stderr)}
	}
	return nil
}

// convertJPEGReconstruction reconstructs JPEG from JXL.
func convertJPEGReconstruction(ctx context.Context, fi FileItem, dstPath string, output OutputSettings, settings AppSettings, threads int) *conversionError {
	if fi.Ext != "jxl" {
		return &conversionError{"S3", "Only JPEG XL images are allowed."}
	}
	args := []string{
		fmt.Sprintf("--num_threads=%d", threads),
		"--jpeg_reconstruction",
	}
	_, stderr, err := RunBinary(ctx, DJXlPath, args, fi.AbsPath, dstPath, false)
	if err != nil {
		if GlobalTaskStatus.WasCanceled() {
			return &conversionError{"X0", "Canceled"}
		}
		return &conversionError{"C3", fmt.Sprintf("[djxl] %s", stderr)}
	}
	return nil
}

// getMetadataArgs returns encoder-specific metadata arguments.
func getMetadataArgs(encoderPath string, mode string, losslessJPEG bool) []string {
	switch mode {
	case "Encoder - Wipe":
		if encoderPath == CJXlPath && !losslessJPEG {
			return []string{"-x", "strip=exif", "-x", "strip=xmp", "-x", "strip=jumbf"}
		}
		// ImageMagick, avifenc, etc. handle stripping natively
		return nil
	case "Encoder - Preserve":
		// Most encoders preserve metadata by default
		return nil
	default:
		// ExifTool modes handled post-conversion
		return nil
	}
}

// handleExistingFile handles the "if file exists" policy.
func handleExistingFile(path string, mode string) string {
	switch mode {
	case "Replace":
		_ = os.Remove(path)
		return path
	case "Rename":
		// Generate unique filename
		ext := filepath.Ext(path)
		name := path[:len(path)-len(ext)]
		counter := 1
		for {
			newPath := fmt.Sprintf("%s_%d%s", name, counter, ext)
			if _, err := os.Stat(newPath); os.IsNotExist(err) {
				return newPath
			}
			counter++
		}
	default:
		return path
	}
}

// moveToTrash moves a file to the trash/recycle bin.
func moveToTrash(path string) error {
	// On Windows, use SHFileOperation to move to recycle bin
	// For simplicity, we'll use a PowerShell command
	cmd := fmt.Sprintf("Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('%s', 'OnlyErrorDialogs', 'SendToRecycleBin')", path)
	_, stderr, err := RunPowerShell(cmd)
	if err != nil {
		return fmt.Errorf("trash failed: %s", stderr)
	}
	return nil
}

// RunPowerShell executes a PowerShell command.
func RunPowerShell(script string) (string, string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "powershell", "-NoProfile", "-NonInteractive", "-Command", script)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	return stdout.String(), stderr.String(), err
}

// Helper functions

func getFileSize(path string) (int64, error) {
	info, err := os.Stat(path)
	if err != nil {
		return 0, err
	}
	return info.Size(), nil
}

func formatSize(bytes int64) string {
	if bytes >= 1024*1024 {
		return fmt.Sprintf("%.2f MB", float64(bytes)/(1024*1024))
	} else if bytes >= 1024 {
		return fmt.Sprintf("%.1f KB", float64(bytes)/1024)
	}
	return fmt.Sprintf("%d B", bytes)
}

func formatTimeLeft(d time.Duration) string {
	if d <= 0 {
		return ""
	}
	total := int(d.Seconds())
	if total < 60 {
		return fmt.Sprintf("%d s left", total)
	}
	mins := total / 60
	secs := total % 60
	if mins < 60 {
		return fmt.Sprintf("%d m %d s left", mins, secs)
	}
	hours := mins / 60
	mins = mins % 60
	return fmt.Sprintf("%d h %d m left", hours, mins)
}

// getTooltips returns the tooltip map.
func getTooltips() map[string]string {
	return map[string]string{
		"duplicates":    "What to do when an output image of the same name already exists.",
		"threads":       "How many CPU threads to use for conversion.\n\nHigher means faster, but leaves less resources for other processes.",
		"output_src":    "Saves images next to their sources.",
		"output_ct":     "Saves images to the specified folder.",
		"keep_dir_struct": "Preserves folder hierarchy when saving images.",
		"delete_original": "Deletes the input image after conversion.",
		"format":        "Which format are you converting to.",
		"lossless":      "Enables lossless compression.\n\nPixel data will stay the same.",
		"effort":        "Higher means better quality and/or smaller file size but slower.",
		"quality_jpeg_xl": "Higher values result in higher quality and higher file size.\n\n90 - visually lossless\n80 - high quality\n70 - medium-high quality\n60 - space-saving",
		"quality_avif":  "Higher values result in higher quality and higher file size.",
		"quality_webp":  "Higher values result in higher quality and higher file size.",
		"quality_jpeg":  "Higher values result in higher quality and higher file size.",
		"keep_timestamps": "Preserves original date & time file attributes.",
		"metadata":      "Controls how metadata is handled.",
		"downscaling":   "Scales down the resolution of your image.",
		"play_sound_on_finish": "Plays a sound when conversion finishes.",
		"avif_encoder":  "Encoder used for encoding AVIF images.",
		"jpeg_encoder":  "JPEGLI - the new state of the art in JPEG encoding.\n\nlibjpeg - the original JPEG encoder.",
	}
}

// applyDownscaling applies downscaling to an image using ImageMagick.
func applyDownscaling(ctx context.Context, srcPath string, dstPath string, modify ModifySettings, threads int) *conversionError {
	ds := modify.Downscaling
	if !ds.Enabled {
		return nil
	}

	args := make([]string, 0, 4)

	// Add resampling filter if specified
	if ds.Resample != "Default" {
		args = append(args, fmt.Sprintf("-filter %s", ds.Resample))
	}

	// Build resize argument based on mode
	switch ds.Mode {
	case "Resolution":
		if ds.Width > 0 && ds.Height > 0 {
			args = append(args, fmt.Sprintf("-resize %dx%d>", ds.Width, ds.Height))
		} else if ds.Width > 0 {
			args = append(args, fmt.Sprintf("-resize %dx>", ds.Width))
		} else if ds.Height > 0 {
			args = append(args, fmt.Sprintf("-resize x%d>", ds.Height))
		} else {
			return nil // No downscaling needed
		}

	case "Percent":
		percent := ds.Percent
		if percent < 1 {
			percent = 1
		} else if percent > 100 {
			percent = 100
		}
		args = append(args, fmt.Sprintf("-resize %.0f%%", percent))

	case "Shortest Side":
		if ds.ShortestSide > 0 {
			args = append(args, fmt.Sprintf("-resize %dx%d^>", ds.ShortestSide, ds.ShortestSide))
		}

	case "Longest Side":
		if ds.LongestSide > 0 {
			args = append(args, fmt.Sprintf("-resize %dx%d>", ds.LongestSide, ds.LongestSide))
		}

	case "Megapixels":
		mpx := int(ds.Megapixels * 1000000)
		if mpx > 0 {
			args = append(args, fmt.Sprintf("-resize %d@>", mpx))
		}

	case "File Size":
		// File Size mode requires iterative approach - simplified version
		// Estimate percentage based on desired file size
		// This is a simplified implementation
		if ds.FileSize > 0 {
			// Start with a rough estimate: 50% scale
			args = append(args, fmt.Sprintf("-resize 50%%"))
		}

	default:
		return nil // Unknown mode, skip downscaling
	}

	// Run ImageMagick resize
	_, stderr, err := RunBinary(ctx, ImageMagickPath, args, srcPath, dstPath, true)
	if err != nil {
		if GlobalTaskStatus.WasCanceled() {
			return &conversionError{"X0", "Canceled"}
		}
		return &conversionError{"D1", fmt.Sprintf("[magick downscale] %s", stderr)}
	}

	return nil
}

// runExifTool runs ExifTool post-processing after conversion.
func runExifTool(srcPath string, dstPath string, mode string, exifToolArgs map[string]string) error {
	// Get the args for the specified mode
	argsStr, ok := exifToolArgs[mode]
	if !ok || argsStr == "" {
		return fmt.Errorf("no ExifTool args configured for mode: %s", mode)
	}

	// Parse args (space-separated, but need to handle $src and $dst)
	args := strings.Fields(argsStr)
	
	// Replace $src and $dst with actual paths
	for i, arg := range args {
		switch arg {
		case "$src":
			args[i] = srcPath
		case "$dst":
			args[i] = dstPath
		}
	}

	// On Windows, use argfile to handle UTF-8 paths
	if runtime.GOOS == "windows" {
		// Create temporary argfile
		tmpFile, err := os.CreateTemp("", "exiftool_args_*.txt")
		if err != nil {
			return fmt.Errorf("failed to create argfile: %v", err)
		}
		tmpPath := tmpFile.Name()
		defer os.Remove(tmpPath)

		// Write args to file (UTF-8 encoded)
		for _, arg := range args {
			_, err := tmpFile.WriteString(arg + "\n")
			if err != nil {
				tmpFile.Close()
				return fmt.Errorf("failed to write argfile: %v", err)
			}
		}
		tmpFile.Close()

		// Run ExifTool with argfile
		exifToolCmd := ExifToolPath
		if exifToolCmd == "" {
			exifToolCmd = "exiftool"
		}
		cmd := exec.Command(exifToolCmd, "-charset", "filename=UTF8", "-@", filepath.Base(tmpPath))
		cmd.Dir = filepath.Dir(tmpPath)
		_, err = cmd.CombinedOutput()
		if err != nil {
			return fmt.Errorf("exiftool failed: %v", err)
		}
	} else {
		// On Linux/macOS, run directly
		exifToolCmd := "exiftool"
		cmd := exec.Command(exifToolCmd, args...)
		_, err := cmd.CombinedOutput()
		if err != nil {
			return fmt.Errorf("exiftool failed: %v", err)
		}
	}

	return nil
}
