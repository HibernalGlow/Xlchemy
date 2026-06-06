//go:build linux

package main

import (
	"os"
	"syscall"
	"time"
)

// getAccessTime extracts the real access time from os.FileInfo on Linux.
func getAccessTime(info os.FileInfo) time.Time {
	stat, ok := info.Sys().(*syscall.Stat_t)
	if !ok {
		return info.ModTime()
	}
	return time.Unix(stat.Atim.Sec, stat.Atim.Nsec)
}
