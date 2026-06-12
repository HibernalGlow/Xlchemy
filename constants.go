package main

import (
	"os"
	"path/filepath"
	"runtime"
)

const Version = "1.2.7"
const UpdateCheckerURL = "https://codepoems.eu/downloads/xl-converter/version.json"
const UpdateCheckerEnabled = true

// ProgramFolder is the directory containing the application binary.
var ProgramFolder string

// ConfigLocation is where user settings/presets are stored.
var ConfigLocation string

// Binary paths for external encoders.
var (
	CJXlPath         string
	DJXlPath         string
	JxlInfoPath      string
	CJPEGLIPath      string
	ImageMagickPath  string
	AvifEncPath      string
	AvifDecPath      string
	OxiPNGPath       string
	ExifToolPath     string
	JPEGTranPath     string
)

// JPEG aliases for format matching.
var JPEGAliases = []string{"jpg", "jpeg", "jfif", "jif", "jpe"}

// Allowed input extensions.
var AllowedInput []string

// Allowed resampling filters.
var AllowedResampling = []string{
	"Lanczos", "Point", "Box", "Cubic", "Hermite", "Gaussian",
	"Catrom", "Triangle", "Quadratic", "Mitchell", "CubicSpline",
	"Hamming", "Parzen", "Blackman", "Kaiser", "Welsh", "Hanning",
	"Bartlett", "Bohman",
}

// AllowedInputFilters for file dialogs.
var AllowedInputFilters []InputFilter

// InputFilter describes a named group of file extensions.
type InputFilter struct {
	Title      string   `json:"title"`
	Extensions []string `json:"extensions"`
}

func init() {
	// Determine program folder
	exe, err := os.Executable()
	if err != nil {
		ProgramFolder = "."
	} else {
		ProgramFolder = filepath.Dir(exe)
	}

	// Set binary paths based on platform
	initBinaryPaths()

	// Set config location
	initConfigLocation()

	// Build allowed input list
	initAllowedInput()
}

func initBinaryPaths() {
	var basePath string

	// In dev mode, the binary is built into bin/ (e.g. bin/xlchemy-wails.exe),
	// so ProgramFolder already points to bin/. Detect this and walk up one level.
	toolsRoot := ProgramFolder
	if filepath.Base(toolsRoot) == "bin" {
		toolsRoot = filepath.Dir(toolsRoot)
	}

	switch runtime.GOOS {
	case "windows":
		basePath = filepath.Join(toolsRoot, "bin", "win")
		CJXlPath = filepath.Join(basePath, "libjxl", "cjxl.exe")
		DJXlPath = filepath.Join(basePath, "libjxl", "djxl.exe")
		JxlInfoPath = filepath.Join(basePath, "libjxl", "jxlinfo.exe")
		CJPEGLIPath = filepath.Join(basePath, "libjxl", "cjpegli.exe")
		ImageMagickPath = filepath.Join(basePath, "imagemagick", "magick.exe")
		AvifEncPath = filepath.Join(basePath, "libavif", "avifenc.exe")
		AvifDecPath = filepath.Join(basePath, "libavif", "avifdec.exe")
		OxiPNGPath = filepath.Join(basePath, "oxipng", "oxipng.exe")
		ExifToolPath = filepath.Join(basePath, "exiftool", "exiftool.exe")
		JPEGTranPath = filepath.Join(basePath, "jpegtran", "jpegtran.exe")

	case "linux":
		basePath = filepath.Join(toolsRoot, "bin", "linux")
		CJXlPath = filepath.Join(basePath, "cjxl")
		DJXlPath = filepath.Join(basePath, "djxl")
		JxlInfoPath = filepath.Join(basePath, "jxlinfo")
		CJPEGLIPath = filepath.Join(basePath, "cjpegli")
		ImageMagickPath = filepath.Join(basePath, "imagemagick", "magick")
		AvifEncPath = filepath.Join(basePath, "avifenc")
		AvifDecPath = filepath.Join(basePath, "avifdec")
		OxiPNGPath = filepath.Join(basePath, "oxipng")
		JPEGTranPath = filepath.Join(basePath, "jpegtran")

	case "darwin":
		basePath = filepath.Join(toolsRoot, "bin", "macos")
		CJXlPath = filepath.Join(basePath, "cjxl")
		DJXlPath = filepath.Join(basePath, "djxl")
		JxlInfoPath = filepath.Join(basePath, "jxlinfo")
		CJPEGLIPath = filepath.Join(basePath, "cjpegli")
		ImageMagickPath = filepath.Join(basePath, "imagemagick", "magick")
		AvifEncPath = filepath.Join(basePath, "libavif", "avifenc")
		AvifDecPath = filepath.Join(basePath, "libavif", "avifdec")
		OxiPNGPath = filepath.Join(basePath, "oxipng")
		ExifToolPath = filepath.Join(basePath, "exiftool", "exiftool")
		JPEGTranPath = filepath.Join(basePath, "jpegtran")
	}
}

func initConfigLocation() {
	switch runtime.GOOS {
	case "windows":
		home, _ := os.UserHomeDir()
		ConfigLocation = filepath.Join(home, "AppData", "Local", "xl-converter")
	case "darwin":
		home, _ := os.UserHomeDir()
		ConfigLocation = filepath.Join(home, "Library", "Application Support", "eu.codepoems.xl-converter")
	default: // linux
		home, _ := os.UserHomeDir()
		ConfigLocation = filepath.Join(home, ".config", "xl-converter")
	}
}

func initAllowedInput() {
	allowedInputDJXL := []string{"jxl"}
	allowedInputCJXL := append(JPEGAliases, "png", "apng", "gif", "jxl")
	allowedInputImageMagick := append(JPEGAliases, "png", "gif", "webp", "jp2", "bmp", "ico", "tiff", "tif")
	allowedInputAvifEnc := append(JPEGAliases, "png")
	allowedInputAvifDec := []string{"avif"}
	allowedInputOxiPNG := []string{"png"}

	seen := make(map[string]bool)
	var combined []string
	for _, list := range [][]string{
		allowedInputDJXL, allowedInputCJXL, allowedInputImageMagick,
		allowedInputAvifEnc, allowedInputAvifDec, allowedInputOxiPNG,
	} {
		for _, ext := range list {
			if !seen[ext] {
				seen[ext] = true
				combined = append(combined, ext)
			}
		}
	}
	AllowedInput = combined

	AllowedInputFilters = []InputFilter{
		{Title: "Supported Images", Extensions: AllowedInput},
		{Title: "APNG", Extensions: []string{"apng"}},
		{Title: "AVIF", Extensions: []string{"avif"}},
		{Title: "BMP", Extensions: []string{"bmp"}},
		{Title: "GIF", Extensions: []string{"gif"}},
		{Title: "ICO", Extensions: []string{"ico"}},
		{Title: "JPEG", Extensions: JPEGAliases},
		{Title: "JPEG XL", Extensions: []string{"jxl"}},
		{Title: "JPEG2000", Extensions: []string{"jp2"}},
		{Title: "PNG", Extensions: []string{"png"}},
		{Title: "TIFF", Extensions: []string{"tiff", "tif"}},
		{Title: "WebP", Extensions: []string{"webp"}},
	}
}

// IsAllowedInput checks if an extension is in the allowed list.
func IsAllowedInput(ext string) bool {
	for _, e := range AllowedInput {
		if e == ext {
			return true
		}
	}
	return false
}

// IsJPEGAlias checks if an extension is a JPEG alias.
func IsJPEGAlias(ext string) bool {
	for _, e := range JPEGAliases {
		if e == ext {
			return true
		}
	}
	return false
}
