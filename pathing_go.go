package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
)

type uniquePathStore struct {
	mu    sync.Mutex
	paths map[string]struct{}
}

var GlobalUniquePathStore = &uniquePathStore{
	paths: make(map[string]struct{}),
}

func (s *uniquePathStore) Add(path string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.paths[path] = struct{}{}
}

func (s *uniquePathStore) Exists(path string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	_, ok := s.paths[path]
	return ok
}

func (s *uniquePathStore) Clear() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.paths = make(map[string]struct{})
}

func getUniqueFilePath(outputDir, fileName, fileExt string) string {
	path := filepath.Join(outputDir, fmt.Sprintf("%s.%s", fileName, fileExt))

	prev := regexp.MustCompile(`\([0-9]+\)$`).FindString(fileName)
	n := 1
	if prev != "" {
		fmt.Sscanf(prev, "(%d)", &n)
	}

	stripPrev := prev != "" && len(fileName) >= len(prev)
	spacing := " "
	baseName := fileName
	if stripPrev {
		spacing = ""
		baseName = fileName[:len(fileName)-len(prev)]
	}

	for fileExists(path) || GlobalUniquePathStore.Exists(path) {
		path = filepath.Join(outputDir, fmt.Sprintf("%s%s(%d).%s", baseName, spacing, n, fileExt))
		n++
	}

	GlobalUniquePathStore.Add(path)
	return path
}

func getUniqueTmpFilePath(outputDir, fileExt string) string {
	for {
		path := filepath.Join(outputDir, fmt.Sprintf("tmp_%s.%s", randomHex(4), fileExt))
		if !fileExists(path) && !GlobalUniquePathStore.Exists(path) {
			GlobalUniquePathStore.Add(path)
			return path
		}
	}
}

func getOutputDir(item FileItem, output OutputSettings) string {
	itemDirPath := item.Dir
	if !output.CustomOutputDir {
		return itemDirPath
	}

	customDirPath := filepath.Clean(output.CustomOutputDirPath)
	if output.KeepDirStruct {
		anchorPath := item.AnchorPath
		if anchorPath == "" {
			anchorPath = itemDirPath
		}
		relPath, err := filepath.Rel(anchorPath, itemDirPath)
		if err != nil {
			log.Printf("[Pathing] Failed to calculate relative path: %v", err)
			return customDirPath
		}
		if relPath == "." {
			return customDirPath
		}
		return filepath.Join(customDirPath, relPath)
	}

	if filepath.IsAbs(customDirPath) {
		return customDirPath
	}

	return filepath.Join(itemDirPath, customDirPath)
}

func fileExists(path string) bool {
	info, err := os.Stat(path)
	return err == nil && !info.IsDir()
}

func randomHex(byteCount int) string {
	buf := make([]byte, byteCount)
	if _, err := rand.Read(buf); err != nil {
		return strings.Repeat("0", byteCount*2)
	}
	return hex.EncodeToString(buf)
}
