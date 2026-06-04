import type { OutputSettings, ModifySettings, AppSettings, FileItem } from './models';

export interface ValidationResult {
  valid: boolean;
  errorTitle?: string;
  errorDescription?: string;
}

export function validateConversionReady(
  items: FileItem[],
  output: OutputSettings,
  modify: ModifySettings,
  app: AppSettings
): ValidationResult {
  if (items.length === 0) {
    return {
      valid: false,
      errorTitle: 'No files selected',
      errorDescription: 'Please add at least one image file to convert.',
    };
  }

  if (!output.format) {
    return {
      valid: false,
      errorTitle: 'No output format',
      errorDescription: 'Please select an output format.',
    };
  }

  // Smallest format pool validation
  if (output.format === 'Smallest Lossless' || output.format === 'Smallest Lossy') {
    const pool = output.smallest_format_pool || {};
    const hasAny = Object.values(pool).some(Boolean);
    if (!hasAny) {
      return {
        valid: false,
        errorTitle: 'No formats in pool',
        errorDescription: 'Please select at least one format for the Smallest Format pool.',
      };
    }
  }

  // Downscaling validation
  if (modify.downscaling.enabled) {
    const ds = modify.downscaling;
    switch (ds.mode) {
      case 'Resolution':
        if (ds.width <= 0 && ds.height <= 0) {
          return {
            valid: false,
            errorTitle: 'Invalid resolution',
            errorDescription: 'Please enter a valid width or height for downscaling.',
          };
        }
        break;
      case 'Percent':
        if (ds.percent <= 0 || ds.percent > 100) {
          return {
            valid: false,
            errorTitle: 'Invalid percentage',
            errorDescription: 'Downscaling percentage must be between 1 and 100.',
          };
        }
        break;
      case 'File Size':
        if (ds.file_size <= 0) {
          return {
            valid: false,
            errorTitle: 'Invalid file size',
            errorDescription: 'Please enter a valid target file size.',
          };
        }
        break;
    }
  }

  // Custom output dir validation
  if (output.custom_output_dir && !output.custom_output_dir_path.trim()) {
    return {
      valid: false,
      errorTitle: 'No output folder',
      errorDescription: 'Please select a custom output folder.',
    };
  }

  return { valid: true };
}

export function isAllowedInput(ext: string, allowedList: string[]): boolean {
  return allowedList.includes(ext.toLowerCase());
}

export function isJPEGAlias(ext: string): boolean {
  const aliases = ['jpg', 'jpeg', 'jfif', 'jif', 'jpe'];
  return aliases.includes(ext.toLowerCase());
}

export function getOutputExtension(format: string): string {
  switch (format) {
    case 'JPEG XL':
    case 'Lossless JPEG Transcoding':
    case 'JPEG Reconstruction':
      return 'jxl';
    case 'AVIF':
      return 'avif';
    case 'JPEG':
      return 'jpg';
    case 'WebP':
      return 'webp';
    case 'PNG':
      return 'png';
    default:
      return '';
  }
}
