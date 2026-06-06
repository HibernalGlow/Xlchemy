//go:build !windows

package main

import (
	"os"
	"time"
)

// sourceTimes returns (accessTime, modTime).
// On non-Windows, Go's os.Stat only reliably exposes ModTime.
// Access time is platform-specific (Linux: Stat_t.Atim, macOS: Stat_t.Atimespec).
// Use ModTime as fallback for access time.
func sourceTimes(path string) (time.Time, time.Time) {
	info, err := os.Stat(path)
	if err != nil {
		return time.Time{}, time.Time{}
	}
	atime := getAccessTime(info)
	return atime, info.ModTime()
}

// removeQuiet removes a file silently, ignoring all errors.
func removeQuiet(path string) {
	if path == "" {
		return
	}
	_ = os.Remove(path)
}
