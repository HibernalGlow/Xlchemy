import type { OutputSettings, ModifySettings, AppSettings, FileItem } from './models';
import { DEFAULT_OUTPUT_SETTINGS, DEFAULT_MODIFY_SETTINGS, DEFAULT_APP_SETTINGS } from './defaults';

export function normalizeOutputSettings(raw: Partial<OutputSettings>): OutputSettings {
  return {
    format: raw.format ?? DEFAULT_OUTPUT_SETTINGS.format,
    quality: clamp(raw.quality ?? DEFAULT_OUTPUT_SETTINGS.quality, 1, 100),
    lossless: raw.lossless ?? DEFAULT_OUTPUT_SETTINGS.lossless,
    max_compression: raw.max_compression ?? DEFAULT_OUTPUT_SETTINGS.max_compression,
    effort: clamp(raw.effort ?? DEFAULT_OUTPUT_SETTINGS.effort, 1, 10),
    intelligent_effort: raw.intelligent_effort ?? DEFAULT_OUTPUT_SETTINGS.intelligent_effort,
    jxl_modular: raw.jxl_modular ?? DEFAULT_OUTPUT_SETTINGS.jxl_modular,
    jxl_verify: raw.jxl_verify ?? DEFAULT_OUTPUT_SETTINGS.jxl_verify,
    jxl_normalize_enable: raw.jxl_normalize_enable ?? DEFAULT_OUTPUT_SETTINGS.jxl_normalize_enable,
    jxl_normalize_when: raw.jxl_normalize_when ?? DEFAULT_OUTPUT_SETTINGS.jxl_normalize_when,
    aom_av1_chroma_subsampling: raw.aom_av1_chroma_subsampling ?? DEFAULT_OUTPUT_SETTINGS.aom_av1_chroma_subsampling,
    jpegli_chroma_subsampling: raw.jpegli_chroma_subsampling ?? DEFAULT_OUTPUT_SETTINGS.jpegli_chroma_subsampling,
    jpg_chroma_subsampling: raw.jpg_chroma_subsampling ?? DEFAULT_OUTPUT_SETTINGS.jpg_chroma_subsampling,
    if_file_exists: raw.if_file_exists ?? DEFAULT_OUTPUT_SETTINGS.if_file_exists,
    custom_output_dir: raw.custom_output_dir ?? DEFAULT_OUTPUT_SETTINGS.custom_output_dir,
    custom_output_dir_path: raw.custom_output_dir_path ?? DEFAULT_OUTPUT_SETTINGS.custom_output_dir_path,
    keep_dir_struct: raw.keep_dir_struct ?? DEFAULT_OUTPUT_SETTINGS.keep_dir_struct,
    delete_original: raw.delete_original ?? DEFAULT_OUTPUT_SETTINGS.delete_original,
    delete_original_mode: raw.delete_original_mode ?? DEFAULT_OUTPUT_SETTINGS.delete_original_mode,
    smallest_format_pool: raw.smallest_format_pool ?? { ...DEFAULT_OUTPUT_SETTINGS.smallest_format_pool },
    jxl_png_fallback: raw.jxl_png_fallback ?? DEFAULT_OUTPUT_SETTINGS.jxl_png_fallback,
    threads: raw.threads,
  };
}

export function normalizeModifySettings(raw: Partial<ModifySettings>): ModifySettings {
  const ds = (raw.downscaling ?? {}) as Partial<ModifySettings['downscaling']>;
  return {
    downscaling: {
      enabled: ds.enabled ?? DEFAULT_MODIFY_SETTINGS.downscaling.enabled,
      mode: ds.mode ?? DEFAULT_MODIFY_SETTINGS.downscaling.mode,
      percent: clamp(ds.percent ?? DEFAULT_MODIFY_SETTINGS.downscaling.percent, 1, 100),
      width: Math.max(1, ds.width ?? DEFAULT_MODIFY_SETTINGS.downscaling.width),
      height: Math.max(1, ds.height ?? DEFAULT_MODIFY_SETTINGS.downscaling.height),
      file_size: Math.max(1, ds.file_size ?? DEFAULT_MODIFY_SETTINGS.downscaling.file_size),
      shortest_side: Math.max(1, ds.shortest_side ?? DEFAULT_MODIFY_SETTINGS.downscaling.shortest_side),
      longest_side: Math.max(1, ds.longest_side ?? DEFAULT_MODIFY_SETTINGS.downscaling.longest_side),
      megapixels: Math.max(0.1, ds.megapixels ?? DEFAULT_MODIFY_SETTINGS.downscaling.megapixels),
      resample: ds.resample ?? DEFAULT_MODIFY_SETTINGS.downscaling.resample,
    },
    misc: {
      keep_metadata: raw.misc?.keep_metadata ?? DEFAULT_MODIFY_SETTINGS.misc.keep_metadata,
      keep_timestamps: raw.misc?.keep_timestamps ?? DEFAULT_MODIFY_SETTINGS.misc.keep_timestamps,
    },
  };
}

export function normalizeAppSettings(raw: Partial<AppSettings>): AppSettings {
  const metadataMap: Record<string, string> = {
    'Encoder - 清除': 'Encoder - Wipe',
    'Encoder - 保留': 'Encoder - Preserve',
    'ExifTool - 清除': 'ExifTool - Wipe',
    'ExifTool - 保留': 'ExifTool - Preserve',
    'ExifTool - 不安全清除': 'ExifTool - Unsafe Wipe',
    'ExifTool - 自定义': 'ExifTool - Custom',
  };

  let keepMetadata = raw.exiftool_args?.keep_metadata ?? DEFAULT_APP_SETTINGS.exiftool_args['ExifTool - Wipe'];
  if (metadataMap[keepMetadata]) keepMetadata = metadataMap[keepMetadata];

  return {
    theme: raw.theme ?? DEFAULT_APP_SETTINGS.theme,
    custom_resampling: raw.custom_resampling ?? DEFAULT_APP_SETTINGS.custom_resampling,
    sorting_disabled: raw.sorting_disabled ?? DEFAULT_APP_SETTINGS.sorting_disabled,
    excluded_formats: Array.isArray(raw.excluded_formats) ? raw.excluded_formats : DEFAULT_APP_SETTINGS.excluded_formats,
    disable_downscaling_startup: raw.disable_downscaling_startup ?? DEFAULT_APP_SETTINGS.disable_downscaling_startup,
    disable_delete_startup: raw.disable_delete_startup ?? DEFAULT_APP_SETTINGS.disable_delete_startup,
    enable_jxl_effort_10: raw.enable_jxl_effort_10 ?? DEFAULT_APP_SETTINGS.enable_jxl_effort_10,
    disable_progressive_jpegli: raw.disable_progressive_jpegli ?? DEFAULT_APP_SETTINGS.disable_progressive_jpegli,
    enable_custom_args: raw.enable_custom_args ?? DEFAULT_APP_SETTINGS.enable_custom_args,
    cjxl_args: raw.cjxl_args ?? DEFAULT_APP_SETTINGS.cjxl_args,
    avifenc_args: raw.avifenc_args ?? DEFAULT_APP_SETTINGS.avifenc_args,
    cjpegli_args: raw.cjpegli_args ?? DEFAULT_APP_SETTINGS.cjpegli_args,
    im_args: raw.im_args ?? DEFAULT_APP_SETTINGS.im_args,
    enable_quality_precision_snapping: raw.enable_quality_precision_snapping ?? DEFAULT_APP_SETTINGS.enable_quality_precision_snapping,
    jpg_encoder: raw.jpg_encoder ?? DEFAULT_APP_SETTINGS.jpg_encoder,
    jxl_auto_lossless_jpeg: raw.jxl_auto_lossless_jpeg ?? DEFAULT_APP_SETTINGS.jxl_auto_lossless_jpeg,
    ram_optimizer: raw.ram_optimizer ?? DEFAULT_APP_SETTINGS.ram_optimizer,
    ram_optimizer_rules: raw.ram_optimizer_rules ?? DEFAULT_APP_SETTINGS.ram_optimizer_rules,
    jxl_lossy_modular: raw.jxl_lossy_modular ?? DEFAULT_APP_SETTINGS.jxl_lossy_modular,
    jxl_int_effort: raw.jxl_int_effort ?? DEFAULT_APP_SETTINGS.jxl_int_effort,
    play_sound_on_finish: raw.play_sound_on_finish ?? DEFAULT_APP_SETTINGS.play_sound_on_finish,
    play_sound_on_finish_vol: clamp(raw.play_sound_on_finish_vol ?? DEFAULT_APP_SETTINGS.play_sound_on_finish_vol, 0, 1),
    keep_if_larger: raw.keep_if_larger ?? DEFAULT_APP_SETTINGS.keep_if_larger,
    copy_if_larger: raw.copy_if_larger ?? DEFAULT_APP_SETTINGS.copy_if_larger,
    exiftool_args: raw.exiftool_args ?? { ...DEFAULT_APP_SETTINGS.exiftool_args },
    avif_encoder: raw.avif_encoder ?? DEFAULT_APP_SETTINGS.avif_encoder,
    avif_bit_depth: raw.avif_bit_depth ?? DEFAULT_APP_SETTINGS.avif_bit_depth,
    avif_aom_iq_tune: raw.avif_aom_iq_tune ?? DEFAULT_APP_SETTINGS.avif_aom_iq_tune,
    processing_order: raw.processing_order ?? DEFAULT_APP_SETTINGS.processing_order,
  };
}

export function normalizeFileItem(raw: any): FileItem {
  return {
    absPath: String(raw.absPath || raw.abs_path || ''),
    name: String(raw.name || ''),
    ext: String(raw.ext || '').toLowerCase(),
    dir: String(raw.dir || ''),
    size: Number(raw.size || 0),
  };
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}
