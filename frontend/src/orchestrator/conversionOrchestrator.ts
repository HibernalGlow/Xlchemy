import type {
  AppSettings,
  ExecutionPlan,
  ExecutionSpec,
  ExecutionTask,
  FileItem,
  ModifySettings,
  OutputSettings,
  ResultPolicy,
  ToolchainSelection,
} from '$lib/domain';
import {
  getOutputExtension,
  needsDecodeProxy,
  supportsImageMagickInput,
  validateConversionReady,
  validateItemCompatibility,
} from '$lib/domain';
import { buildMetadataTask } from './conversion/metadata';
import {
  buildDownscaleOutputPath,
  buildFinalOutputPath,
  buildOutputDir,
  buildProxyOutputPath,
} from './conversion/pathing';
import { buildDecodeTask } from './conversion/decode';
import { buildDownscaleTask } from './conversion/downscale';
import { buildEncodeTask } from './conversion/encode';

export interface ConversionOrchestratorResult {
  plan: ExecutionPlan;
  validation: { valid: boolean; errorTitle?: string; errorDescription?: string };
}

function requiresIntermediateDownscale(
  output: OutputSettings,
  app: AppSettings
): boolean {
  if (output.format === 'JPEG XL' || output.format === 'AVIF') return true;
  if (output.format === 'JPEG') return app.jpg_encoder === 'JPEGLI';
  if (output.format === 'Lossless JPEG Transcoding') return true;
  if (output.format === 'JPEG Reconstruction') return true;
  return false;
}

function buildCleanupTask(item: FileItem, tempPath: string): ExecutionTask {
  return {
    id: `cleanup-${item.absPath}-${tempPath}`,
    inputPath: item.absPath,
    outputPath: tempPath,
    command: '',
    args: [],
    stepType: 'cleanup',
  };
}

function getThreadCount(output: OutputSettings): number {
  return output.threads || 4;
}

interface ItemPlanResult {
  tasks: ExecutionTask[];
}

function buildItemPlan(
  item: FileItem,
  output: OutputSettings,
  modify: ModifySettings,
  app: AppSettings,
  toolchain: ToolchainSelection,
  runId: string
): ItemPlanResult {
  const outputDir = buildOutputDir(item, output);
  const outputExt = getOutputExtension(output.format);
  const finalOutput = buildFinalOutputPath(item, outputDir, outputExt);
  const threads = getThreadCount(output);
  const tasks: ExecutionTask[] = [];
  const cleanupPaths: string[] = [];

  let currentInput = item.absPath;
  let currentInputExt = item.ext;

  const shouldDecodeForProxy = needsDecodeProxy(
    output.format,
    item.ext,
    app,
    modify.downscaling.enabled
  );

  const shouldDecodeForPngDownscale =
    output.format === 'PNG' &&
    modify.downscaling.enabled &&
    !supportsImageMagickInput(item.ext);

  const shouldUseIntermediateDownscale =
    modify.downscaling.enabled &&
    requiresIntermediateDownscale(output, app);

  if (shouldDecodeForProxy || shouldDecodeForPngDownscale) {
    const proxyPath = buildProxyOutputPath(item, runId);
    const decodeTask = buildDecodeTask(item, item.absPath, proxyPath, toolchain, threads);
    tasks.push(decodeTask.task);
    cleanupPaths.push(proxyPath);
    currentInput = decodeTask.outputPath;
    currentInputExt = 'png';
  }

  if (shouldUseIntermediateDownscale) {
    const downscaleOutput = buildDownscaleOutputPath(item, runId);
    const downscaleTask = buildDownscaleTask(
      item,
      currentInput,
      downscaleOutput,
      modify,
      toolchain
    );

    if (downscaleTask) {
      tasks.push(downscaleTask);
      cleanupPaths.push(downscaleOutput);
      currentInput = downscaleTask.outputPath;
      currentInputExt = 'png';
    }
  }

  const encodeTask = buildEncodeTask({
    item,
    inputPath: currentInput,
    inputExt: currentInputExt,
    outputPath: finalOutput,
    output,
    modify,
    app,
    toolchain,
  });
  tasks.push(encodeTask);

  const metadataTask = buildMetadataTask(item, finalOutput, modify, app, toolchain);
  if (metadataTask) {
    tasks.push(metadataTask);
  }

  for (const tempPath of cleanupPaths.reverse()) {
    tasks.push(buildCleanupTask(item, tempPath));
  }

  return { tasks };
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

  for (const item of items) {
    const issue = validateItemCompatibility(item, output, modify, app);
    if (issue) {
      return {
        plan: null as any,
        validation: {
          valid: false,
          errorTitle: issue.title,
          errorDescription: issue.description,
        },
      };
    }
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

  const spec: ExecutionSpec = {
    output: { ...output },
    modify: {
      downscaling: { ...modify.downscaling },
      misc: { ...modify.misc },
    },
    app: {
      ...app,
      excluded_formats: Array.isArray(app.excluded_formats)
        ? [...app.excluded_formats]
        : [],
      exiftool_args: { ...app.exiftool_args },
    },
  };

  for (const item of items) {
    tasks.push(...buildItemPlan(item, output, modify, app, toolchain, runId).tasks);
  }

  return {
    plan: {
      runId,
      items,
      tasks,
      policies,
      toolchain,
      spec,
    },
    validation: { valid: true },
  };
}
