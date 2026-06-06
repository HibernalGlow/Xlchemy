package main

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"sync"
)

// ProcessManager tracks running subprocesses for cancellation.
type ProcessManager struct {
	mu        sync.Mutex
	processes []*exec.Cmd
}

var GlobalProcessManager = &ProcessManager{}

func (pm *ProcessManager) Add(cmd *exec.Cmd) {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	pm.processes = append(pm.processes, cmd)
}

func (pm *ProcessManager) Remove(cmd *exec.Cmd) {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	for i, p := range pm.processes {
		if p == cmd {
			pm.processes = append(pm.processes[:i], pm.processes[i+1:]...)
			return
		}
	}
}

func (pm *ProcessManager) TerminateAll() {
	pm.mu.Lock()
	procs := make([]*exec.Cmd, len(pm.processes))
	copy(procs, pm.processes)
	pm.processes = nil
	pm.mu.Unlock()

	for _, p := range procs {
		if p.Process != nil {
			_ = p.Process.Kill()
		}
	}
}

func (pm *ProcessManager) Clear() {
	pm.mu.Lock()
	defer pm.mu.Unlock()
	pm.processes = nil
}

// TaskStatus tracks cancellation state.
type TaskStatus struct {
	mu        sync.Mutex
	canceled  bool
}

var GlobalTaskStatus = &TaskStatus{}

func (ts *TaskStatus) Reset() {
	ts.mu.Lock()
	defer ts.mu.Unlock()
	ts.canceled = false
}

func (ts *TaskStatus) Cancel() {
	ts.mu.Lock()
	defer ts.mu.Unlock()
	ts.canceled = true
}

func (ts *TaskStatus) WasCanceled() bool {
	ts.mu.Lock()
	defer ts.mu.Unlock()
	return ts.canceled
}

// RunBinary executes an external encoder binary.
// Returns stdout, stderr, and any error.
func RunBinary(ctx context.Context, binPath string, args []string, srcPath string, dstPath string, argsAfterInput bool) (string, string, error) {
	cmdArgs := make([]string, 0, len(args)+3)

	if argsAfterInput {
		cmdArgs = append(cmdArgs, srcPath)
		cmdArgs = append(cmdArgs, parseArgs(args)...)
	} else {
		cmdArgs = append(cmdArgs, parseArgs(args)...)
		cmdArgs = append(cmdArgs, srcPath)
	}

	if dstPath != "" {
		cmdArgs = append(cmdArgs, dstPath)
	}

	cmd := exec.CommandContext(ctx, binPath, cmdArgs...)
	GlobalProcessManager.Add(cmd)
	defer GlobalProcessManager.Remove(cmd)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()

	if GlobalTaskStatus.WasCanceled() {
		return "", "", fmt.Errorf("canceled")
	}

	return stdout.String(), stderr.String(), err
}

// RunBinaryOutput runs a binary and returns only stdout.
func RunBinaryOutput(ctx context.Context, binPath string, args ...string) (string, error) {
	cmd := exec.CommandContext(ctx, binPath, args...)
	var stdout bytes.Buffer
	cmd.Stdout = &stdout
	err := cmd.Run()
	return stdout.String(), err
}

// parseArgs splits string arguments by spaces.
func parseArgs(args []string) []string {
	var result []string
	for _, arg := range args {
		parts := strings.Fields(arg)
		result = append(result, parts...)
	}
	return result
}

// GetExtension returns the file extension for a format name.
func GetExtension(format string) string {
	switch format {
	case "JPEG XL":
		return "jxl"
	case "AVIF":
		return "avif"
	case "JPEG":
		return "jpg"
	case "WebP":
		return "webp"
	case "PNG":
		return "png"
	default:
		return ""
	}
}

// GetDecoder returns the decoder binary path for a given extension.
func GetDecoder(ext string) string {
	ext = strings.ToLower(ext)
	switch ext {
	case "png":
		return ImageMagickPath
	case "jxl":
		return DJXlPath
	case "avif":
		return AvifDecPath
	default:
		// Check if it's an ImageMagick-supported format
		for _, e := range []string{"jpg", "jpeg", "jfif", "jif", "jpe", "gif", "webp", "jp2", "bmp", "ico", "tiff", "tif"} {
			if ext == e {
				return ImageMagickPath
			}
		}
		return ""
	}
}

// GetDecoderArgs returns decoder-specific thread arguments.
func GetDecoderArgs(decoderPath string, threads int) []string {
	if decoderPath == AvifDecPath {
		return []string{fmt.Sprintf("-j %d", threads)}
	} else if decoderPath == DJXlPath {
		return []string{fmt.Sprintf("--num_threads=%d", threads)}
	}
	return nil
}

// GetImageRes returns (width, height) of an image using ImageMagick identify.
func GetImageRes(ctx context.Context, imagePath string) (int, int, error) {
	out, _, err := RunBinary(ctx, ImageMagickPath,
		[]string{"identify", "-ping", "-format", "%[page]"},
		imagePath+"[0]", "", false)
	if err != nil {
		return -1, -1, err
	}

	var w, h int
	_, parseErr := fmt.Sscanf(out, "%dx%d", &w, &h)
	if parseErr != nil {
		return -1, -1, fmt.Errorf("cannot parse resolution from: %s", out)
	}
	if w < 1 || h < 1 {
		return -1, -1, fmt.Errorf("invalid resolution: %dx%d", w, h)
	}
	return w, h, nil
}

// IsExifToolAvailable checks if exiftool binary exists and works.
func IsExifToolAvailable() (bool, string) {
	if _, err := os.Stat(ExifToolPath); os.IsNotExist(err) {
		return false, fmt.Sprintf("ExifTool not found at: %s", ExifToolPath)
	}
	ctx := context.Background()
	_, err := RunBinaryOutput(ctx, ExifToolPath, "-ver")
	if err != nil {
		return false, fmt.Sprintf("ExifTool failed to run: %s", err)
	}
	return true, ""
}
