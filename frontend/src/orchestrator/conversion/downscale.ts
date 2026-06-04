import type {
  ExecutionTask,
  FileItem,
  ModifySettings,
  ToolchainSelection,
} from '$lib/domain';

export function getDownscaleArgs(modify: ModifySettings): string[] | null {
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
      const megapixels = Math.round(ds.megapixels * 1_000_000);
      if (megapixels > 0) {
        args.push('-resize', `${megapixels}@>`);
      }
      break;
    }
    case 'File Size':
      if (ds.file_size > 0) {
        args.push('-resize', '50%');
      }
      break;
    default:
      return null;
  }

  return args.length > 0 ? args : null;
}

export function buildDownscaleTask(
  item: FileItem,
  inputPath: string,
  outputPath: string,
  modify: ModifySettings,
  toolchain: ToolchainSelection
): ExecutionTask | null {
  const resizeArgs = getDownscaleArgs(modify);
  if (!resizeArgs) return null;

  return {
    id: `ds-${item.absPath}-${outputPath}`,
    inputPath: item.absPath,
    outputPath,
    command: toolchain.imagemagickPath,
    args: [...resizeArgs, inputPath, outputPath],
    stepType: 'downscale',
  };
}
