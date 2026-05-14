import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useState } from 'react';
import { filesAtom, progressAtom } from '~/atom/primitive';
import { Button } from '~/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/shadcn/card';
import { ScrollArea } from '~/components/shadcn/scroll-area';
import { getAPI, isPyWebView } from '~/utils/api';
import { Plus, Trash2, FolderOpen, Play, X } from 'lucide-react';

export function InputTab() {
  const files = useAtomValue(filesAtom);
  const setFiles = useSetAtom(filesAtom);
  const progress = useAtomValue(progressAtom);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isDragOver, setIsDragOver] = useState(false);

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
      await api.addFiles(paths);
      await refreshFiles();
    }
  }, [refreshFiles]);

  const handleAddFolder = useCallback(async () => {
    const api = getAPI();
    if (!api) return;
    const dir = await api.openFolderDialog();
    if (dir) {
      await api.addFiles([dir]);
      await refreshFiles();
    }
  }, [refreshFiles]);

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

    // Try to get real file paths from pywebview
    let paths: string[] = [];
    
    if (isPyWebView() && e.dataTransfer.items) {
      // Use webview API to get dropped file paths
      const items = Array.from(e.dataTransfer.items);
      for (const item of items) {
        const entry = item.webkitGetAsEntry?.() || (item as any).getAsEntry?.();
        if (entry) {
          // For pywebview, we can try to get path from the file object
          const file = item.getAsFile();
          if (file && (file as any).path) {
            paths.push((file as any).path);
          }
        }
      }
    }
    
    // Fallback: use file names (won't work for actual conversion but shows UI feedback)
    if (paths.length === 0) {
      paths = Array.from(e.dataTransfer.files).map((f) => (f as File & { path?: string }).path || f.name);
    }
    
    if (paths.length > 0) {
      await api.addFiles(paths);
    }
  }, []);

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

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Input Files ({files.length})
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
      </CardHeader>
      <CardContent
        className={`flex-1 min-h-0 transition-colors ${isDragOver ? 'bg-accent/50 border-2 border-dashed border-primary' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <ScrollArea className="h-[280px]">
          {files.length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm border border-dashed rounded-md">
              Drag & drop images here, or click Add
            </div>
          ) : (
            <div className="space-y-1">
              {files.map((file, i) => (
                <div
                  key={`${file.path}-${i}`}
                  className={`flex items-center gap-2 px-2 py-1 rounded text-sm cursor-pointer hover:bg-accent ${
                    selectedIndices.has(i) ? 'bg-accent' : ''
                  }`}
                  onClick={() => {
                    setSelectedIndices((prev) => {
                      const next = new Set(prev);
                      if (next.has(i)) next.delete(i);
                      else next.add(i);
                      return next;
                    });
                  }}
                >
                  <span className="text-muted-foreground text-xs w-6">{i + 1}.</span>
                  <span className="truncate flex-1">{file.name}</span>
                  <span className="text-muted-foreground text-xs">{file.format.toUpperCase()}</span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
