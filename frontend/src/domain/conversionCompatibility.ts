import type { AppSettings, FileItem, ModifySettings, OutputSettings } from './models';
import {
  getAnimatedTargetFormats,
  isAnimatedInputExt,
  needsDecodeProxy,
  requiresDirectSourceInput,
  supportsDirectEncodeInput,
  getDecoderKind,
} from './inputCapabilities';

export interface ItemCompatibilityIssue {
  code: string;
  title: string;
  description: string;
}

export function validateItemCompatibility(
  item: FileItem,
  output: OutputSettings,
  modify: ModifySettings,
  app: AppSettings
): ItemCompatibilityIssue | null {
  const ext = item.ext.toLowerCase();

  if (
    modify.downscaling.enabled &&
    (output.format === 'Lossless JPEG Transcoding' || output.format === 'JPEG Reconstruction')
  ) {
    return {
      code: 'CF2',
      title: 'Downscaling unsupported',
      description: `Downscaling is not supported for ${output.format}.`,
    };
  }

  if (isAnimatedInputExt(ext)) {
    const allowedTargets = getAnimatedTargetFormats(ext);
    if (!allowedTargets.includes(output.format)) {
      return {
        code: 'CF0',
        title: 'Unsupported animated conversion',
        description: `Transcoding ${ext.toUpperCase()} to ${output.format} is not supported.`,
      };
    }

    if (modify.downscaling.enabled) {
      return {
        code: 'CF1',
        title: 'Animated downscaling unsupported',
        description: `Downscaling is not supported for animated ${ext.toUpperCase()} inputs.`,
      };
    }
  }

  if (requiresDirectSourceInput(output.format) && !supportsDirectEncodeInput(output.format, ext, app)) {
    return {
      code: 'CF4',
      title: 'Unsupported source format',
      description: `${output.format} only supports specific source formats and ${ext.toUpperCase()} cannot be used directly.`,
    };
  }

  if (output.format === 'PNG' && getDecoderKind(ext) === null) {
    return {
      code: 'CF5',
      title: 'No decoder available',
      description: `No supported decoder is available for ${ext.toUpperCase()} input.`,
    };
  }

  if (needsDecodeProxy(output.format, ext, app, modify.downscaling.enabled) && getDecoderKind(ext) === null) {
    return {
      code: 'CF5',
      title: 'No decoder available',
      description: `No supported decoder is available for ${ext.toUpperCase()} input.`,
    };
  }

  return null;
}
