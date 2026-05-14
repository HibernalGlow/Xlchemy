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
  jxl_modular: boolean;
  intelligent_effort: boolean;
  custom_output_dir: boolean;
  custom_output_dir_path: string;
  keep_dir_struct: boolean;
  thread_count: number;
  sm_format_pool: string[];
}

export interface ModifySettings {
  downscale: {
    enabled: boolean;
    width: number;
    height: number;
    keep_aspect_ratio: boolean;
    resampling: string;
  };
  misc: {
    keep_metadata: string;
    keep_dates: boolean;
    preserve_orientation: boolean;
  };
}

export interface GeneralSettings {
  processing_order: string;
  play_sound_on_finish: boolean;
  play_sound_on_finish_vol: number;
  ram_optimizer: string;
  ram_optimizer_rules: string;
  jpg_encoder: string;
  avif_encoder: string;
  custom_resampling: boolean;
  quality_prec_snap: boolean;
  jxl_effort_10: boolean;
  jxl_lossy_modular: boolean;
  jxl_int_effort: boolean;
  exiftool_args: Record<string, string>;
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
