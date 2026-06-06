/**
 * Host-independent constants that mirror what the Go backend provides via GetConstants.
 * Used as frontend defaults when the backend is unavailable or returns incomplete data.
 */

import type { AppConstants } from './models';
import {
  JPEG_ALIASES,
  ALLOWED_INPUT_CJXL,
  ALLOWED_INPUT_CJPEGLI,
  ALLOWED_INPUT_IMAGE_MAGICK,
  ALLOWED_INPUT_AVIFENC,
} from './inputCapabilities';

/** Resampling filters supported by ImageMagick (mirrors Go AllowedResampling). */
export const ALLOWED_RESAMPLING = [
  'Lanczos', 'Point', 'Box', 'Cubic', 'Hermite', 'Gaussian',
  'Catrom', 'Triangle', 'Quadratic', 'Mitchell', 'CubicSpline',
  'Hamming', 'Parzen', 'Blackman', 'Kaiser', 'Welsh', 'Hanning',
  'Bartlett', 'Bohman',
] as const;

/** Deduplicated union of all encoder input extensions. */
export const DEFAULT_ALLOWED_INPUT: readonly string[] = (() => {
  const seen = new Set<string>();
  const combined: string[] = [];
  const allLists = [
    ['jxl'], // djxl
    ALLOWED_INPUT_CJXL,
    ALLOWED_INPUT_CJPEGLI,
    ALLOWED_INPUT_IMAGE_MAGICK,
    ALLOWED_INPUT_AVIFENC,
    ['avif'], // avifdec
    ['png'],  // oxipng
  ];
  for (const list of allLists) {
    for (const ext of list) {
      if (!seen.has(ext)) {
        seen.add(ext);
        combined.push(ext);
      }
    }
  }
  return combined;
})();

/** Named filter groups for file dialogs (mirrors Go AllowedInputFilters). */
export const DEFAULT_ALLOWED_INPUT_FILTERS = [
  'Supported Images',
  'APNG',
  'AVIF',
  'BMP',
  'GIF',
  'ICO',
  'JPEG',
  'JPEG XL',
  'JPEG2000',
  'PNG',
  'TIFF',
  'WebP',
];

/** Default AppConstants used as frontend fallback. */
export const DEFAULT_APP_CONSTANTS: AppConstants = {
  version: '',
  allowedInput: [...DEFAULT_ALLOWED_INPUT],
  allowedResampling: [...ALLOWED_RESAMPLING],
  allowedInputFilters: [...DEFAULT_ALLOWED_INPUT_FILTERS],
  jpegAliases: [...JPEG_ALIASES],
  cpuCount: 4,
  updateCheckerEnabled: false,
};

/**
 * Merge backend-returned constants with frontend defaults.
 * Backend values take priority; missing/empty arrays fall back to frontend defaults.
 */
export function mergeConstants(
  backend: Partial<AppConstants> | null | undefined
): AppConstants {
  if (!backend) return { ...DEFAULT_APP_CONSTANTS };

  return {
    version: backend.version ?? DEFAULT_APP_CONSTANTS.version,
    allowedInput: nonEmpty(backend.allowedInput) ?? DEFAULT_APP_CONSTANTS.allowedInput,
    allowedResampling: nonEmpty(backend.allowedResampling) ?? DEFAULT_APP_CONSTANTS.allowedResampling,
    allowedInputFilters: nonEmpty(backend.allowedInputFilters) ?? DEFAULT_APP_CONSTANTS.allowedInputFilters,
    jpegAliases: nonEmpty(backend.jpegAliases) ?? DEFAULT_APP_CONSTANTS.jpegAliases,
    cpuCount: backend.cpuCount && backend.cpuCount > 0 ? backend.cpuCount : DEFAULT_APP_CONSTANTS.cpuCount,
    updateCheckerEnabled: backend.updateCheckerEnabled ?? DEFAULT_APP_CONSTANTS.updateCheckerEnabled,
  };
}

function nonEmpty<T>(arr: T[] | undefined): T[] | undefined {
  return Array.isArray(arr) && arr.length > 0 ? arr : undefined;
}
