import { DEFAULT_EXCLUDED_FORMATS } from '~/consts';
import type { GeneralSettings, InputSettings, ModifySettings, OutputSettings } from '~/types';

const DEFAULT_RAM_OPTIMIZER_RULES =
  '("all", 3.5, "7/8"), ("all", 4.5, "6/8"), ("all", 5.5, "5/8"), ("all", 6.5, "4/8"), ("all", 7.5, "3/8"), ("all", 8.5, "2/8"), ("all", 9.5, "1/8"), ("all", 10.5, "1")';

export function getDefaultInputSettings(): InputSettings {
  return {
    excluded_formats: [...DEFAULT_EXCLUDED_FORMATS],
    sort_order: 'Original',
  };
}

export function getDefaultOutputSettings(maxThreads = 1): OutputSettings {
  const threadDefault = Math.max(maxThreads - 1, 1);
  return {
    format: 'JPEG XL',
    quality: 80,
    effort: 7,
    lossless: false,
    intelligent_effort: false,
    jxl_modular: false,
    jxl_verify: false,
    jxl_normalize_enable: false,
    jxl_normalize_when: 'On Fail',
    max_compression: false,
    aom_av1_chroma_subsampling: 'Default',
    jpegli_chroma_subsampling: 'Default',
    jpg_chroma_subsampling: 'Default',
    if_file_exists: 'Rename',
    custom_output_dir: false,
    custom_output_dir_path: '',
    keep_dir_struct: false,
    delete_original: false,
    delete_original_mode: 'To Trash',
    thread_count: threadDefault,
    smallest_format_pool: {
      png: true,
      webp: true,
      jxl: true,
    },
    jxl_png_fallback: false,
    clear_after_conv: false,
  };
}

export function getDefaultModifySettings(): ModifySettings {
  return {
    downscaling: {
      enabled: false,
      mode: 'Resolution',
      percent: 80,
      width: 2000,
      height: 2000,
      file_size: 300,
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
}

export function getDefaultGeneralSettings(): GeneralSettings {
  return {
    custom_resampling: false,
    sorting_disabled: false,
    disable_downscaling_startup: true,
    disable_delete_startup: true,
    enable_jxl_effort_10: false,
    disable_progressive_jpegli: false,
    enable_custom_args: false,
    cjxl_args: '',
    avifenc_args: '',
    cjpegli_args: '',
    im_args: '',
    enable_quality_precision_snapping: false,
    jpg_encoder: 'JPEGLI',
    jxl_auto_lossless_jpeg: false,
    ram_optimizer: 'Dynamic',
    ram_optimizer_rules: DEFAULT_RAM_OPTIMIZER_RULES,
    jxl_lossy_modular: false,
    jxl_int_effort: false,
    play_sound_on_finish: false,
    play_sound_on_finish_vol: 0.6,
    keep_if_larger: false,
    copy_if_larger: false,
    exiftool_args: {
      'ExifTool - Wipe': '-m -all= -tagsFromFile @ -icc_profile:all -ColorSpace:all -Orientation $dst -overwrite_original',
      'ExifTool - Preserve': '-m -tagsFromFile $src $dst -overwrite_original',
      'ExifTool - Unsafe Wipe': '-m -all= $dst -overwrite_original',
      'ExifTool - Custom': '',
    },
    avif_encoder: 'AOM AV1',
    avif_bit_depth: 'Auto',
    avif_aom_iq_tune: false,
    processing_order: 'Original',
  };
}
