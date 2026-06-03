// ram_optimizer.go - RAM optimization for high-resolution image conversion
package main

import (
	"image"
	_ "image/jpeg"
	_ "image/png"
	_ "image/gif"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

// OptimizationRule defines when and how to reduce concurrent workers.
type OptimizationRule struct {
	Scope     string  // "all", "JPEG XL", "SVT-AV1-PSY"
	Threshold float64 // Megapixel threshold
	Target    string  // "1" or fraction like "1/2"
}

// RAMOptimizer manages concurrent worker count based on image resolution.
type RAMOptimizer struct {
	Enabled           bool
	UsedThreadCount   int
	Rules             []OptimizationRule
	MaxWorkerCount    int
	ThreadsPerWorker  int
}

var GlobalRAMOptimizer = &RAMOptimizer{}

// ParseOptimizationRules parses rules from string format.
// Format: ("scope", threshold, "target") e.g. ("JPEG XL", 50, "1/2")
func ParseOptimizationRules(rulesStr string) []OptimizationRule {
	validScopes := map[string]bool{"all": true, "JPEG XL": true, "SVT-AV1-PSY": true}
	rules := []OptimizationRule{}

	// Regex pattern to match rule format
	re := regexp.MustCompile(`\("([^"]+)",\s*(\d+(?:\.\d+)?),\s*"([1-9]+/[1-9]+|1)"\)`)
	matches := re.FindAllStringSubmatch(rulesStr, -1)

	for _, match := range matches {
		if len(match) != 4 {
			continue
		}

		scope := match[1]
		threshold, err := strconv.ParseFloat(match[2], 64)
		if err != nil {
			log.Printf("[RAM Optimizer] Invalid threshold: %s", match[2])
			continue
		}
		target := match[3]

		// Validate
		if !validScopes[scope] {
			log.Printf("[RAM Optimizer] Unknown scope: %s", scope)
			continue
		}
		if threshold < 0 {
			log.Printf("[RAM Optimizer] Invalid threshold (must be >= 0): %f", threshold)
			continue
		}

		rules = append(rules, OptimizationRule{
			Scope:     scope,
			Threshold: threshold,
			Target:    target,
		})
	}

	return rules
}

// SetOptimizationRules sets rules from string.
func (ro *RAMOptimizer) SetOptimizationRules(rulesStr string) {
	ro.Rules = ParseOptimizationRules(rulesStr)
	if len(ro.Rules) > 0 {
		log.Printf("[RAM Optimizer] Loaded %d rules", len(ro.Rules))
	} else {
		log.Printf("[RAM Optimizer] No rules found")
	}
}

// doesRuleApply checks if a rule applies to the current format.
func (ro *RAMOptimizer) doesRuleApply(rule OptimizationRule, fileFormat string, avifEncoder string) bool {
	isJpegXl := fileFormat == "JPEG XL"
	isSvtAv1Psy := fileFormat == "AVIF" && avifEncoder == "SVT-AV1-PSY"

	switch rule.Scope {
	case "all":
		return isJpegXl || isSvtAv1Psy
	case "JPEG XL":
		return isJpegXl
	case "SVT-AV1-PSY":
		return isSvtAv1Psy
	}
	return false
}

// IsNecessary checks if RAM optimizer is needed for the given format.
func (ro *RAMOptimizer) IsNecessary(fileFormat string, avifEncoder string, jxlEffort int, jxlLossyModular bool, jxlLossless bool) bool {
	if fileFormat == "JPEG XL" && jpegXlHighRamUsage(jxlEffort, jxlLossyModular, jxlLossless) {
		return true
	}
	if fileFormat == "AVIF" && avifEncoder == "SVT-AV1-PSY" {
		return true
	}
	return false
}

// jpegXlHighRamUsage determines if JXL encoding will use high RAM.
func jpegXlHighRamUsage(effort int, lossyModular bool, lossless bool) bool {
	if lossyModular {
		return true
	}
	if lossless && effort <= 9 {
		return false
	}
	if !lossless && effort <= 7 {
		return false
	}
	return true
}

// GetImageResMP returns image resolution in megapixels.
func GetImageResMP(path string) float64 {
	file, err := os.Open(path)
	if err != nil {
		return -1
	}
	defer file.Close()

	// Decode just the header to get dimensions
	config, _, err := image.DecodeConfig(file)
	if err != nil {
		return -1
	}

	width := config.Width
	height := config.Height
	mp := float64(width) * float64(height) / 1000000.0
	return mp
}

// GetMaxWorkerCount calculates max concurrent workers based on rules.
func (ro *RAMOptimizer) GetMaxWorkerCount(resMP float64, fileFormat string, avifEncoder string) int {
	if !ro.Enabled || len(ro.Rules) == 0 {
		return ro.UsedThreadCount
	}

	// Sort rules by threshold descending
	sortedRules := make([]OptimizationRule, len(ro.Rules))
	copy(sortedRules, ro.Rules)
	for i := 0; i < len(sortedRules)-1; i++ {
		for j := i + 1; j < len(sortedRules); j++ {
			if sortedRules[j].Threshold > sortedRules[i].Threshold {
				sortedRules[i], sortedRules[j] = sortedRules[j], sortedRules[i]
			}
		}
	}

	// Find applicable rule
	for _, rule := range sortedRules {
		if resMP >= rule.Threshold && ro.doesRuleApply(rule, fileFormat, avifEncoder) {
			if rule.Target == "1" {
				return 1
			}
			// Parse fraction
			parts := strings.Split(rule.Target, "/")
			if len(parts) == 2 {
				num, err1 := strconv.Atoi(parts[0])
				den, err2 := strconv.Atoi(parts[1])
				if err1 == nil && err2 == nil && den > 0 {
					optimized := ro.UsedThreadCount * num / den
					if optimized < 1 {
						return 1
					}
					return optimized
				}
			}
		}
	}

	return ro.UsedThreadCount
}

// Run applies RAM optimization and returns adjusted threads per worker.
func (ro *RAMOptimizer) Run(path string, fileFormat string, avifEncoder string, jxlEffort int, jxlLossyModular bool, jxlLossless bool) int {
	if !ro.Enabled {
		return ro.ThreadsPerWorker
	}

	if ro.UsedThreadCount < 1 {
		return ro.ThreadsPerWorker
	}

	if len(ro.Rules) == 0 {
		return ro.ThreadsPerWorker
	}

	// Check if necessary
	if !ro.IsNecessary(fileFormat, avifEncoder, jxlEffort, jxlLossyModular, jxlLossless) {
		return ro.ThreadsPerWorker
	}

	// Get resolution
	resMP := GetImageResMP(path)
	if resMP < 0 {
		ro.MaxWorkerCount = 1
		return ro.ThreadsPerWorker
	}

	// Calculate max workers
	ro.MaxWorkerCount = ro.GetMaxWorkerCount(resMP, fileFormat, avifEncoder)
	newThreadsPerWorker := ro.UsedThreadCount / ro.MaxWorkerCount
	if newThreadsPerWorker < 1 {
		newThreadsPerWorker = 1
	}

	log.Printf("[RAM Optimizer] Max workers: %d, threads/worker: %d, res: %.2f MP, file: %s",
		ro.MaxWorkerCount, newThreadsPerWorker, resMP, filepath.Base(path))

	return newThreadsPerWorker
}

// Initialize sets up the RAM optimizer from settings.
func (ro *RAMOptimizer) Initialize(mode string, rulesStr string, threadCount int) {
	switch mode {
	case "Dynamic":
		ro.Enabled = true
		// Default rules for dynamic mode
		if len(rulesStr) == 0 {
			ro.Rules = []OptimizationRule{
				{Scope: "all", Threshold: 50, Target: "1/2"},
				{Scope: "all", Threshold: 100, Target: "1"},
			}
		} else {
			ro.SetOptimizationRules(rulesStr)
		}
	case "Static":
		ro.Enabled = true
		ro.SetOptimizationRules(rulesStr)
	case "Disabled":
		ro.Enabled = false
		ro.Rules = nil
	}
	ro.UsedThreadCount = threadCount
	ro.ThreadsPerWorker = threadCount
	ro.MaxWorkerCount = threadCount
}