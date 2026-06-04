import type { FileItem, OutputSettings } from '$lib/domain';

function pathSeparator(path: string): '/' | '\\' {
  return path.includes('\\') ? '\\' : '/';
}

function trimTrailingSeparators(path: string): string {
  return path.replace(/[\\/]+$/, '');
}

export function joinFsPath(base: string, leaf: string): string {
  if (!base) return leaf;
  const separator = pathSeparator(base);
  return `${trimTrailingSeparators(base)}${separator}${leaf}`;
}

export function buildOutputDir(item: FileItem, output: OutputSettings): string {
  if (!output.custom_output_dir) return item.dir;
  return output.custom_output_dir_path;
}

export function buildFinalOutputPath(item: FileItem, outputDir: string, outputExt: string): string {
  return joinFsPath(outputDir, `${item.name}.${outputExt}`);
}

export function buildProxyOutputPath(item: FileItem, runId: string): string {
  return `${item.absPath}.proxy_${runId}.png`;
}

export function buildDownscaleOutputPath(item: FileItem, runId: string): string {
  return `${item.absPath}.downscaled_${runId}.png`;
}

export function getPathExtension(path: string): string {
  const filename = path.split(/[\\/]/).pop() || path;
  const lastDot = filename.lastIndexOf('.');
  if (lastDot < 0) return '';
  return filename.slice(lastDot + 1).toLowerCase();
}
