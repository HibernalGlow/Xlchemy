export const Theme = {
  Dark: 'dark',
  Light: 'light',
  System: 'system',
} as const;

export const DARK_MODE_MEDIA = '(prefers-color-scheme: dark)';

export const OUTPUT_FORMATS = [
  'JPEG XL',
  'AVIF',
  'WebP',
  'JPEG',
  'PNG',
  'Lossless JPEG Transcoding',
  'JPEG Reconstruction',
  'Smallest Lossless',
] as const;

export const PROCESSING_ORDERS = [
  'Original',
  'Random',
  'Sequential',
  'Path Ascending',
  'Path Descending',
  'Size Ascending',
  'Size Descending',
] as const;

export const METADATA_MODES = [
  'Encoder - Wipe',
  'Encoder - Preserve',
  'ExifTool - Wipe',
  'ExifTool - Preserve',
  'ExifTool - Unsafe Wipe',
  'ExifTool - Custom',
] as const;

export const RESAMPLING_METHODS = [
  'Default',
  'Lanczos',
  'Point',
  'Box',
  'Cubic',
  'Hermite',
  'Gaussian',
  'Catrom',
  'Triangle',
  'Quadratic',
  'Mitchell',
  'CubicSpline',
  'Hamming',
  'Parzen',
  'Blackman',
  'Kaiser',
  'Welsh',
  'Hanning',
  'Bartlett',
  'Bohman',
] as const;

export const JPEG_ENCODERS = ['JPEGLI', 'libjpeg'] as const;
export const AVIF_ENCODERS = ['AOM AV1', 'SVT-AV1-PSY', 'slimg'] as const;

export const DUPLICATE_HANDLING = ['Rename', 'Replace', 'Skip'] as const;
export const DELETE_MODES = ['To Trash', 'Permanently'] as const;
export const JXL_NORMALIZE_WHEN = ['On Fail', 'Always'] as const;

export const AVIF_BIT_DEPTH_AOM = ['Auto', '12', '10', '8'] as const;
export const AVIF_BIT_DEPTH_SVT = ['Auto', '10', '8'] as const;

export const DEFAULT_EXCLUDED_FORMATS = ['avif', 'jxl', 'webp', 'gif'] as const;

export const DEFAULT_ALLOWED_INPUT = [
  'jpg',
  'jpeg',
  'jfif',
  'jif',
  'jpe',
  'png',
  'apng',
  'gif',
  'jxl',
  'webp',
  'jp2',
  'bmp',
  'ico',
  'tiff',
  'tif',
  'avif',
] as const;
