package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

var (
	allowedInputCJXL        = append([]string{}, append(JPEGAliases, "png", "apng", "gif", "jxl")...)
	allowedInputCJPEGLI     = append([]string{}, append(JPEGAliases, "png", "jxl")...)
	allowedInputImageMagick = append([]string{}, append(JPEGAliases, "png", "gif", "webp", "jp2", "bmp", "ico", "tiff", "tif")...)
	allowedInputAvifEnc     = append([]string{}, append(JPEGAliases, "png")...)
)

func supportsInput(ext string, allowed []string) bool {
	ext = strings.ToLower(strings.TrimSpace(ext))
	for _, candidate := range allowed {
		if candidate == ext {
			return true
		}
	}
	return false
}

func supportsImageMagickInput(ext string) bool {
	return supportsInput(ext, allowedInputImageMagick)
}

func needsDecodeProxy(format, srcExt string, settings AppSettings, downscalingEnabled bool) bool {
	srcExt = strings.ToLower(strings.TrimSpace(srcExt))

	if format == "Smallest Lossless" {
		return true
	}
	if format == "PNG" || format == "Lossless JPEG Transcoding" || format == "JPEG Reconstruction" {
		return false
	}
	if downscalingEnabled {
		return !supportsImageMagickInput(srcExt)
	}

	switch format {
	case "JPEG XL":
		return !supportsInput(srcExt, allowedInputCJXL)
	case "AVIF":
		return !supportsInput(srcExt, allowedInputAvifEnc)
	case "WebP":
		return !supportsImageMagickInput(srcExt)
	case "JPEG":
		if settings.JPGEncoder == "JPEGLI" {
			return !supportsInput(srcExt, allowedInputCJPEGLI)
		}
		return !supportsImageMagickInput(srcExt)
	default:
		return false
	}
}

func generateProxy(ctx context.Context, srcPath, srcExt, outputDir string) (string, *conversionError) {
	proxyPath := getUniqueTmpFilePath(outputDir, "png")
	decoder := GetDecoder(srcExt)
	if decoder == "" {
		return "", &conversionError{"Proxy0", fmt.Sprintf("No decoder available for %s", srcExt)}
	}

	_, stderr, err := RunBinary(ctx, decoder, GetDecoderArgs(decoder, 1), srcPath, proxyPath, decoder == ImageMagickPath)
	if err != nil || !fileExists(proxyPath) {
		_ = os.Remove(proxyPath)
		if GlobalTaskStatus.WasCanceled() {
			return "", &conversionError{"X0", "Canceled"}
		}
		return "", &conversionError{"Proxy1", fmt.Sprintf("Generating proxy failed. %s", stderr)}
	}

	return proxyPath, nil
}

// removeQuiet is defined in spec_worker_windows.go / spec_worker_unix.go

func buildFinalOutputPath(outputDir, fileName, fileExt string) string {
	return filepath.Join(outputDir, fmt.Sprintf("%s.%s", fileName, fileExt))
}
