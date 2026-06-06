//go:build !windows && !linux && !darwin

package main

import (
	"os"
	"time"
)

// getAccessTime falls back to ModTime on unsupported Unix platforms.
func getAccessTime(info os.FileInfo) time.Time {
	return info.ModTime()
}
