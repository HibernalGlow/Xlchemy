import type {
  AppSettings,
  ExecutionTask,
  FileItem,
  ModifySettings,
  OutputSettings,
  ToolchainSelection,
} from '$lib/domain';
import { isJPEGAlias, getDecoderKind } from '$lib/domain';
import { getMetadataArgs } from './metadata';
import { getDownscaleArgs } from './downscale';

interface EncodeTaskContext {
  item: FileItem;
  inputPath: string;
  inputExt?: string;
  outputPath: string;
  output: OutputSettings;
  modify: ModifySettings;
  app: AppSettings;
  toolchain: ToolchainSelection;
}

function getThreads(output: OutputSettings): number {
  return output.threads || 4;
}

function splitCustomArgs(enabled: boolean, raw: string): string[] {
  if (!enabled || !raw) return [];
  return raw.split(/\s+/).filter(Boolean);
}

function buildJXLTask({
  item,
  inputPath,
  outputPath,
  output,
  modify,
  app,
  toolchain,
}: EncodeTaskContext): ExecutionTask {
  const args: string[] = [];

  if (output.lossless) {
    args.push('-q', '100');
    args.push('--lossless_jpeg=0');
    if (app.jxl_auto_lossless_jpeg && isJPEGAlias(item.ext)) {
      args[args.length - 1] = '--lossless_jpeg=1';
    }
  } else {
    args.push('-q', String(output.quality), '--lossless_jpeg=0');
  }

  args.push('-e', String(output.effort));
  args.push('--num_threads', String(getThreads(output)));

  if (!output.lossless && app.jxl_lossy_modular) {
    args.push('--modular=1');
  }

  args.push(...getMetadataArgs('jxl', modify.misc.keep_metadata, output.lossless && isJPEGAlias(item.ext)));
  args.push(...splitCustomArgs(app.enable_custom_args, app.cjxl_args));

  return {
    id: `enc-${item.absPath}`,
    inputPath: item.absPath,
    outputPath,
    command: toolchain.cjxlPath,
    args: [...args, inputPath, outputPath],
    stepType: 'encode',
  };
}

function buildAVIFTask({
  item,
  inputPath,
  outputPath,
  output,
  modify,
  app,
  toolchain,
}: EncodeTaskContext): ExecutionTask {
  if (app.avif_encoder === 'slimg') {
    return {
      id: `enc-${item.absPath}`,
      inputPath: item.absPath,
      outputPath,
      command: 'slimg',
      args: [inputPath, outputPath, '-q', String(output.quality)],
      stepType: 'encode',
    };
  }

  const args: string[] = [
    '-q', String(output.quality),
    '-s', String(output.effort),
    '-j', String(getThreads(output)),
  ];

  if (app.avif_bit_depth !== 'Auto') {
    args.push('--bitdepth', app.avif_bit_depth);
  }

  switch (app.avif_encoder) {
    case 'AOM AV1':
      args.push('-c', 'aom');
      if (output.aom_av1_chroma_subsampling !== 'Default') {
        args.push('-y', output.aom_av1_chroma_subsampling.replace(':', ''));
      }
      if (app.avif_aom_iq_tune) {
        args.push('-a', 'tune=iq');
      }
      break;
    case 'SVT-AV1-PSY':
      args.push('-c', 'svt', '-y', '420', '-a', 'tune=4');
      break;
  }

  args.push(...getMetadataArgs('avifenc', modify.misc.keep_metadata, false));
  args.push(...splitCustomArgs(app.enable_custom_args, app.avifenc_args));

  return {
    id: `enc-${item.absPath}`,
    inputPath: item.absPath,
    outputPath,
    command: toolchain.avifencPath,
    args: [...args, inputPath, outputPath],
    stepType: 'encode',
  };
}

function buildJPEGTask({
  item,
  inputPath,
  outputPath,
  output,
  modify,
  app,
  toolchain,
}: EncodeTaskContext): ExecutionTask {
  const isJpegli = app.jpg_encoder === 'JPEGLI';
  const args: string[] = [];

  if (isJpegli) {
    args.push('-q', String(output.quality));
    if (app.disable_progressive_jpegli) {
      args.push('-p', '0');
    }
    if (output.jpegli_chroma_subsampling !== 'Default') {
      args.push('--chroma_subsampling', output.jpegli_chroma_subsampling.replace(':', ''));
    }
  } else {
    args.push(...(getDownscaleArgs(modify) || []));
    args.push('-quality', String(output.quality));
    if (output.jpg_chroma_subsampling !== 'Default') {
      args.push('-sampling-factor', output.jpg_chroma_subsampling);
    }
  }

  args.push(...getMetadataArgs(isJpegli ? 'none' : 'imagemagick', modify.misc.keep_metadata, false));
  args.push(...splitCustomArgs(app.enable_custom_args, isJpegli ? app.cjpegli_args : app.im_args));

  return {
    id: `enc-${item.absPath}`,
    inputPath: item.absPath,
    outputPath,
    command: isJpegli ? toolchain.cjpegliPath : toolchain.imagemagickPath,
    args: [...args, inputPath, outputPath],
    stepType: 'encode',
  };
}

function buildWebPTask({
  item,
  inputPath,
  outputPath,
  output,
  modify,
  app,
  toolchain,
}: EncodeTaskContext): ExecutionTask {
  const args: string[] = [...(getDownscaleArgs(modify) || [])];

  if (output.lossless) {
    args.push('-define', 'webp:lossless=true');
  } else {
    args.push('-quality', String(output.quality));
  }

  args.push('-define', `webp:thread-level=${getThreads(output) > 1 ? 1 : 0}`);
  args.push('-define', `webp:method=${output.effort}`);
  args.push(...getMetadataArgs('imagemagick', modify.misc.keep_metadata, false));
  args.push(...splitCustomArgs(app.enable_custom_args, app.im_args));

  return {
    id: `enc-${item.absPath}`,
    inputPath: item.absPath,
    outputPath,
    command: toolchain.imagemagickPath,
    args: [...args, inputPath, outputPath],
    stepType: 'encode',
  };
}

function buildPNGTask({
  inputPath,
  inputExt,
  outputPath,
  output,
  modify,
}: EncodeTaskContext): ExecutionTask {
  const decoderKind = getDecoderKind(inputExt || '');
  const args: string[] = [];

  if (decoderKind === 'avifdec') {
    args.push('-j', String(getThreads(output)));
  } else if (decoderKind === 'djxl') {
    args.push('--num_threads', String(getThreads(output)));
  } else {
    args.push(...(getDownscaleArgs(modify) || []));
  }

  return {
    id: `enc-${inputPath}`,
    inputPath,
    outputPath,
    command: decoderKind === 'avifdec' ? 'avifdec' : decoderKind === 'djxl' ? 'djxl' : 'magick',
    args: [...args, inputPath, outputPath],
    stepType: 'encode',
  };
}

function buildLosslessJXLTask({
  item,
  inputPath,
  outputPath,
  output,
  toolchain,
}: EncodeTaskContext): ExecutionTask {
  return {
    id: `enc-${item.absPath}`,
    inputPath: item.absPath,
    outputPath,
    command: toolchain.cjxlPath,
    args: [
      '-e', String(output.effort),
      '--num_threads', String(getThreads(output)),
      inputPath,
      outputPath,
    ],
    stepType: 'encode',
  };
}

function buildJPEGReconstructionTask({
  item,
  inputPath,
  outputPath,
  output,
  toolchain,
}: EncodeTaskContext): ExecutionTask {
  return {
    id: `enc-${item.absPath}`,
    inputPath: item.absPath,
    outputPath,
    command: toolchain.djxlPath,
    args: [
      '--num_threads', String(getThreads(output)),
      '--jpeg_reconstruction',
      inputPath,
      outputPath,
    ],
    stepType: 'encode',
  };
}

export function buildEncodeTask(context: EncodeTaskContext): ExecutionTask {
  switch (context.output.format) {
    case 'JPEG XL':
      return buildJXLTask(context);
    case 'AVIF':
      return buildAVIFTask(context);
    case 'JPEG':
      return buildJPEGTask(context);
    case 'WebP':
      return buildWebPTask(context);
    case 'PNG':
      return buildPNGTask(context);
    case 'Lossless JPEG Transcoding':
      return buildLosslessJXLTask(context);
    case 'JPEG Reconstruction':
      return buildJPEGReconstructionTask(context);
    default:
      throw new Error(`Unknown format: ${context.output.format}`);
  }
}
