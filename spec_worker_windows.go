//go:build windows

package main

import (
	"os"
	"syscall"
	"time"
)

// sourceTimes returns (accessTime, modTime) with real access time on Windows.
// Matches Python's timestamps.getTimestamps which reads st_atime_ns.
func sourceTimes(path string) (time.Time, time.Time) {
	info, err := os.Stat(path)
	if err != nil {
		return time.Time{}, time.Time{}
	}
	stat, ok := info.Sys().(*syscall.Win32FileAttributeData)
	if !ok {
		return info.ModTime(), info.ModTime()
	}
	return time.Unix(0, stat.LastAccessTime.Nanoseconds()),
		time.Unix(0, stat.LastWriteTime.Nanoseconds())
}

// removeQuiet removes a file, handling Windows Read-only attribute.
// Matches Python's removeFile which clears Read-only before retrying.
func removeQuiet(path string) {
	if path == "" {
		return
	}
	err := os.Remove(path)
	if err != nil {
		if os.IsPermission(err) {
			// Clear Read-only attribute and retry
			_ = os.Chmod(path, 0666)
			_ = os.Remove(path)
		}
		// Silently ignore other errors (file not found, etc.)
	}
}
