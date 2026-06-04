import type { AppSettings } from './models';

export const JPEG_ALIASES = ['jpg', 'jpeg', 'jfif', 'jif', 'jpe'] as const;
export const ALLOWED_INPUT_CJXL = [...JPEG_ALIASES, 'png', 'apng', 'gif', 'jxl'] as const;
export const ALLOWED_INPUT_CJPEGLI = [...JPEG_ALIASES, 'png', 'jxl'] as const;
export const ALLOWED_INPUT_IMAGE_MAGICK = [...JPEG_ALIASES, 'png', 'gif', 'webp', 'jp2', 'bmp', 'ico', 'tiff', 'tif'] as const;
export const ALLOWED_INPUT_AVIFENC = [...JPEG_ALIASES, 'png'] as const;

const ANIMATED_TARGETS = {
  gif: ['JPEG XL', 'WebP'],
  apng: ['JPEG XL'],
} as const;

export type DecoderKind = 'imagemagick' | 'djxl' | 'avifdec';
export type MetadataEncoderKind = 'imagemagick' | 'jxl' | 'avifenc' | 'oxipng' | 'none';

function normalizeExt(ext: string): string {
  return ext.trim().toLowerCase();
}

export function isJPEGAliasExt(ext: string): boolean {
  return JPEG_ALIASES.includes(normalizeExt(ext) as (typeof JPEG_ALIASES)[number]);
}

export function isAnimatedInputExt(ext: string): boolean {
  const normalized = normalizeExt(ext);
  return normalized === 'gif' || normalized === 'apng';
}

export function getAnimatedTargetFormats(ext: string): readonly string[] {
  const normalized = normalizeExt(ext);
  if (normalized === 'gif' || normalized === 'apng') {
    return ANIMATED_TARGETS[normalized];
  }
  return [];
}

export function supportsImageMagickInput(ext: string): boolean {
  return ALLOWED_INPUT_IMAGE_MAGICK.includes(normalizeExt(ext) as (typeof ALLOWED_INPUT_IMAGE_MAGICK)[number]);
}

export function getDecoderKind(ext: string): DecoderKind | null {
  const normalized = normalizeExt(ext);

  if (normalized === 'jxl') return 'djxl';
  if (normalized === 'avif') return 'avifdec';
  if (supportsImageMagickInput(normalized)) return 'imagemagick';

  return null;
}

export function supportsDirectEncodeInput(
  format: string,
  ext: string,
  app: AppSettings
): boolean {
  const normalized = normalizeExt(ext);

  switch (format) {
    case 'JPEG XL':
      return ALLOWED_INPUT_CJXL.includes(normalized as (typeof ALLOWED_INPUT_CJXL)[number]);
    case 'AVIF':
      return ALLOWED_INPUT_AVIFENC.includes(normalized as (typeof ALLOWED_INPUT_AVIFENC)[number]);
    case 'WebP':
      return supportsImageMagickInput(normalized);
    case 'JPEG':
      if (app.jpg_encoder === 'JPEGLI') {
        return ALLOWED_INPUT_CJPEGLI.includes(normalized as (typeof ALLOWED_INPUT_CJPEGLI)[number]);
      }
      return supportsImageMagickInput(normalized);
    case 'Lossless JPEG Transcoding':
      return isJPEGAliasExt(normalized);
    case 'JPEG Reconstruction':
      return normalized === 'jxl';
    case 'PNG':
      return getDecoderKind(normalized) !== null;
    default:
      return false;
  }
}

export function requiresDirectSourceInput(format: string): boolean {
  return format === 'Lossless JPEG Transcoding' || format === 'JPEG Reconstruction';
}

export function needsDecodeProxy(
  format: string,
  ext: string,
  app: AppSettings,
  downscalingEnabled: boolean
): boolean {
  const normalized = normalizeExt(ext);

  if (format === 'Smallest Lossless') return true;
  if (format === 'PNG') return false;
  if (requiresDirectSourceInput(format)) return false;

  if (downscalingEnabled) {
    return !supportsImageMagickInput(normalized);
  }

  return !supportsDirectEncodeInput(format, normalized, app);
}
