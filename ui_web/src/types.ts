export interface ThemeColors {
  light: Record<string, string>;
  dark: Record<string, string>;
}

export interface CustomThemeConfig {
  name: string;
  description: string;
  colors: ThemeColors;
}

export interface ThemeCfg {
  display: string;
  className: string;
}

export interface FileItem {
  path: string;
  anchor_path: string;
  name: string;
  size: number;
  format: string;
}

export interface OutputSettings {
  format: string;
  quality: number;
  effort: number;
  lossless: boolean;
  intelligent_effort: boolean;
  jxl_modular: boolean;
  jxl_verify: boolean;
  jxl_normalize_enable: boolean;
  jxl_normalize_when: string;
  max_compression: boolean;
  aom_av1_chroma_subsampling: string;
  jpegli_chroma_subsampling: string;
  jpg_chroma_subsampling: string;
  if_file_exists: string;
  custom_output_dir: boolean;
  custom_output_dir_path: string;
  keep_dir_struct: boolean;
  delete_original: boolean;
  delete_original_mode: string;
  thread_count: number;
  smallest_format_pool: {
    png: boolean;
    webp: boolean;
    jxl: boolean;
  };
  jxl_png_fallback: boolean;
  clear_after_conv: boolean;
}

export interface ModifySettings {
  downscaling: {
    enabled: boolean;
    mode: string;
    percent: number;
    width: number;
    height: number;
    file_size: number;
    shortest_side: number;
    longest_side: number;
    megapixels: number;
    resample: string;
  };
  misc: {
    keep_metadata: string;
    keep_timestamps: boolean;
  };
}

export interface GeneralSettings {
  custom_resampling: boolean;
  sorting_disabled: boolean;
  disable_downscaling_startup: boolean;
  disable_delete_startup: boolean;
  enable_jxl_effort_10: boolean;
  disable_progressive_jpegli: boolean;
  enable_custom_args: boolean;
  cjxl_args: string;
  avifenc_args: string;
  cjpegli_args: string;
  im_args: string;
  enable_quality_precision_snapping: boolean;
  processing_order: string;
  play_sound_on_finish: boolean;
  play_sound_on_finish_vol: number;
  ram_optimizer: string;
  ram_optimizer_rules: string;
  jpg_encoder: string;
  jxl_auto_lossless_jpeg: boolean;
  jxl_lossy_modular: boolean;
  jxl_int_effort: boolean;
  avif_encoder: string;
  avif_bit_depth: string;
  avif_aom_iq_tune: boolean;
  keep_if_larger: boolean;
  copy_if_larger: boolean;
  exiftool_args: Record<string, string>;
}

export interface InputSettings {
  excluded_formats: string[];
  sort_order: string;
}

export interface AppSettingsPayload {
  version: string;
  config_location: string;
  allowed_input: string[];
  max_threads: number;
  license_path?: string;
  license_3rd_party_path?: string;
  input: InputSettings;
  output: OutputSettings;
  modify: ModifySettings;
  settings: GeneralSettings;
  logging_enabled?: boolean;
}

export interface ExceptionItem {
  title: string;
  description: string;
  path: string;
}

export interface ProgressInfo {
  line1: string;
  line2: string;
  value: number;
  maximum: number;
}

export interface CheckResult {
  allowed_to_proceed: boolean;
  display_error: boolean;
  error_title: string;
  error_description: string;
}

export interface RuntimeThemePayload {
  mode: 'light' | 'dark' | 'system';
  themeName: string;
  themes: ThemeColors;
}
