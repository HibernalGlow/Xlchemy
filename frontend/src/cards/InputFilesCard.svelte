<script lang="ts">
  import { ChevronRight, FileImage, Folder, FolderTree, Rows3 } from '@lucide/svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { i18n } from '$lib/i18n/t.svelte';
  import type { LaneId } from '$lib/cards/definitions';
  import type { FileItem } from '$lib/domain';

  interface Props { laneId: LaneId }

  type ViewMode = 'list' | 'tree';
  type FileTreeNode = {
    id: string;
    kind: 'folder' | 'file';
    name: string;
    path: string;
    size: number;
    fileCount: number;
    ext?: string;
    dir?: string;
    item?: FileItem;
    children: FileTreeNode[];
  };
  type VisibleTreeRow = {
    node: FileTreeNode;
    depth: number;
  };

  let { laneId }: Props = $props();
  const t = i18n.t;

  function loadViewMode(): ViewMode {
    try {
      const value = localStorage.getItem('xlchemy-input-files-view');
      return value === 'list' ? 'list' : 'tree';
    } catch {
      return 'tree';
    }
  }

  let viewMode = $state<ViewMode>(loadViewMode());
  let expandedFolders = $state<Record<string, boolean>>({});

  $effect(() => {
    try {
      localStorage.setItem('xlchemy-input-files-view', viewMode);
    } catch {}
  });

  function formatBytes(size: number): string {
    if (!Number.isFinite(size) || size <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
    const value = size / 1024 ** index;
    return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
  }

  function pathSegments(item: FileItem): string[] {
    const rawPath = item.absPath || `${item.dir}\\${item.name}`;
    return rawPath.split(/[\\/]+/).filter(Boolean);
  }

  function directorySegments(item: FileItem): string[] {
    const segments = pathSegments(item);
    return segments.slice(0, -1);
  }

  function commonPrefixLength(items: FileItem[]): number {
    if (items.length === 0) return 0;
    const allSegments = items.map(directorySegments);
    const first = allSegments[0] || [];
    let index = 0;

    while (index < first.length && allSegments.every((segments) => segments[index] === first[index])) {
      index += 1;
    }

    return index;
  }

  function buildTree(items: FileItem[]): { rootLabel: string; nodes: FileTreeNode[] } {
    const prefixLength = commonPrefixLength(items);
    const rootLabel = items.length > 1
      ? directorySegments(items[0]).slice(0, prefixLength).join('\\')
      : '';
    const roots = new Map<string, FileTreeNode>();

    for (const item of items) {
      const segments = pathSegments(item);
      const relativeFolders = segments.slice(prefixLength, -1);
      let currentChildren = roots;
      let currentPath = rootLabel;

      for (const folderName of relativeFolders) {
        currentPath = currentPath ? `${currentPath}\\${folderName}` : folderName;
        let folderNode = currentChildren.get(currentPath);
        if (!folderNode) {
          folderNode = {
            id: `folder:${currentPath}`,
            kind: 'folder',
            name: folderName,
            path: currentPath,
            size: 0,
            fileCount: 0,
            children: [],
          };
          currentChildren.set(currentPath, folderNode);
        }
        folderNode.size += item.size;
        folderNode.fileCount += 1;

        const nextChildren = new Map<string, FileTreeNode>();
        for (const child of folderNode.children) {
          nextChildren.set(child.path, child);
        }
        currentChildren = nextChildren;
        folderNode.children = Array.from(nextChildren.values());
      }

      const fileNode: FileTreeNode = {
        id: `file:${item.absPath}`,
        kind: 'file',
        name: item.name,
        path: item.absPath,
        size: item.size,
        fileCount: 1,
        ext: item.ext,
        dir: item.dir,
        item,
        children: [],
      };

      currentChildren.set(fileNode.path, fileNode);

      if (relativeFolders.length === 0) {
        roots.set(fileNode.path, fileNode);
      } else {
        let parentMap = roots;
        let parentPath = rootLabel;
        for (const folderName of relativeFolders.slice(0, -1)) {
          parentPath = parentPath ? `${parentPath}\\${folderName}` : folderName;
          const folderNode = parentMap.get(parentPath);
          if (!folderNode) break;
          const childMap = new Map<string, FileTreeNode>();
          for (const child of folderNode.children) childMap.set(child.path, child);
          parentMap = childMap;
        }
        const parentFolderPath = relativeFolders.reduce((acc, segment) => acc ? `${acc}\\${segment}` : segment, rootLabel);
        const parentKey = `folder:${parentFolderPath}`;
        const parentNode = findFolderNode(Array.from(roots.values()), parentKey);
        if (parentNode) {
          const childMap = new Map(parentNode.children.map((child) => [child.path, child]));
          childMap.set(fileNode.path, fileNode);
          parentNode.children = Array.from(childMap.values());
        }
      }
    }

    const nodes = sortNodes(Array.from(roots.values()));
    return { rootLabel, nodes };
  }

  function findFolderNode(nodes: FileTreeNode[], id: string): FileTreeNode | null {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.kind === 'folder') {
        const nested = findFolderNode(node.children, id);
        if (nested) return nested;
      }
    }
    return null;
  }

  function sortNodes(nodes: FileTreeNode[]): FileTreeNode[] {
    const sorted = [...nodes].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });

    for (const node of sorted) {
      if (node.kind === 'folder') {
        node.children = sortNodes(node.children);
      }
    }

    return sorted;
  }

  function flattenNodes(nodes: FileTreeNode[], expanded: Record<string, boolean>, depth = 0): VisibleTreeRow[] {
    const rows: VisibleTreeRow[] = [];

    for (const node of nodes) {
      rows.push({ node, depth });
      if (node.kind === 'folder' && (expanded[node.id] ?? true)) {
        rows.push(...flattenNodes(node.children, expanded, depth + 1));
      }
    }

    return rows;
  }

  function isExpanded(id: string): boolean {
    return expandedFolders[id] ?? true;
  }

  function toggleFolder(id: string) {
    expandedFolders = {
      ...expandedFolders,
      [id]: !isExpanded(id),
    };
  }

  const treeModel = $derived(buildTree(appState.sortedItems));
  const visibleTreeRows = $derived(flattenNodes(treeModel.nodes, expandedFolders));
</script>

<LaneCard id="input-files" laneId={laneId} movable header={`${t('Input')} (${appState.fileItems.length})`} grow scrollable>
  <div class="flex h-full flex-col gap-3">
    <div class="flex flex-wrap gap-1.5">
      <Button kind="outline" variant="neutral" size="sm" onclick={() => appState.handleAddFiles()}>{t('Add Files')}</Button>
      <Button kind="outline" variant="neutral" size="sm" onclick={() => appState.handleAddFolder()}>{t('Add Folder')}</Button>
      <Button kind="ghost" variant="neutral" size="sm" onclick={() => appState.clearFiles()} disabled={appState.fileItems.length === 0}>{t('Clear')}</Button>

      <div class="ml-auto flex items-center gap-1">
        <div title={t('List View')}>
          <Button
            kind="outline"
            variant={viewMode === 'list' ? 'pop' : 'neutral'}
            size="icon"
            class="h-6 w-6"
            onclick={() => (viewMode = 'list')}
          >
            <Rows3 class="h-3.5 w-3.5" />
          </Button>
        </div>
        <div title={t('Tree View')}>
          <Button
            kind="outline"
            variant={viewMode === 'tree' ? 'pop' : 'neutral'}
            size="icon"
            class="h-6 w-6"
            onclick={() => (viewMode = 'tree')}
          >
            <FolderTree class="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>

    <div class="flex-1 overflow-auto rounded-gb border border-border-2 bg-bg-2/70">
      {#if appState.sortedItems.length === 0}
        <div class="flex min-h-[160px] items-center justify-center px-4 text-center text-xs text-text-2">
          No files added
        </div>
      {:else if viewMode === 'list'}
        <div class="divide-y divide-border-2/50">
          {#each appState.sortedItems as item, i (item.absPath ?? i)}
            <div class="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-bg-3/60">
              <FileImage class="h-4 w-4 shrink-0 text-text-2" />
              <div class="min-w-0 flex-1">
                <div class="truncate text-xs font-medium text-text-1">{item.name}</div>
                <div class="truncate text-[11px] text-text-2">{item.dir}</div>
              </div>
              <span class="shrink-0 rounded-full border border-border-2/70 bg-bg-1/70 px-2 py-0.5 text-[10px] uppercase tracking-normal text-text-2">
                {item.ext || '-'}
              </span>
              <span class="shrink-0 text-[11px] tabular-nums text-text-2">{formatBytes(item.size)}</span>
            </div>
          {/each}
        </div>
      {:else}
        <div class="py-1">
          {#if treeModel.rootLabel}
            <div class="border-b border-border-2/50 px-3 py-2 text-[11px] text-text-2">
              {treeModel.rootLabel}
            </div>
          {/if}

          {#each visibleTreeRows as row (row.node.id)}
            {#if row.node.kind === 'folder'}
              <button
                type="button"
                class="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-bg-3/60"
                style={`padding-left:${12 + row.depth * 16}px`}
                onclick={() => toggleFolder(row.node.id)}
              >
                <ChevronRight class={`h-3.5 w-3.5 shrink-0 text-text-2 transition-transform ${isExpanded(row.node.id) ? 'rotate-90' : ''}`} />
                <Folder class="h-4 w-4 shrink-0 text-text-2" />
                <span class="min-w-0 flex-1 truncate text-xs font-medium text-text-1">{row.node.name}</span>
                <span class="shrink-0 text-[10px] tabular-nums text-text-2">{row.node.fileCount}</span>
                <span class="shrink-0 text-[11px] tabular-nums text-text-2">{formatBytes(row.node.size)}</span>
              </button>
            {:else}
              <div
                class="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-bg-3/60"
                style={`padding-left:${31 + row.depth * 16}px`}
              >
                <FileImage class="h-4 w-4 shrink-0 text-text-2" />
                <div class="min-w-0 flex-1">
                  <div class="truncate text-xs text-text-1">{row.node.name}</div>
                  <div class="truncate text-[11px] text-text-2">{row.node.dir}</div>
                </div>
                <span class="shrink-0 rounded-full border border-border-2/70 bg-bg-1/70 px-2 py-0.5 text-[10px] uppercase tracking-normal text-text-2">
                  {row.node.ext || '-'}
                </span>
                <span class="shrink-0 text-[11px] tabular-nums text-text-2">{formatBytes(row.node.size)}</span>
              </div>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  </div>
</LaneCard>
