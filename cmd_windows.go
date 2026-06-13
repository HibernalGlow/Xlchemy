//go:build windows

package main

import (
	"os/exec"
	"syscall"
)

// hideConsole prevents a new console window from appearing when running
// a subprocess on Windows. This is essential for GUI apps (like the Wails
// build) where the parent has no console — without this flag, Windows
// creates a visible terminal for every CLI child process (cjxl, magick, etc.).
func hideConsole(cmd *exec.Cmd) {
	if cmd.SysProcAttr == nil {
		cmd.SysProcAttr = &syscall.SysProcAttr{}
	}
	// CREATE_NO_WINDOW = 0x08000000
	cmd.SysProcAttr.CreationFlags |= 0x08000000
}
