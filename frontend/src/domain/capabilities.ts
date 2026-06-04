import type { OutputSettings, AppSettings } from './models';

export interface FormatCapability {
  supportsLossless: boolean;
  supportsQuality: boolean;
  supportsEffort: boolean;
  supportsChromaSubsampling: boolean;
  supportsMetadata: boolean;
  defaultQuality: number;
  defaultEffort: number;
  qualityRange: [number, number];
  effortRange: [number, number];
}

export const FORMAT_CAPABILITIES: Record<string, FormatCapability> = {
  'JPEG XL': {
    supportsLossless: true,
    supportsQuality: true,
    supportsEffort: true,
    supportsChromaSubsampling: false,
    supportsMetadata: true,
    defaultQuality: 80,
    defaultEffort: 7,
    qualityRange: [1, 100],
    effortRange: [1, 10],
  },
  'AVIF': {
    supportsLossless: true,
    supportsQuality: true,
    supportsEffort: true,
    supportsChromaSubsampling: true,
    supportsMetadata: true,
    defaultQuality: 80,
    defaultEffort: 5,
    qualityRange: [1, 100],
    effortRange: [0, 10],
  },
  'JPEG': {
    supportsLossless: false,
    supportsQuality: true,
    supportsEffort: false,
    supportsChromaSubsampling: true,
    supportsMetadata: true,
    defaultQuality: 80,
    defaultEffort: 0,
    qualityRange: [1, 100],
    effortRange: [0, 0],
  },
  'WebP': {
    supportsLossless: true,
    supportsQuality: true,
    supportsEffort: true,
    supportsChromaSubsampling: false,
    supportsMetadata: true,
    defaultQuality: 80,
    defaultEffort: 4,
    qualityRange: [1, 100],
    effortRange: [0, 6],
  },
  'PNG': {
    supportsLossless: true,
    supportsQuality: false,
    supportsEffort: false,
    supportsChromaSubsampling: false,
    supportsMetadata: true,
    defaultQuality: 0,
    defaultEffort: 0,
    qualityRange: [0, 0],
    effortRange: [0, 0],
  },
  'Lossless JPEG Transcoding': {
    supportsLossless: true,
    supportsQuality: false,
    supportsEffort: true,
    supportsChromaSubsampling: false,
    supportsMetadata: false,
    defaultQuality: 0,
    defaultEffort: 7,
    qualityRange: [0, 0],
    effortRange: [1, 10],
  },
  'JPEG Reconstruction': {
    supportsLossless: true,
    supportsQuality: false,
    supportsEffort: false,
    supportsChromaSubsampling: false,
    supportsMetadata: false,
    defaultQuality: 0,
    defaultEffort: 0,
    qualityRange: [0, 0],
    effortRange: [0, 0],
  },
};

export function getFormatCapability(format: string): FormatCapability | undefined {
  return FORMAT_CAPABILITIES[format];
}

export function shouldShowQuality(format: string): boolean {
  return FORMAT_CAPABILITIES[format]?.supportsQuality ?? false;
}

export function shouldShowEffort(format: string): boolean {
  return FORMAT_CAPABILITIES[format]?.supportsEffort ?? false;
}

export function shouldShowLossless(format: string): boolean {
  return FORMAT_CAPABILITIES[format]?.supportsLossless ?? false;
}

export function shouldShowChromaSubsampling(format: string, encoder?: string): boolean {
  if (format === 'JPEG') return true;
  if (format === 'AVIF' && encoder === 'AOM AV1') return true;
  return false;
}

export function getVisibleSettings(output: OutputSettings, app: AppSettings): {
  showQuality: boolean;
  showEffort: boolean;
  showLossless: boolean;
  showJXLModular: boolean;
  showJXLVerify: boolean;
  showChromaSub: boolean;
  showMaxCompression: boolean;
  showIntelligentEffort: boolean;
} {
  const cap = getFormatCapability(output.format);
  const isJXL = output.format === 'JPEG XL';
  const isLossless = output.lossless;

  return {
    showQuality: cap?.supportsQuality ?? false,
    showEffort: cap?.supportsEffort ?? false,
    showLossless: cap?.supportsLossless ?? false,
    showJXLModular: isJXL && !isLossless && app.jxl_lossy_modular,
    showJXLVerify: isJXL && isLossless,
    showChromaSub: shouldShowChromaSubsampling(output.format, app.avif_encoder),
    showMaxCompression: isJXL && isLossless,
    showIntelligentEffort: isJXL && app.jxl_int_effort,
  };
}

export function getEncoderForFormat(format: string, app: AppSettings): string {
  switch (format) {
    case 'JPEG':
      return app.jpg_encoder;
    case 'AVIF':
      return app.avif_encoder;
    default:
      return '';
  }
}
