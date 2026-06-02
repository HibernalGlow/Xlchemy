//go:build slimg

package main

/*
#cgo CFLAGS: -I${SRCDIR}/native
#cgo windows LDFLAGS: -L${SRCDIR}/native -lslimg_cffi -lws2_32 -luserenv -lbcrypt -lntdll -liphlpapi -lcrypt32 -l secur32
#cgo linux LDFLAGS: -L${SRCDIR}/native -lslimg_cffi -lpthread -ldl -lm
#cgo darwin LDFLAGS: -L${SRCDIR}/native -lslimg_cffi -lpthread -ldl -lm -framework Security -framework CoreFoundation

#include "slimg_cffi.h"
#include <stdlib.h>
*/
import "C"
import (
	"fmt"
	"unsafe"
)

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

// slimgLastError returns the last error from the slimg FFI.
func slimgLastError() string {
	cstr := C.slimg_last_error()
	if cstr == nil {
		return ""
	}
	defer C.slimg_free_string((*C.char)(unsafe.Pointer(cstr)))
	return C.GoString(cstr)
}

// SlimgDecodeFile decodes an image file to RGBA pixels using slimg.
func SlimgDecodeFile(path string) (*SlimgDecodeResult, error) {
	cpath := C.CString(path)
	defer C.free(unsafe.Pointer(cpath))

	buf := C.slimg_decode_file(cpath)
	if buf.data == nil {
		return nil, fmt.Errorf("slimg decode: %s", slimgLastError())
	}

	// Copy the pixel data into Go memory
	pixels := C.GoBytes(unsafe.Pointer(buf.data), C.int(buf.len))

	// Free the Rust-allocated buffer
	C.slimg_free_buffer(buf)

	return &SlimgDecodeResult{
		Pixels: pixels,
		Width:  uint32(buf.width),
		Height: uint32(buf.height),
		Format: SlimgFormat(buf.format),
	}, nil
}

// SlimgConvert converts RGBA pixel data to the specified format.
func SlimgConvert(pixels []byte, width, height uint32, format SlimgFormat, quality uint8) (*SlimgConvertResult, error) {
	if len(pixels) == 0 {
		return nil, fmt.Errorf("slimg convert: empty pixel data")
	}

	buf := C.slimg_convert(
		(*C.uint8_t)(unsafe.Pointer(&pixels[0])),
		C.size_t(len(pixels)),
		C.uint32_t(width),
		C.uint32_t(height),
		C.int32_t(format),
		C.uint8_t(quality),
	)

	if buf.data == nil {
		return nil, fmt.Errorf("slimg convert: %s", slimgLastError())
	}

	// Copy encoded data into Go memory
	data := C.GoBytes(unsafe.Pointer(buf.data), C.int(buf.len))

	// Free the Rust-allocated buffer
	C.slimg_free_buffer(buf)

	return &SlimgConvertResult{
		Data:   data,
		Width:  uint32(buf.width),
		Height: uint32(buf.height),
		Format: SlimgFormat(buf.format),
	}, nil
}

// SlimgFormatExtension returns the canonical file extension for a format.
func SlimgFormatExtension(format SlimgFormat) (string, error) {
	buf := make([]byte, 16)
	n := C.slimg_format_extension(
		C.int32_t(format),
		(*C.char)(unsafe.Pointer(&buf[0])),
		C.size_t(len(buf)),
	)
	if n < 0 {
		return "", fmt.Errorf("unknown format: %d", format)
	}
	return string(buf[:n]), nil
}

// SlimgCanEncode returns whether the format supports encoding.
func SlimgCanEncode(format SlimgFormat) bool {
	return C.slimg_format_can_encode(C.int32_t(format)) == 1
}
