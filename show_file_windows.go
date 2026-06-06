//go:build windows

package main

import (
	"os/exec"
)

// showFileInFolder opens Windows Explorer with the given file selected.
func showFileInFolder(path string) error {
	return exec.Command("explorer.exe", "/select,"+path).Start()
}
