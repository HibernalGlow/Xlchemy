import type { FileItem } from '$lib/domain';
import { normalizeFileItem } from '$lib/domain';

export function sortItems(
  items: FileItem[],
  order: string,
  sortingDisabled: boolean
): FileItem[] {
  if (sortingDisabled) return [...items];

  const result = [...items];
  const compareText = (a: string, b: string) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' });

  switch (order) {
    case 'Path Ascending':
      result.sort((a, b) => compareText(a.absPath, b.absPath));
      break;
    case 'Path Descending':
      result.sort((a, b) => compareText(b.absPath, a.absPath));
      break;
    case 'Size Ascending':
      result.sort((a, b) => a.size - b.size);
      break;
    case 'Size Descending':
      result.sort((a, b) => b.size - a.size);
      break;
    case 'Sequential':
      result.sort((a, b) => {
        const dirCmp = compareText(a.dir, b.dir);
        if (dirCmp !== 0) return dirCmp;
        return compareText(a.name, b.name);
      });
      break;
    case 'Random':
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      break;
    default:
      break;
  }

  return result;
}

export function filterItems(
  items: FileItem[],
  excludedFormats: Set<string>
): FileItem[] {
  return items.filter((item) => !excludedFormats.has(item.ext.toLowerCase()));
}

export function dedupeItems(items: FileItem[]): FileItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.absPath)) return false;
    seen.add(item.absPath);
    return true;
  });
}

export function mergeFileItems(
  existing: FileItem[],
  incoming: any[],
  excludedFormats: Set<string>
): FileItem[] {
  const seen = new Set(existing.map((i) => i.absPath));
  const next = [...existing];

  for (const raw of incoming) {
    const item = normalizeFileItem(raw);
    if (!item.absPath) continue;
    if (excludedFormats.has(item.ext)) continue;
    if (seen.has(item.absPath)) continue;
    seen.add(item.absPath);
    next.push(item);
  }

  return next;
}
