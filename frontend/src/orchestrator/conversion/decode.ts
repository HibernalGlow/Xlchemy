import type {
  ExecutionTask,
  FileItem,
  ToolchainSelection,
} from '$lib/domain';
import { getDecoderKind } from '$lib/domain';

export interface DecodePlanResult {
  task: ExecutionTask;
  outputPath: string;
}

function getDecoderCommand(
  decoderKind: ReturnType<typeof getDecoderKind>,
  toolchain: ToolchainSelection
): string {
  switch (decoderKind) {
    case 'djxl':
      return toolchain.djxlPath;
    case 'avifdec':
      return toolchain.avifdecPath;
    case 'imagemagick':
      return toolchain.imagemagickPath;
    default:
      throw new Error('Decoder command requested without a supported decoder.');
  }
}

function getDecoderArgs(
  decoderKind: ReturnType<typeof getDecoderKind>,
  threads: number
): string[] {
  switch (decoderKind) {
    case 'djxl':
      return ['--num_threads', String(threads)];
    case 'avifdec':
      return ['-j', String(threads)];
    default:
      return [];
  }
}

export function buildDecodeTask(
  item: FileItem,
  inputPath: string,
  outputPath: string,
  toolchain: ToolchainSelection,
  threads: number
): DecodePlanResult {
  const decoderKind = getDecoderKind(item.ext);
  if (!decoderKind) {
    throw new Error(`No decoder available for ${item.ext}.`);
  }

  const command = getDecoderCommand(decoderKind, toolchain);
  const args = [...getDecoderArgs(decoderKind, threads), inputPath, outputPath];

  return {
    outputPath,
    task: {
      id: `dec-${item.absPath}-${outputPath}`,
      inputPath: item.absPath,
      outputPath,
      command,
      args,
      stepType: 'decode',
    },
  };
}
