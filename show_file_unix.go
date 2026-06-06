//go:build !windows

package main

import (
	"os/exec"
	"path/filepath"
	"runtime"
)

// showFileInFolder opens the system file manager with the given file selected.
func showFileInFolder(path string) error {
	switch runtime.GOOS {
	case "darwin":
		return exec.Command("open", "-R", path).Start()
	default:
		// Linux / other Unix: open the containing directory
		dir := filepath.Dir(path)
		return exec.Command("xdg-open", dir).Start()
	}
}
