package main

// ProgressEvent is emitted during conversion.
type ProgressEvent struct {
	Completed int    `json:"completed"`
	Total     int    `json:"total"`
	Line1     string `json:"line1"`
	Line2     string `json:"line2"`
}

// ExceptionEvent is emitted when a conversion error occurs.
type ExceptionEvent struct {
	ID   string `json:"id"`
	Msg  string `json:"msg"`
	Path string `json:"path"`
}

// FileItem represents a file in the input list.
type FileItem struct {
	AbsPath  string `json:"absPath"`
	Name     string `json:"name"`
	Ext      string `json:"ext"`
	Dir      string `json:"dir"`
	Size     int64  `json:"size"`
}

// OutputSettings from the Output tab.
type OutputSettings struct {
	Format               string  `json:"format"`
	Quality              int     `json:"quality"`
	Lossless             bool    `json:"lossless"`
	MaxCompression       bool    `json:"max_compression"`
	Effort               int     `json:"effort"`
	IntelligentEffort    bool    `json:"intelligent_effort"`
	JXLModular           bool    `json:"jxl_modular"`
	JXLVerify            bool    `json:"jxl_verify"`
	JXLNormalizeEnable   bool    `json:"jxl_normalize_enable"`
	JXLNormalizeWhen     string  `json:"jxl_normalize_when"`
	AOMAV1ChromaSub      string  `json:"aom_av1_chroma_subsampling"`
	JPEGLIChromaSub      string  `json:"jpegli_chroma_subsampling"`
	JPGChromaSub         string  `json:"jpg_chroma_subsampling"`
	IfFileExists         string  `json:"if_file_exists"`
	CustomOutputDir      bool    `json:"custom_output_dir"`
	CustomOutputDirPath  string  `json:"custom_output_dir_path"`
	KeepDirStruct        bool    `json:"keep_dir_struct"`
	DeleteOriginal       bool    `json:"delete_original"`
	DeleteOriginalMode   string  `json:"delete_original_mode"`
	SmallestFormatPool   map[string]bool `json:"smallest_format_pool"`
	JXLPNGFallback       bool    `json:"jxl_png_fallback"`
}

// ModifySettings from the Modify tab.
type ModifySettings struct {
	Downscaling DownscaleSettings `json:"downscaling"`
	Misc        MiscSettings      `json:"misc"`
}

type DownscaleSettings struct {
	Enabled     bool    `json:"enabled"`
	Mode        string  `json:"mode"`
	Percent     float64 `json:"percent"`
	Width       int     `json:"width"`
	Height      int     `json:"height"`
	FileSize    int     `json:"file_size"`
	ShortestSide int    `json:"shortest_side"`
	LongestSide  int    `json:"longest_side"`
	Megapixels  float64 `json:"megapixels"`
	Resample    string  `json:"resample"`
}

type MiscSettings struct {
	KeepMetadata  string `json:"keep_metadata"`
	KeepTimestamps bool  `json:"keep_timestamps"`
}

// AppSettings from the Settings tab.
type AppSettings struct {
	Theme                      string            `json:"theme"`
	CustomResampling           bool              `json:"custom_resampling"`
	SortingDisabled            bool              `json:"sorting_disabled"`
	ExcludedFormats            []string          `json:"excluded_formats"`
	DisableDownscalingStartup  bool              `json:"disable_downscaling_startup"`
	DisableDeleteStartup       bool              `json:"disable_delete_startup"`
	EnableJXLEffort10          bool              `json:"enable_jxl_effort_10"`
	DisableProgressiveJPEGLI   bool              `json:"disable_progressive_jpegli"`
	EnableCustomArgs           bool              `json:"enable_custom_args"`
	CJXLArgs                   string            `json:"cjxl_args"`
	AvifEncArgs                string            `json:"avifenc_args"`
	CJPEGLIArgs                string            `json:"cjpegli_args"`
	IMArgs                     string            `json:"im_args"`
	EnableQualityPrecSnapping  bool              `json:"enable_quality_precision_snapping"`
	JPGEncoder                 string            `json:"jpg_encoder"`
	JXLAutolosslessJPEG        bool              `json:"jxl_auto_lossless_jpeg"`
	RAMOptimizer               string            `json:"ram_optimizer"`
	RAMOptimizerRules          string            `json:"ram_optimizer_rules"`
	JXLLossyModular           bool              `json:"jxl_lossy_modular"`
	JXLIntEffort              bool              `json:"jxl_int_effort"`
	PlaySoundOnFinish         bool              `json:"play_sound_on_finish"`
	PlaySoundOnFinishVol      float64           `json:"play_sound_on_finish_vol"`
	KeepIfLarger              bool              `json:"keep_if_larger"`
	CopyIfLarger              bool              `json:"copy_if_larger"`
	ExifToolArgs              map[string]string `json:"exiftool_args"`
	AvifEncoder               string            `json:"avif_encoder"`
	AvifBitDepth              string            `json:"avif_bit_depth"`
	AvifAOMIQTune             bool              `json:"avif_aom_iq_tune"`
	ProcessingOrder           string            `json:"processing_order"`
}

// DefaultOutputSettings returns the default output settings.
func DefaultOutputSettings() OutputSettings {
	return OutputSettings{
		Format:             "JPEG XL",
		Quality:            80,
		Lossless:           false,
		MaxCompression:     false,
		Effort:             7,
		IntelligentEffort:  false,
		JXLModular:         false,
		JXLVerify:          false,
		JXLNormalizeEnable: false,
		JXLNormalizeWhen:   "On Fail",
		AOMAV1ChromaSub:    "Default",
		JPEGLIChromaSub:    "Default",
		JPGChromaSub:       "Default",
		IfFileExists:       "Replace",
		CustomOutputDir:    false,
		KeepDirStruct:      false,
		DeleteOriginal:     false,
		DeleteOriginalMode: "To Trash",
		SmallestFormatPool: map[string]bool{"png": true, "webp": true, "jxl": true},
		JXLPNGFallback:     true,
	}
}

// DefaultModifySettings returns the default modify settings.
func DefaultModifySettings() ModifySettings {
	return ModifySettings{
		Downscaling: DownscaleSettings{
			Enabled: false,
			Mode:    "Resolution",
			Percent: 50,
			Width:   1920,
			Height:  1080,
			FileSize: 500,
			ShortestSide: 1080,
			LongestSide:  1920,
			Megapixels: 2.1,
			Resample:  "Default",
		},
		Misc: MiscSettings{
			KeepMetadata:  "Encoder - Wipe",
			KeepTimestamps: false,
		},
	}
}

// DefaultAppSettings returns the default app settings.
func DefaultAppSettings() AppSettings {
	return AppSettings{
		Theme:                     "Miku",
		CustomResampling:          false,
		SortingDisabled:           false,
		ExcludedFormats:           []string{"avif", "jxl", "webp", "gif"},
		DisableDownscalingStartup: false,
		DisableDeleteStartup:      true,
		EnableJXLEffort10:         false,
		DisableProgressiveJPEGLI:  false,
		EnableCustomArgs:          false,
		EnableQualityPrecSnapping: true,
		JPGEncoder:                "JPEGLI",
		JXLAutolosslessJPEG:       true,
		RAMOptimizer:              "Disabled",
		JXLLossyModular:          false,
		JXLIntEffort:             false,
		PlaySoundOnFinish:        true,
		PlaySoundOnFinishVol:     0.5,
		KeepIfLarger:             false,
		CopyIfLarger:             false,
		ExifToolArgs: map[string]string{
			"ExifTool - Wipe":       "-overwrite_original -all= --ICC_Profile:all \"$dst\"",
			"ExifTool - Preserve":   "-overwrite_original -TagsFromFile \"$src\" -all:all \"$dst\"",
			"ExifTool - Unsafe Wipe": "-overwrite_original -all= \"$dst\"",
			"ExifTool - Custom":     "",
		},
		AvifEncoder:   "AOM AV1",
		AvifBitDepth:  "Auto",
		AvifAOMIQTune: false,
		ProcessingOrder: "Original",
	}
}
