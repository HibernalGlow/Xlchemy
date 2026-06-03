// slimg_dll.go - DLL-based slimg wrapper (no CGO required)
//go:build !slimg

package main

import (
	"context"
	"fmt"
	"os"
	"syscall"
	"unsafe"
)

var slimgDLL = syscall.NewLazyDLL("slimg_cffi.dll")

// Function pointers
var procDecodeFile = slimgDLL.NewProc("slimg_decode_file")
var procConvert = slimgDLL.NewProc("slimg_convert")
var procFreeBufferPtr = slimgDLL.NewProc("slimg_free_buffer_ptr")
var procFreeString = slimgDLL.NewProc("slimg_free_string")
var procLastError = slimgDLL.NewProc("slimg_last_error")
var procFormatExtension = slimgDLL.NewProc("slimg_format_extension")
var procCanEncode = slimgDLL.NewProc("slimg_format_can_encode")

// SlimgFormat represents an image format supported by slimg.
type SlimgFormat int32

const (
	SlimgFormatJpeg SlimgFormat = 0
	SlimgFormatPng  SlimgFormat = 1
	SlimgFormatWebP SlimgFormat = 2
	SlimgFormatAvif SlimgFormat = 3
	SlimgFormatJxl  SlimgFormat = 4
	SlimgFormatQoi  SlimgFormat = 5
)

// SlimgDecodeResult holds the result of decoding an image file.
type SlimgDecodeResult struct {
	Pixels []byte // RGBA pixel data (width * height * 4)
	Width  uint32
	Height uint32
	Format SlimgFormat
}

// SlimgConvertResult holds the result of converting an image.
type SlimgConvertResult struct {
	Data   []byte // Encoded image bytes
	Width  uint32
	Height uint32
	Format SlimgFormat
}

// C-compatible buffer structure (must match slimg_cffi.h)
type slimgBuffer struct {
	data   *uint8
	len    uint64
	width  uint32
	height uint32
	format int32
}

// slimgLastError returns the last error from the slimg FFI.
func slimgLastError() string {
	ret, _, _ := procLastError.Call()
	if ret == 0 {
		return ""
	}
	// Convert uintptr to C string pointer
	ptr := (*byte)(unsafe.Pointer(ret))
	
	// Find null terminator
	length := 0
	for p := ptr; *p != 0 && length < 1024; p = (*byte)(unsafe.Pointer(uintptr(unsafe.Pointer(p)) + 1)) {
		length++
	}
	
	// Copy bytes to Go string
	if length == 0 {
		procFreeString.Call(ret)
		return ""
	}
	
	bytes := make([]byte, length)
	for i := 0; i < length; i++ {
		bytes[i] = *(*byte)(unsafe.Pointer(uintptr(unsafe.Pointer(ptr)) + uintptr(i)))
	}
	
	// Free the string
	procFreeString.Call(ret)
	return string(bytes)
}

// SlimgDecodeFile decodes an image file to RGBA pixels using slimg.
func SlimgDecodeFile(path string) (*SlimgDecodeResult, error) {
	// Convert path to UTF-8 bytes with null terminator
	pathBytes := append([]byte(path), 0)
	
	ret, _, _ := procDecodeFile.Call(uintptr(unsafe.Pointer(&pathBytes[0])))
	if ret == 0 {
		return nil, fmt.Errorf("slimg decode: %s", slimgLastError())
	}

	buf := (*slimgBuffer)(unsafe.Pointer(ret))
	if buf.data == nil {
		procFreeBufferPtr.Call(ret)
		return nil, fmt.Errorf("slimg decode: %s", slimgLastError())
	}

	// Copy the pixel data into Go memory
	pixels := unsafe.Slice(buf.data, buf.len)
	pixelsCopy := make([]byte, buf.len)
	copy(pixelsCopy, pixels)

	// Free the Rust-allocated buffer (both struct and data)
	procFreeBufferPtr.Call(ret)

	return &SlimgDecodeResult{
		Pixels: pixelsCopy,
		Width:  buf.width,
		Height: buf.height,
		Format: SlimgFormat(buf.format),
	}, nil
}

// SlimgConvert converts RGBA pixel data to the specified format.
func SlimgConvert(pixels []byte, width, height uint32, format SlimgFormat, quality uint8) (*SlimgConvertResult, error) {
	if len(pixels) == 0 {
		return nil, fmt.Errorf("slimg convert: empty pixel data")
	}

	ret, _, _ := procConvert.Call(
		uintptr(unsafe.Pointer(&pixels[0])),
		uintptr(len(pixels)),
		uintptr(width),
		uintptr(height),
		uintptr(format),
		uintptr(quality),
	)

	if ret == 0 {
		return nil, fmt.Errorf("slimg convert: %s", slimgLastError())
	}

	buf := (*slimgBuffer)(unsafe.Pointer(ret))
	if buf.data == nil {
		procFreeBufferPtr.Call(ret)
		return nil, fmt.Errorf("slimg convert: %s", slimgLastError())
	}

	// Copy encoded data into Go memory
	data := unsafe.Slice(buf.data, buf.len)
	dataCopy := make([]byte, buf.len)
	copy(dataCopy, data)

	// Free the Rust-allocated buffer (both struct and data)
	procFreeBufferPtr.Call(ret)

	return &SlimgConvertResult{
		Data:   dataCopy,
		Width:  buf.width,
		Height: buf.height,
		Format: SlimgFormat(buf.format),
	}, nil
}

// SlimgFormatExtension returns the canonical file extension for a format.
func SlimgFormatExtension(format SlimgFormat) (string, error) {
	buf := make([]byte, 16)
	n, _, _ := procFormatExtension.Call(
		uintptr(format),
		uintptr(unsafe.Pointer(&buf[0])),
		uintptr(len(buf)),
	)
	if int32(n) < 0 {
		return "", fmt.Errorf("unknown format: %d", format)
	}
	return string(buf[:n]), nil
}

// SlimgCanEncode returns whether the format supports encoding.
func SlimgCanEncode(format SlimgFormat) bool {
	ret, _, _ := procCanEncode.Call(uintptr(format))
	return ret == 1
}

// isSlimgAvailable returns true when slimg DLL is loaded.
func isSlimgAvailable() bool {
	err := slimgDLL.Load()
	return err == nil
}

// convertAVIFWithSlimg converts an image to AVIF using slimg library.
func convertAVIFWithSlimg(ctx context.Context, srcPath string, dstPath string, quality int) *conversionError {
	// Check if canceled
	if GlobalTaskStatus.WasCanceled() {
		return &conversionError{"X0", "Canceled"}
	}

	// Load DLL if not already loaded
	if err := slimgDLL.Load(); err != nil {
		return &conversionError{"S2", fmt.Sprintf("slimg DLL not found: %v", err)}
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