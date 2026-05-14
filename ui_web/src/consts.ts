export const Theme = {
  Dark: 'dark',
  Light: 'light',
  System: 'system',
} as const;

export const DARK_MODE_MEDIA = '(prefers-color-scheme: dark)';

export const OUTPUT_FORMATS = [
  'AVIF',
  'JPEG',
  'JPEG XL',
  'PNG',
  'WebP',
  'Smallest Lossless',
  'Smallest Lossy',
] as const;

export const PROCESSING_ORDERS = [
  'Sequential',
  'Random',
  'Reverse',
  'Smallest First',
  'Largest First',
] as const;

export const METADATA_MODES = [
  'None',
  'Encoder - Preserve',
  'ExifTool - Preserve',
  'ExifTool - Custom',
] as const;

export const RESAMPLING_METHODS = [
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

export const JPEG_ENCODERS = ['libjpeg-turbo', 'JPEGLI'] as const;
export const AVIF_ENCODERS = ['libavif (aom)', 'libavif (dav1d)'] as const;
