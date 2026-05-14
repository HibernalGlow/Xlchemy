import { useAtomValue, useSetAtom } from 'jotai';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { filesAtom, progressAtom } from '~/atom/primitive';
import { Button } from '~/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/shadcn/card';
import { ScrollArea } from '~/components/shadcn/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '~/components/shadcn/dialog';
import { Checkbox } from '~/components/shadcn/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/shadcn/select';
import { getAPI, isPyWebView } from '~/utils/api';
import { PROCESSING_ORDERS, DEFAULT_EXCLUDED_FORMATS } from '~/consts';
import type { InputSettings } from '~/types';
import { Filter, Plus, Trash2, FolderOpen, X } from 'lucide-react';

interface InputTabProps {
  allowedFormats: string[];
  excludedFormats: string[];
  processingOrder: string;
  sortingDisabled: boolean;
  onExcludedFormatsChange?: (excluded: string[]) => void;
  onProcessingOrderChange?: (order: string) => void;
}

export const InputTab = forwardRef<{ getState: () => InputSettings }, InputTabProps>(function InputTab({
  allowedFormats,
  excludedFormats,
  processingOrder,
  sortingDisabled,
  onExcludedFormatsChange,
  onProcessingOrderChange,
}, ref) {
  const files = useAtomValue(filesAtom);
  const setFiles = useSetAtom(filesAtom);
  const progress = useAtomValue(progressAtom);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isDragOver, setIsDragOver] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [excluded, setExcluded] = useState<Set<string>>(new Set(excludedFormats.length ? excludedFormats : DEFAULT_EXCLUDED_FORMATS));

  useImperativeHandle(ref, () => ({
    getState: () => ({
      excluded_formats: Array.from(excluded),
      sort_order: processingOrder,
    }),
  }));

  useEffect(() => {
    setExcluded(new Set(excludedFormats.length ? excludedFormats : DEFAULT_EXCLUDED_FORMATS));
  }, [excludedFormats]);

  useEffect(() => {
    if (onExcludedFormatsChange) {
      onExcludedFormatsChange(Array.from(excluded));
    }
  }, [excluded, onExcludedFormatsChange]);

  const refreshFiles = useCallback(async () => {
    const api = getAPI();
    if (!api) return;
    const fileList = await api.getFiles();
    setFiles(fileList);
  }, [setFiles]);

  const handleAddFiles = useCallback(async () => {
    const api = getAPI();
    if (!api) return;
    const paths = await api.openFileDialog();
    if (paths && paths.length > 0) {
      await api.addFiles(paths, Array.from(excluded));
      await refreshFiles();
    }
  }, [refreshFiles, excluded]);

  const handleAddFolder = useCallback(async () => {
    const api = getAPI();
    if (!api) return;
    const dir = await api.openFolderDialog();
    if (dir) {
      await api.addFiles([dir], Array.from(excluded));
      await refreshFiles();
    }
  }, [refreshFiles, excluded]);

  const handleRemoveFiles = useCallback(async () => {
    const api = getAPI();
    if (!api) return;
    await api.removeFiles(Array.from(selectedIndices));
    setSelectedIndices(new Set());
    await refreshFiles();
  }, [selectedIndices, refreshFiles]);

  const handleClearFiles = useCallback(async () => {
    const api = getAPI();
    if (!api) return;
    await api.clearFiles();
    setSelectedIndices(new Set());
    await refreshFiles();
  }, [refreshFiles]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const api = getAPI();
    if (!api) return;

    let paths: string[] = [];

    if (isPyWebView() && e.dataTransfer.items) {
      const items = Array.from(e.dataTransfer.items);
      for (const item of items) {
        const entry = item.webkitGetAsEntry?.() || (item as any).getAsEntry?.();
        if (entry) {
          const file = item.getAsFile();
          if (file && (file as any).path) {
            paths.push((file as any).path);
          }
        }
      }
    }

    if (paths.length === 0) {
      paths = Array.from(e.dataTransfer.files).map((f) => (f as File & { path?: string }).path || f.name);
    }

    if (paths.length > 0) {
      await api.addFiles(paths, Array.from(excluded));
      await refreshFiles();
    }
  }, [excluded, refreshFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const isProcessing = progress.isProcessing;

  const displayFiles = useMemo(() => {
    const fileItems = files.map((file, index) => ({ ...file, index }));
    const filtered = fileItems.filter((file) => !excluded.has(file.format.toLowerCase()));

    const getParentPath = (path: string) => {
      const slashIdx = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
      return slashIdx >= 0 ? path.slice(0, slashIdx) : '';
    };

    const sortOrder = processingOrder || 'Original';
    const sorted = [...filtered];
    switch (sortOrder) {
      case 'Random':
        for (let i = sorted.length - 1; i > 0; i -= 1) {
          const j = Math.floor(Math.random() * (i + 1));
          [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
        }
        break;
      case 'Sequential':
        sorted.sort((a, b) => {
          const parentA = getParentPath(a.path).toLowerCase();
          const parentB = getParentPath(b.path).toLowerCase();
          if (parentA !== parentB) return parentA.localeCompare(parentB);
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });
        break;
      case 'Path Ascending':
        sorted.sort((a, b) => a.path.toLowerCase().localeCompare(b.path.toLowerCase()));
        break;
      case 'Path Descending':
        sorted.sort((a, b) => b.path.toLowerCase().localeCompare(a.path.toLowerCase()));
        break;
      case 'Size Ascending':
        sorted.sort((a, b) => a.size - b.size);
        break;
      case 'Size Descending':
        sorted.sort((a, b) => b.size - a.size);
        break;
      case 'Original':
      default:
        break;
    }

    return sorted;
  }, [files, excluded, processingOrder]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Input Files ({displayFiles.length})
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={handleAddFiles} disabled={isProcessing}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
            <Button variant="outline" size="sm" onClick={handleAddFolder} disabled={isProcessing}>
              <FolderOpen className="h-3.5 w-3.5 mr-1" />
              Folder
            </Button>
            <Button variant="outline" size="sm" onClick={handleRemoveFiles} disabled={isProcessing || selectedIndices.size === 0}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Remove
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearFiles} disabled={isProcessing || files.length === 0}>
              <X className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Processing Order</span>
            <Select
              value={processingOrder}
              onValueChange={(value) => onProcessingOrderChange?.(value)}
              disabled={sortingDisabled}
            >
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROCESSING_ORDERS.map((order) => (
                  <SelectItem key={order} value={order}>
                    {order}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={() => setFilterOpen(true)}>
            <Filter className="h-3.5 w-3.5 mr-1" />
            Filter Formats
          </Button>
        </div>
      </CardHeader>
      <CardContent
        className={`flex-1 min-h-0 transition-colors ${isDragOver ? 'bg-accent/50 border-2 border-dashed border-primary' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <ScrollArea className="h-[280px]">
          {displayFiles.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm border border-dashed rounded-md">
              Drag & drop images here, or click Add
            </div>
          ) : (
            <div className="space-y-1">
              {displayFiles.map((file) => (
                <div
                  key={`${file.path}-${file.index}`}
                  className={`flex items-center gap-2 px-2 py-1 rounded text-sm cursor-pointer hover:bg-accent ${
                    selectedIndices.has(file.index) ? 'bg-accent' : ''
                  }`}
                  onClick={() => {
                    setSelectedIndices((prev) => {
                      const next = new Set(prev);
                      if (next.has(file.index)) next.delete(file.index);
                      else next.add(file.index);
                      return next;
                    });
                  }}
                >
                  <span className="text-muted-foreground text-xs w-6">{file.index + 1}.</span>
                  <span className="truncate flex-1">{file.name}</span>
                  <span className="text-muted-foreground text-xs">{file.format.toUpperCase()}</span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Format Filter</DialogTitle>
            <DialogDescription>Unchecked formats will be excluded from input.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2">
            {allowedFormats.map((ext) => {
              const lower = ext.toLowerCase();
              const checked = !excluded.has(lower);
              return (
                <label key={lower} className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) => {
                      const next = new Set(excluded);
                      if (value) next.delete(lower);
                      else next.add(lower);
                      setExcluded(next);
                    }}
                  />
                  .{lower.toUpperCase()}
                </label>
              );
            })}
          </div>
          <DialogFooter className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setExcluded(new Set(DEFAULT_EXCLUDED_FORMATS))}
            >
              Reset Defaults
            </Button>
            <Button onClick={() => setFilterOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
});
