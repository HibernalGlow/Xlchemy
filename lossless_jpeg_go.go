package main

import (
	"context"
	"fmt"
	"io"
	"os"

	"golang.org/x/crypto/blake2b"
)

func transcodeJPEGToJPEGXL(ctx context.Context, srcPath, dstPath string, effort, numThreads int) (bool, string, string) {
	if !fileExists(srcPath) {
		return false, "", "Source file not found."
	}

	stdout, stderr, err := RunBinary(
		ctx,
		CJXlPath,
		[]string{
			"--lossless_jpeg=1",
			fmt.Sprintf("-e %d", effort),
			fmt.Sprintf("--num_threads=%d", numThreads),
		},
		srcPath,
		dstPath,
		false,
	)

	return err == nil && fileExists(dstPath), stdout, stderr
}

func normalizeJPEG(ctx context.Context, srcPath, dstPath string) (bool, string, string) {
	if !fileExists(srcPath) {
		return false, "", "Source file not found."
	}

	stdout, err := RunBinaryOutput(
		ctx,
		JPEGTranPath,
		"-copy", "all",
		"-optimize",
		"-outfile", dstPath,
		srcPath,
	)

	stderr := ""
	if err != nil {
		stderr = err.Error()
	}

	return err == nil && fileExists(dstPath), stdout, stderr
}

func verifyJPEGXLReconstructionData(ctx context.Context, srcPath, orgPath, tmpFilePath string, numThreads int) (bool, string, string, error) {
	success, stdout, stderr := reconstructJPEGFromJPEGXL(ctx, srcPath, tmpFilePath, numThreads)
	if !success {
		return false, stdout, stderr, nil
	}
	if !fileExists(tmpFilePath) {
		return false, stdout, stderr, nil
	}

	srcB2, err := blake2bFile(orgPath)
	if err != nil {
		return false, "", "", fmt.Errorf("jxl_verify_1: Calculating b2sum failed. %w", err)
	}
	dstB2, err := blake2bFile(tmpFilePath)
	if err != nil {
		return false, "", "", fmt.Errorf("jxl_verify_1: Calculating b2sum failed. %w", err)
	}

	if err := os.Remove(tmpFilePath); err != nil {
		return false, "", "", fmt.Errorf("jxl_verify_0: Failed to remove tmp file. %w", err)
	}

	if srcB2 != dstB2 {
		return false, "", "Checksum mismatch.", nil
	}

	return true, stdout, stderr, nil
}

func reconstructJPEGFromJPEGXL(ctx context.Context, srcPath, dstPath string, numThreads int) (bool, string, string) {
	if !fileExists(srcPath) {
		return false, "", "Source file not found."
	}

	stdout, stderr, err := RunBinary(
		ctx,
		DJXlPath,
		[]string{fmt.Sprintf("--num_threads=%d", numThreads)},
		srcPath,
		dstPath,
		false,
	)

	return err == nil && fileExists(dstPath), stdout, stderr
}

func blake2bFile(path string) (string, error) {
	hasher, err := blake2b.New512(nil)
	if err != nil {
		return "", err
	}

	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()

	buf := make([]byte, 8192)
	for {
		n, readErr := file.Read(buf)
		if n > 0 {
			if _, err := hasher.Write(buf[:n]); err != nil {
				return "", err
			}
		}
		if readErr != nil {
			if readErr == io.EOF {
				break
			}
			return "", readErr
		}
	}

	return fmt.Sprintf("%x", hasher.Sum(nil)), nil
}
