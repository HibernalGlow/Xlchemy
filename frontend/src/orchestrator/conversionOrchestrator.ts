import type {
  FileItem,
  OutputSettings,
  ModifySettings,
  AppSettings,
  ExecutionPlan,
  ExecutionTask,
  ResultPolicy,
  ToolchainSelection,
} from '$lib/domain';
import {
  getOutputExtension,
  isJPEGAlias,
  validateConversionReady,
} from '$lib/domain';

export interface ConversionOrchestratorResult {
  plan: ExecutionPlan;
  validation: { valid: boolean; errorTitle?: string; errorDescription?: string };
}

export function buildExecutionPlan(
  items: FileItem[],
  output: OutputSettings,
  modify: ModifySettings,
  app: AppSettings,
  toolchain: ToolchainSelection
): ConversionOrchestratorResult {
  const validation = validateConversionReady(items, output, modify, app);
  if (!validation.valid) {
    return { plan: null as any, validation };
  }

  const runId = crypto.randomUUID();
  const tasks: ExecutionTask[] = [];

  const policies: ResultPolicy = {
    keepIfLarger: app.keep_if_larger,
    copyIfLarger: app.copy_if_larger,
    deleteOriginal: output.delete_original,
    deleteOriginalMode: output.delete_original_mode,
    keepTimestamps: modify.misc.keep_timestamps,
    ifFileExists: output.if_file_exists,
  };

  for (const item of items) {
    const outputDir = buildOutputDir(item, output);
    const outputExt = getOutputExtension(output.format);
    const baseName = item.name;
    const finalOutput = `${outputDir}/${baseName}.${outputExt}`;

    // Skip if exists policy
    if (output.if_file_exists === 'Skip') {
      // Backend will check; frontend just passes the policy
    }

    // Step 1: Downscale if enabled
    let currentInput = item.absPath;
    if (modify.downscaling.enabled) {
      const downscaleTask = buildDownscaleTask(item, modify, toolchain, runId);
      if (downscaleTask) {
        tasks.push(downscaleTask);
        currentInput = downscaleTask.outputPath;
      }
    }

    // Step 2: Encode
    const encodeTask = buildEncodeTask(
      item,
      currentInput,
      finalOutput,
      output,
      modify,
      app,
      toolchain,
      runId
    );
    tasks.push(encodeTask);

    // Step 3: Metadata (ExifTool) if needed
    if (modify.misc.keep_metadata.startsWith('ExifTool')) {
      const metaTask = buildMetadataTask(item, finalOutput, modify, app, toolchain, runId);
      if (metaTask) tasks.push(metaTask);
    }
  }

  const plan: ExecutionPlan = {
    runId,
    items,
    tasks,
    policies,
    toolchain,
  };

  return { plan, validation: { valid: true } };
}

function buildOutputDir(item: FileItem, output: OutputSettings): string {
  if (!output.custom_output_dir) return item.dir;
  if (output.keep_dir_struct) {
    // Preserve relative structure
    return output.custom_output_dir_path;
  }
  return output.custom_output_dir_path;
}

function buildDownscaleTask(
  item: FileItem,
  modify: ModifySettings,
  toolchain: ToolchainSelection,
  runId: string
): ExecutionTask | null {
  const ds = modify.downscaling;
  if (!ds.enabled) return null;

  const args: string[] = [];

  if (ds.resample !== 'Default') {
    args.push('-filter', ds.resample);
  }

  switch (ds.mode) {
    case 'Resolution':
      if (ds.width > 0 && ds.height > 0) {
        args.push('-resize', `${ds.width}x${ds.height}>`);
      } else if (ds.width > 0) {
        args.push('-resize', `${ds.width}x>`);
      } else if (ds.height > 0) {
        args.push('-resize', `x${ds.height}>`);
      }
      break;
    case 'Percent':
      args.push('-resize', `${ds.percent}%`);
      break;
    case 'Shortest Side':
      if (ds.shortest_side > 0) {
        args.push('-resize', `${ds.shortest_side}x${ds.shortest_side}^>`);
      }
      break;
    case 'Longest Side':
      if (ds.longest_side > 0) {
        args.push('-resize', `${ds.longest_side}x${ds.longest_side}>`);
      }
      break;
    case 'Megapixels': {
      const mpx = Math.round(ds.megapixels * 1000000);
      if (mpx > 0) args.push('-resize', `${mpx}@>`);
      break;
    }
    case 'File Size':
      if (ds.file_size > 0) args.push('-resize', '50%');
      break;
    default:
      return null;
  }

  const outputPath = `${item.absPath}.downscaled_${runId}`;

  return {
    id: `ds-${item.absPath}`,
    inputPath: item.absPath,
    outputPath,
    command: toolchain.imagemagickPath,
    args: [...args, item.absPath, outputPath],
    stepType: 'downscale',
  };
}

function buildEncodeTask(
  item: FileItem,
  inputPath: string,
  outputPath: string,
  output: OutputSettings,
  modify: ModifySettings,
  app: AppSettings,
  toolchain: ToolchainSelection,
  _runId: string
): ExecutionTask {
  switch (output.format) {
    case 'JPEG XL':
      return buildJXLTask(item, inputPath, outputPath, output, modify, app, toolchain);
    case 'AVIF':
      return buildAVIFTask(item, inputPath, outputPath, output, modify, app, toolchain);
    case 'JPEG':
      return buildJPEGTask(item, inputPath, outputPath, output, modify, app, toolchain);
    case 'WebP':
      return buildWebPTask(item, inputPath, outputPath, output, modify, app, toolchain);
    case 'PNG':
      return buildPNGTask(item, inputPath, outputPath, output, modify, app, toolchain);
    case 'Lossless JPEG Transcoding':
      return buildLosslessJXLTask(item, inputPath, outputPath, output, app, toolchain);
    case 'JPEG Reconstruction':
      return buildJPEGReconstructionTask(item, inputPath, outputPath, app, toolchain);
    default:
      throw new Error(`Unknown format: ${output.format}`);
  }
}

function buildJXLTask(
  item: FileItem,
  inputPath: string,
  outputPath: string,
  output: OutputSettings,
  modify: ModifySettings,
  app: AppSettings,
  toolchain: ToolchainSelection
): ExecutionTask {
  const args: string[] = [];

  if (output.lossless) {
    args.push('-q', '100');
    if (app.jxl_auto_lossless_jpeg && isJPEGAlias(item.ext)) {
      args.push('--lossless_jpeg=1');
    } else {
      args.push('--lossless_jpeg=0');
    }
  } else {
    args.push('-q', String(output.quality));
    args.push('--lossless_jpeg=0');
  }

  args.push('-e', String(output.effort));
  args.push('--num_threads', String(output.threads || 4));

  if (!output.lossless && app.jxl_lossy_modular) {
    args.push('--modular=1');
  }

  // Metadata
  args.push(...getMetadataArgs('jxl', modify.misc.keep_metadata, output.lossless && isJPEGAlias(item.ext)));

  // Custom args
  if (app.enable_custom_args && app.cjxl_args) {
    args.push(...app.cjxl_args.split(/\s+/).filter(Boolean));
  }

  return {
    id: `enc-${item.absPath}`,
    inputPath,
    outputPath,
    command: toolchain.cjxlPath,
    args: [...args, inputPath, outputPath],
    stepType: 'encode',
  };
}

function buildAVIFTask(
  item: FileItem,
  inputPath: string,
  outputPath: string,
  output: OutputSettings,
  modify: ModifySettings,
  app: AppSettings,
  toolchain: ToolchainSelection
): ExecutionTask {
  // slimg encoder path
  if (app.avif_encoder === 'slimg') {
    return {
      id: `enc-${item.absPath}`,
      inputPath,
      outputPath,
      command: 'slimg', // placeholder
      args: [inputPath, outputPath, '-q', String(output.quality)],
      stepType: 'encode',
    };
  }

  const args: string[] = [
    '-q', String(output.quality),
    '-s', String(output.effort),
    '-j', String(output.threads || 4),
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

  args.push(...getMetadataArgs('avif', modify.misc.keep_metadata, false));

  if (app.enable_custom_args && app.avifenc_args) {
    args.push(...app.avifenc_args.split(/\s+/).filter(Boolean));
  }

  return {
    id: `enc-${item.absPath}`,
    inputPath,
    outputPath,
    command: toolchain.avifencPath,
    args: [...args, inputPath, outputPath],
    stepType: 'encode',
  };
}

function buildJPEGTask(
  item: FileItem,
  inputPath: string,
  outputPath: string,
  output: OutputSettings,
  modify: ModifySettings,
  app: AppSettings,
  toolchain: ToolchainSelection
): ExecutionTask {
  const isJPEGLI = app.jpg_encoder === 'JPEGLI';
  const args: string[] = [];

  if (isJPEGLI) {
    args.push('-q', String(output.quality));
    if (app.disable_progressive_jpegli) args.push('-p', '0');
    if (output.jpegli_chroma_subsampling !== 'Default') {
      args.push('--chroma_subsampling', output.jpegli_chroma_subsampling.replace(':', ''));
    }
  } else {
    args.push('-quality', String(output.quality));
    if (output.jpg_chroma_subsampling !== 'Default') {
      args.push('-sampling-factor', output.jpg_chroma_subsampling);
    }
  }

  args.push(...getMetadataArgs(isJPEGLI ? 'cjpegli' : 'im', modify.misc.keep_metadata, false));

  if (app.enable_custom_args) {
    const custom = isJPEGLI ? app.cjpegli_args : app.im_args;
    if (custom) args.push(...custom.split(/\s+/).filter(Boolean));
  }

  return {
    id: `enc-${item.absPath}`,
    inputPath,
    outputPath,
    command: isJPEGLI ? toolchain.cjpegliPath : toolchain.imagemagickPath,
    args: isJPEGLI
      ? [...args, inputPath, outputPath]
      : [...args, inputPath, outputPath],
    stepType: 'encode',
  };
}

function buildWebPTask(
  item: FileItem,
  inputPath: string,
  outputPath: string,
  output: OutputSettings,
  modify: ModifySettings,
  app: AppSettings,
  toolchain: ToolchainSelection
): ExecutionTask {
  const args: string[] = [];

  if (output.lossless) {
    args.push('-define', 'webp:lossless=true');
  } else {
    args.push('-quality', String(output.quality));
  }

  const threadLevel = (output.threads || 4) > 1 ? 1 : 0;
  args.push('-define', `webp:thread-level=${threadLevel}`);
  args.push('-define', `webp:method=${output.effort}`);

  args.push(...getMetadataArgs('im', modify.misc.keep_metadata, false));

  if (app.enable_custom_args && app.im_args) {
    args.push(...app.im_args.split(/\s+/).filter(Boolean));
  }

  return {
    id: `enc-${item.absPath}`,
    inputPath,
    outputPath,
    command: toolchain.imagemagickPath,
    args: [...args, inputPath, outputPath],
    stepType: 'encode',
  };
}

function buildPNGTask(
  item: FileItem,
  inputPath: string,
  outputPath: string,
  output: OutputSettings,
  modify: ModifySettings,
  app: AppSettings,
  toolchain: ToolchainSelection
): ExecutionTask {
  // PNG uses decoder then oxipng
  const decoder = getDecoder(item.ext, toolchain);
  const args: string[] = [];

  if (decoder === toolchain.avifdecPath) {
    args.push('-j', String(output.threads || 4));
  } else if (decoder === toolchain.djxlPath) {
    args.push('--num_threads', String(output.threads || 4));
  }

  args.push(...getMetadataArgs('im', modify.misc.keep_metadata, false));

  return {
    id: `enc-${item.absPath}`,
    inputPath,
    outputPath,
    command: decoder || toolchain.imagemagickPath,
    args: [...args, inputPath, outputPath],
    stepType: 'encode',
  };
}

function buildLosslessJXLTask(
  item: FileItem,
  inputPath: string,
  outputPath: string,
  output: OutputSettings,
  app: AppSettings,
  toolchain: ToolchainSelection
): ExecutionTask {
  return {
    id: `enc-${item.absPath}`,
    inputPath,
    outputPath,
    command: toolchain.cjxlPath,
    args: [
      '-e', String(output.effort),
      '--num_threads', String(output.threads || 4),
      inputPath,
      outputPath,
    ],
    stepType: 'encode',
  };
}

function buildJPEGReconstructionTask(
  item: FileItem,
  inputPath: string,
  outputPath: string,
  app: AppSettings,
  toolchain: ToolchainSelection
): ExecutionTask {
  return {
    id: `enc-${item.absPath}`,
    inputPath,
    outputPath,
    command: toolchain.djxlPath,
    args: [
      '--num_threads', String(app.processing_order ? 4 : 4),
      '--jpeg_reconstruction',
      inputPath,
      outputPath,
    ],
    stepType: 'encode',
  };
}

function buildMetadataTask(
  item: FileItem,
  outputPath: string,
  modify: ModifySettings,
  app: AppSettings,
  toolchain: ToolchainSelection,
  _runId: string
): ExecutionTask | null {
  const mode = modify.misc.keep_metadata;
  if (!mode.startsWith('ExifTool')) return null;

  const argsStr = app.exiftool_args[mode];
  if (!argsStr) return null;

  // Simple arg parsing with $src/$dst replacement
  const args = argsStr
    .split(/\s+/)
    .filter(Boolean)
    .map((arg) => {
      if (arg === '"$src"' || arg === '$src') return item.absPath;
      if (arg === '"$dst"' || arg === '$dst') return outputPath;
      return arg;
    });

  return {
    id: `meta-${item.absPath}`,
    inputPath: item.absPath,
    outputPath,
    command: toolchain.exiftoolPath,
    args,
    stepType: 'metadata',
  };
}

function getMetadataArgs(encoder: string, mode: string, losslessJPEG: boolean): string[] {
  if (mode === 'Encoder - Wipe') {
    if (encoder === 'jxl' && !losslessJPEG) {
      return ['-x', 'strip=exif', '-x', 'strip=xmp', '-x', 'strip=jumbf'];
    }
    return [];
  }
  if (mode === 'Encoder - Preserve') {
    return [];
  }
  return [];
}

function getDecoder(ext: string, toolchain: ToolchainSelection): string {
  switch (ext.toLowerCase()) {
    case 'png':
      return toolchain.imagemagickPath;
    case 'jxl':
      return toolchain.djxlPath;
    case 'avif':
      return toolchain.avifdecPath;
    default:
      return toolchain.imagemagickPath;
  }
}
