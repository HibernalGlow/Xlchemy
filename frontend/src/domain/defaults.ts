import type { OutputSettings, ModifySettings, AppSettings, AppStateSnapshot, ProgressCardConfig } from './models';

export const DEFAULT_OUTPUT_SETTINGS: OutputSettings = {
  format: 'JPEG XL',
  quality: 80,
  lossless: false,
  max_compression: false,
  effort: 7,
  intelligent_effort: false,
  jxl_modular: false,
  jxl_verify: false,
  jxl_normalize_enable: false,
  jxl_normalize_when: 'On Fail',
  aom_av1_chroma_subsampling: 'Default',
  jpegli_chroma_subsampling: 'Default',
  jpg_chroma_subsampling: 'Default',
  if_file_exists: 'Replace',
  custom_output_dir: false,
  custom_output_dir_path: '',
  keep_dir_struct: false,
  delete_original: false,
  delete_original_mode: 'To Trash',
  smallest_format_pool: { png: true, webp: true, jxl: true },
  jxl_png_fallback: true,
  threads: undefined,
};

export const DEFAULT_MODIFY_SETTINGS: ModifySettings = {
  downscaling: {
    enabled: false,
    mode: 'Resolution',
    percent: 50,
    width: 1920,
    height: 1080,
    file_size: 500,
    shortest_side: 1080,
    longest_side: 1920,
    megapixels: 2.1,
    resample: 'Default',
  },
  misc: {
    keep_metadata: 'Encoder - Wipe',
    keep_timestamps: false,
  },
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'Miku',
  custom_resampling: false,
  sorting_disabled: false,
  excluded_formats: ['avif', 'jxl', 'webp', 'gif'],
  disable_downscaling_startup: false,
  disable_delete_startup: true,
  enable_jxl_effort_10: false,
  disable_progressive_jpegli: false,
  enable_custom_args: false,
  cjxl_args: '',
  avifenc_args: '',
  cjpegli_args: '',
  im_args: '',
  enable_quality_precision_snapping: true,
  jpg_encoder: 'JPEGLI',
  jxl_auto_lossless_jpeg: true,
  ram_optimizer: 'Disabled',
  ram_optimizer_rules: '',
  jxl_lossy_modular: false,
  jxl_int_effort: false,
  play_sound_on_finish: true,
  play_sound_on_finish_vol: 0.5,
  keep_if_larger: false,
  copy_if_larger: false,
  exiftool_args: {
    'ExifTool - Wipe': '-overwrite_original -all= --ICC_Profile:all "$dst"',
    'ExifTool - Preserve': '-overwrite_original -TagsFromFile "$src" -all:all "$dst"',
    'ExifTool - Unsafe Wipe': '-overwrite_original -all= "$dst"',
    'ExifTool - Custom': '',
  },
  avif_encoder: 'AOM AV1',
  avif_bit_depth: 'Auto',
  avif_aom_iq_tune: false,
  processing_order: 'Original',
};

export const DEFAULT_PROGRESS_CARD_CONFIG: ProgressCardConfig = {
  showCounter: true,
  showSummary: true,
  showEta: true,
  showFormat: true,
  showEncoder: true,
  showRawLines: true,
  showCurrentFile: true,
  showSizeChange: true,
};

export const DEFAULT_LANE_ORDER = ['input', 'output', 'modify', 'settings', 'about'];
export const DEFAULT_LANE_WIDTH = 18;
export const DEFAULT_LANE_LABELS: Record<string, string> = {
  input: 'Input',
  output: 'Output',
  modify: 'Modify',
  settings: 'Settings',
  about: 'About',
};

export const DEFAULT_CARD_LAYOUT: Record<string, string[]> = {
  input: ['input-files', 'progress-status', 'input-filter'],
  output: ['output-format', 'output-conversion', 'output-save'],
  modify: ['modify-downscaling', 'modify-misc'],
  settings: ['settings-appearance', 'settings-general', 'settings-conversion', 'settings-exiftool', 'settings-advanced'],
  about: ['about-info'],
};

export function createDefaultSnapshot(): AppStateSnapshot {
  return {
    domain: {
      output: { ...DEFAULT_OUTPUT_SETTINGS },
      modify: {
        downscaling: { ...DEFAULT_MODIFY_SETTINGS.downscaling },
        misc: { ...DEFAULT_MODIFY_SETTINGS.misc },
      },
      app: { ...DEFAULT_APP_SETTINGS },
    },
    layout: {
      laneOrder: [...DEFAULT_LANE_ORDER],
      laneLabels: { ...DEFAULT_LANE_LABELS },
      laneWidths: {},
      cardLayout: Object.fromEntries(
        Object.entries(DEFAULT_CARD_LAYOUT).map(([k, v]) => [k, [...v]])
      ),
      singleLaneMode: false,
      activeLaneId: 'input',
      progressCardConfig: { ...DEFAULT_PROGRESS_CARD_CONFIG },
    },
    presets: [],
    theme: {
      name: 'Miku',
      mode: 'system',
      customThemes: [],
    },
    lang: 'en',
    executor: 'wails',
  };
}
