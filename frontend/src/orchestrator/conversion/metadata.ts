import type {
  AppSettings,
  ExecutionTask,
  FileItem,
  ModifySettings,
  ToolchainSelection,
} from '$lib/domain';

export function buildMetadataTask(
  item: FileItem,
  outputPath: string,
  modify: ModifySettings,
  app: AppSettings,
  toolchain: ToolchainSelection
): ExecutionTask | null {
  const mode = modify.misc.keep_metadata;
  if (!mode.startsWith('ExifTool')) return null;

  const argsStr = app.exiftool_args[mode];
  if (!argsStr) return null;

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

export function getMetadataArgs(
  encoder: string,
  mode: string,
  losslessJPEG: boolean
): string[] {
  if (mode === 'Encoder - Wipe') {
    if (encoder === 'jxl') {
      return losslessJPEG ? [] : ['-x', 'strip=exif', '-x', 'strip=xmp', '-x', 'strip=jumbf'];
    }
    if (encoder === 'imagemagick') {
      return ['-strip'];
    }
    if (encoder === 'avifenc') {
      return ['--ignore-exif', '--ignore-xmp'];
    }
    if (encoder === 'oxipng') {
      return ['--strip', 'safe'];
    }
    return [];
  }

  if (mode === 'Encoder - Preserve') {
    return [];
  }

  return [];
}
