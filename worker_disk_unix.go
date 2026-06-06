//go:build !windows

package main

import (
	"path/filepath"

	"golang.org/x/sys/unix"
)

var diskFreeBytes = func(path string) int64 {
	if path == "" {
		return -1
	}

	cleanPath := filepath.Clean(path)
	for {
		var stat unix.Statfs_t
		if err := unix.Statfs(cleanPath, &stat); err == nil {
			return int64(stat.Bavail) * int64(stat.Bsize)
		}

		parent := filepath.Dir(cleanPath)
		if parent == cleanPath {
			break
		}
		cleanPath = parent
	}

	return -1
}
