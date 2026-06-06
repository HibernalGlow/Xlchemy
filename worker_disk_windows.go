//go:build windows

package main

import (
	"path/filepath"

	"golang.org/x/sys/windows"
)

var diskFreeBytes = func(path string) int64 {
	if path == "" {
		return -1
	}

	cleanPath := filepath.Clean(path)
	for {
		pathPtr, err := windows.UTF16PtrFromString(cleanPath)
		if err == nil {
			var freeBytesAvailable uint64
			var totalNumberOfBytes uint64
			var totalNumberOfFreeBytes uint64
			if err = windows.GetDiskFreeSpaceEx(pathPtr, &freeBytesAvailable, &totalNumberOfBytes, &totalNumberOfFreeBytes); err == nil {
				return int64(totalNumberOfFreeBytes)
			}
		}

		parent := filepath.Dir(cleanPath)
		if parent == cleanPath {
			break
		}
		cleanPath = parent
	}

	return -1
}
