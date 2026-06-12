<script lang="ts">
  import {
    ArrowDown,
    ArrowUp,
    ChevronRight,
    FileImage,
    Folder,
    FolderTree,
    Trash2,
    Rows3,
    FolderPlus,
    FilePlus,
    Eraser,
    Eye,
    EyeOff,
    Play,
    Square,
    FolderOpen,
    X,
    CheckCheck,
  } from '@lucide/svelte';
  import {
    getCoreRowModel,
    getSortedRowModel,
    type ColumnDef,
    type SortingFn,
    type SortingState,
    type Updater,
  } from '@tanstack/table-core';
  import { createSvelteTable, FlexRender } from '$lib/components/ui/data-table';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Checkbox from '$lib/components/ui/Checkbox.svelte';
  import LocalFilePreview from '$lib/components/ui/LocalFilePreview.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import ContextMenu from '$lib/components/ui/ContextMenu.svelte';
  import type { ContextMenuItem } from '$lib/components/ui/ContextMenu.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { _ } from 'svelte-i18n';
  import type { LaneId } from '$lib/cards/definitions';
  import type { FileItem } from '$lib/domain';

  interface Props {
    laneId: LaneId;
  }

  type ViewMode = 'list' | 'tree';
  const VALID_SORT_FIELDS = ['name', 'ext', 'size', 'dir'] as const;
  type SortField = (typeof VALID_SORT_FIELDS)[number];
  type ActiveSort = {
    field: SortField;
    desc: boolean;
  };
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
  type MutableTreeNode = Omit<FileTreeNode, 'children'> & {
    childMap: Map<string, MutableTreeNode>;
  };
  type VisibleTreeRow = {
    node: FileTreeNode;
    depth: number;
  };
  type SelectionState = 'none' | 'partial' | 'all';

  let { laneId }: Props = $props();

  function isSortField(value: string): value is SortField {
    return VALID_SORT_FIELDS.includes(value as SortField);
  }

  function compareText(a: string, b: string): number {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }

  function loadViewMode(): ViewMode {
    try {
      const value = localStorage.getItem('xlchemy-input-files-view');
      return value === 'list' ? 'list' : 'tree';
    } catch {
      return 'tree';
    }
  }

  function loadSorting(): SortingState {
    try {
      const raw = localStorage.getItem('xlchemy-input-files-sorting');
      if (!raw) return [{ id: 'name', desc: false }];
      const parsed = JSON.parse(raw);
      const first = Array.isArray(parsed) ? parsed[0] : null;
      if (first && isSortField(String(first.id))) {
        return [{ id: String(first.id), desc: !!first.desc }];
      }
    } catch {}
    return [{ id: 'name', desc: false }];
  }

  function loadOriginalPreviewEnabled(): boolean {
    try {
      return localStorage.getItem('xlchemy-input-files-original-preview') === 'true';
    } catch {
      return false;
    }
  }

  function formatBytes(size: number): string {
    if (!Number.isFinite(size) || size <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
    const value = size / 1024 ** index;
    return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
  }

  function resolveSort(state: SortingState): ActiveSort {
    const first = state[0];
    if (!first || !isSortField(String(first.id))) {
      return { field: 'name', desc: false };
    }
    return { field: String(first.id) as SortField, desc: !!first.desc };
  }

  function compareFileItems(a: FileItem, b: FileItem, field: SortField): number {
    let result = 0;

    switch (field) {
      case 'size':
        result = a.size - b.size;
        break;
      case 'ext':
        result = compareText(a.ext || '', b.ext || '');
        if (result === 0) result = compareText(a.name, b.name);
        break;
      case 'dir':
        result = compareText(a.dir || '', b.dir || '');
        if (result === 0) result = compareText(a.name, b.name);
        break;
      case 'name':
      default:
        result = compareText(a.name, b.name);
        break;
    }

    return result === 0 ? compareText(a.absPath, b.absPath) : result;
  }

  function compareTreeNodes(a: FileTreeNode, b: FileTreeNode, sort: ActiveSort): number {
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;

    let result = 0;
    switch (sort.field) {
      case 'size':
        result = a.size - b.size;
        break;
      case 'ext':
        result = compareText(a.kind === 'file' ? a.ext || '' : a.name, b.kind === 'file' ? b.ext || '' : b.name);
        break;
      case 'dir':
        result = compareText(a.path, b.path);
        break;
      case 'name':
      default:
        result = compareText(a.name, b.name);
        break;
    }

    if (result === 0) result = compareText(a.name, b.name);
    if (result === 0) result = compareText(a.path, b.path);
    return sort.desc ? -result : result;
  }

  function pathSegments(item: FileItem): string[] {
    const rawPath = item.absPath || `${item.dir}\\${item.name}`;
    return rawPath.split(/[\\/]+/).filter(Boolean);
  }

  function directorySegments(item: FileItem): string[] {
    return pathSegments(item).slice(0, -1);
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

  function finalizeNodes(nodes: Map<string, MutableTreeNode>, sort: ActiveSort): FileTreeNode[] {
    return [...nodes.values()]
      .map((node) => {
        const { childMap, ...base } = node;
        return {
          ...base,
          children: node.kind === 'folder' ? finalizeNodes(childMap, sort) : [],
        };
      })
      .sort((a, b) => compareTreeNodes(a, b, sort));
  }

  function buildTree(items: FileItem[], sort: ActiveSort): { rootLabel: string; nodes: FileTreeNode[] } {
    const prefixLength = commonPrefixLength(items);
    const rootLabel = items.length > 1
      ? directorySegments(items[0]).slice(0, prefixLength).join('\\')
      : '';
    const roots = new Map<string, MutableTreeNode>();

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
            childMap: new Map(),
          };
          currentChildren.set(currentPath, folderNode);
        }

        folderNode.size += item.size;
        folderNode.fileCount += 1;
        currentChildren = folderNode.childMap;
      }

      const fileNode: MutableTreeNode = {
        id: `file:${item.absPath}`,
        kind: 'file',
        name: item.name,
        path: item.absPath,
        size: item.size,
        fileCount: 1,
        ext: item.ext,
        dir: item.dir,
        item,
        childMap: new Map(),
      };

      currentChildren.set(fileNode.path, fileNode);
    }

    return {
      rootLabel,
      nodes: finalizeNodes(roots, sort),
    };
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

  function updateSorting(updater: Updater<SortingState>) {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    const first = next[0];
    sorting = first && isSortField(String(first.id))
      ? [{ id: String(first.id), desc: !!first.desc }]
      : [{ id: 'name', desc: false }];
  }

  function setSortField(value: string) {
    if (!isSortField(value)) return;
    sorting = [{ id: value, desc: activeSort.desc }];
  }

  function toggleSortDirection() {
    sorting = [{ id: activeSort.field, desc: !activeSort.desc }];
  }

  function sortOptions() {
    return [
      { value: 'name', label: $_('input.name') },
      { value: 'ext', label: $_('input.ext') },
      { value: 'size', label: $_('modify.file_size') },
      { value: 'dir', label: $_('input.location') },
    ];
  }

  function sortIndicator(columnId: string) {
    const sorted = fileTable.getColumn(columnId)?.getIsSorted();
    return sorted === 'desc' ? 'desc' : sorted === 'asc' ? 'asc' : null;
  }

  function toggleSelection(path: string, checked: boolean) {
    const next = new Set(selectedPaths);
    if (checked) next.add(path);
    else next.delete(path);
    selectedPaths = next;
  }

  function collectFilePaths(node: FileTreeNode, paths: string[] = []): string[] {
    if (node.kind === 'file') {
      paths.push(node.path);
      return paths;
    }

    for (const child of node.children) {
      collectFilePaths(child, paths);
    }

    return paths;
  }

  function buildFolderSelectionIndex(nodes: FileTreeNode[]): Record<string, string[]> {
    const index: Record<string, string[]> = {};

    function visit(node: FileTreeNode) {
      if (node.kind !== 'folder') return;
      index[node.id] = collectFilePaths(node);
      for (const child of node.children) {
        visit(child);
      }
    }

    for (const node of nodes) {
      visit(node);
    }

    return index;
  }

  function isSelected(path: string): boolean {
    return selectedPaths.has(path);
  }

  function visibleFilePaths(): string[] {
    if (viewMode === 'list') {
      return fileTable.getRowModel().rows.map((row) => row.original.absPath);
    }
    return visibleTreeRows.filter((row) => row.node.kind === 'file').map((row) => row.node.path);
  }

  function toggleSelectVisible(checked: boolean) {
    const visiblePaths = visibleFilePaths();
    const next = new Set(selectedPaths);

    for (const path of visiblePaths) {
      if (checked) next.add(path);
      else next.delete(path);
    }

    selectedPaths = next;
  }

  function getFolderSelectionState(node: FileTreeNode): SelectionState {
    const paths = folderSelectionIndex[node.id] || [];
    if (paths.length === 0) return 'none';

    let count = 0;
    for (const path of paths) {
      if (selectedPaths.has(path)) count += 1;
    }

    if (count === 0) return 'none';
    if (count === paths.length) return 'all';
    return 'partial';
  }

  function toggleFolderSelection(node: FileTreeNode, checked: boolean) {
    const paths = folderSelectionIndex[node.id] || [];
    const next = new Set(selectedPaths);

    for (const path of paths) {
      if (checked) next.add(path);
      else next.delete(path);
    }

    selectedPaths = next;
  }

  function removeSelected() {
    if (selectedPaths.size === 0) return;
    const next = appState.fileItems.filter((item) => !selectedPaths.has(item.absPath));
    appState.fileItems = next;
    selectedPaths = new Set<string>();
  }

  const sortByField = (field: SortField): SortingFn<FileItem> => (rowA, rowB) =>
    compareFileItems(rowA.original, rowB.original, field);

  function tableColumns(): ColumnDef<FileItem>[] {
    return [
      {
        id: 'name',
        accessorFn: (item) => item.name,
        header: $_('input.name'),
        sortingFn: sortByField('name'),
      },
      {
        id: 'ext',
        accessorFn: (item) => item.ext || '',
        header: $_('input.ext'),
        sortingFn: sortByField('ext'),
      },
      {
        id: 'size',
        accessorFn: (item) => item.size,
        header: $_('modify.file_size'),
        sortingFn: sortByField('size'),
      },
      {
        id: 'dir',
        accessorFn: (item) => item.dir || '',
        header: $_('input.location'),
        sortingFn: sortByField('dir'),
      },
    ];
  }

  let viewMode = $state<ViewMode>(loadViewMode());
  let sorting = $state<SortingState>(loadSorting());
  let showOriginalPreview = $state(loadOriginalPreviewEnabled());
  let expandedFolders = $state<Record<string, boolean>>({});
  let selectedPaths = $state<Set<string>>(new Set());

  // Context menu state
  let ctxMenu = $state<{ x: number; y: number; path: string } | null>(null);

  function contextMenuItems(): ContextMenuItem[] {
    return [
      { id: 'open_location', label: $_('input.open_file_location'), icon: FolderOpen },
      { id: 'separator', label: '', separator: true },
      { id: 'remove', label: $_('input.remove_from_list'), icon: X },
    ];
  }

  function handleContextMenu(e: MouseEvent, path: string) {
    e.preventDefault();
    ctxMenu = { x: e.clientX, y: e.clientY, path };
  }

  function handleCtxSelect(id: string) {
    if (!ctxMenu) return;
    if (id === 'open_location') {
      appState.showFileInFolder(ctxMenu.path);
    } else if (id === 'remove') {
      appState.fileItems = appState.fileItems.filter((item) => item.absPath !== ctxMenu!.path);
      const next = new Set(selectedPaths);
      next.delete(ctxMenu.path);
      selectedPaths = next;
    }
  }

  const activeSort = $derived(resolveSort(sorting));
  const fileTable = createSvelteTable<FileItem>({
    get data() {
      return appState.fileItems;
    },
    get columns() {
      return tableColumns();
    },
    state: {
      get sorting() {
        return sorting;
      },
    },
    onSortingChange: updateSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableMultiSort: false,
    enableSortingRemoval: false,
  });
  const treeModel = $derived(buildTree(appState.fileItems, activeSort));
  const visibleTreeRows = $derived(flattenNodes(treeModel.nodes, expandedFolders));
  const folderSelectionIndex = $derived(buildFolderSelectionIndex(treeModel.nodes));
  const visiblePaths = $derived(visibleFilePaths());
  const visibleSelectedCount = $derived(visiblePaths.filter((path) => selectedPaths.has(path)).length);
  const allVisibleSelected = $derived(visiblePaths.length > 0 && visibleSelectedCount === visiblePaths.length);
  const someVisibleSelected = $derived(visibleSelectedCount > 0 && visibleSelectedCount < visiblePaths.length);
  const selectedCount = $derived(selectedPaths.size);
  const totalBytes = $derived(appState.fileItems.reduce((sum, item) => sum + (item.size || 0), 0));

  $effect(() => {
    try {
      localStorage.setItem('xlchemy-input-files-view', viewMode);
    } catch {}
  });

  $effect(() => {
    try {
      localStorage.setItem('xlchemy-input-files-sorting', JSON.stringify(sorting));
    } catch {}
  });

  $effect(() => {
    try {
      localStorage.setItem('xlchemy-input-files-original-preview', String(showOriginalPreview));
    } catch {}
  });

  $effect(() => {
    const available = new Set(appState.fileItems.map((item) => item.absPath));
    const next = new Set<string>();
    for (const path of selectedPaths) {
      if (available.has(path)) next.add(path);
    }
    if (next.size !== selectedPaths.size) {
      selectedPaths = next;
    }
  });
</script>

<LaneCard
  id="input-files"
  laneId={laneId}
  movable
  header={`${$_('nav.input')} (${appState.fileItems.length})`}
  class="drawer--input-files"
  scrollable
>
  <div class="input-files-card flex min-h-0 min-w-0 flex-col gap-2">
    <div class="input-files-card__toolbar flex flex-wrap items-center gap-2 rounded-md border border-border px-2.5 py-2 bg-bg-1">
      <div class="input-files-card__actions flex flex-wrap items-center gap-2">
      <Button kind="outline" variant="neutral" size="icon" class="h-7 w-7" title={$_('input.add_files')} onclick={() => appState.handleAddFiles()}>
        <FilePlus class="h-3.5 w-3.5" />
      </Button>
      <Button kind="outline" variant="neutral" size="icon" class="h-7 w-7" title={$_('input.add_folder')} onclick={() => appState.handleAddFolder()}>
        <FolderPlus class="h-3.5 w-3.5" />
      </Button>
      <Button kind="ghost" variant="neutral" size="icon" class="h-7 w-7" title={$_('input.clear')} onclick={() => appState.clearFiles()} disabled={appState.fileItems.length === 0}>
        <Eraser class="h-3.5 w-3.5" />
      </Button>
      <Button kind="ghost" variant="neutral" size="icon" class="h-7 w-7" title={$_('input.remove_completed')} onclick={() => appState.clearCompleted()} disabled={appState.conversionFilePaths.size === 0 || appState.isConverting}>
        <CheckCheck class="h-3.5 w-3.5" />
      </Button>
      <Button kind="ghost" variant="neutral" size="icon" class="h-7 w-7" title="删除已选" onclick={removeSelected} disabled={selectedCount === 0}>
        <Trash2 class="h-3.5 w-3.5" />
      </Button>
      <Button kind="ghost" variant="neutral" size="icon" class="h-7 w-7" title={showOriginalPreview ? '隐藏预览' : '显示预览'} onclick={() => (showOriginalPreview = !showOriginalPreview)}>
        {#if showOriginalPreview}
          <Eye class="h-3.5 w-3.5" />
        {:else}
          <EyeOff class="h-3.5 w-3.5" />
        {/if}
      </Button>
      </div>

      <div class="input-files-card__filters ml-auto flex flex-wrap items-center gap-1.5">
        <div class="input-files-card__summary flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary">{appState.fileItems.length} 项</Badge>
        {#if totalBytes > 0}
          <Badge variant="outline">{formatBytes(totalBytes)}</Badge>
        {/if}
        {#if selectedCount > 0}
          <Badge variant="outline">已选 {selectedCount}</Badge>
        {/if}
        </div>
        <Select class="w-28" value={activeSort.field} options={sortOptions()} onChange={setSortField} />
        <div title={activeSort.desc ? '降序' : '升序'}>
          <Button kind="outline" variant="neutral" size="icon" class="h-6 w-6" onclick={toggleSortDirection}>
            {#if activeSort.desc}
              <ArrowDown class="h-3.5 w-3.5" />
            {:else}
              <ArrowUp class="h-3.5 w-3.5" />
            {/if}
          </Button>
        </div>
        <div title={$_('input.list_view')}>
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
        <div title={$_('input.tree_view')}>
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

    <div class="input-files-card__surface overflow-hidden rounded-md border border-border bg-bg-1">
      {#if appState.fileItems.length === 0}
        <div class="input-files-card__empty flex min-h-[220px] flex-col items-center justify-center gap-4 px-6 text-center">
          <div class="flex h-14 w-14 items-center justify-center rounded-md border border-border bg-bg-1">
            <FileImage class="h-6 w-6 text-[color:var(--fill-pop-bg)]" />
          </div>
          <div class="space-y-1">
            <div class="text-sm font-semibold text-text-1">添加待转换图片</div>
            <p class="max-w-[26rem] text-xs leading-5 text-text-2">
              支持拖入文件或文件夹。这里会保留预览、筛选、排序和批量选择，适合先整理再开始转换。
            </p>
          </div>
          <div class="flex flex-wrap items-center justify-center gap-2">
            <Button kind="solid" variant="pop" size="sm" onclick={() => appState.handleAddFiles()}>
              <FilePlus class="mr-1.5 h-3.5 w-3.5" />
              添加文件
            </Button>
            <Button kind="outline" variant="neutral" size="sm" onclick={() => appState.handleAddFolder()}>
              <FolderPlus class="mr-1.5 h-3.5 w-3.5" />
              添加文件夹
            </Button>
          </div>
        </div>
      {:else}
        <div class="input-files-card__list min-w-0 overflow-auto pr-1" style="max-height:min(46vh, 31rem);">
          {#if viewMode === 'list'}
            <table class="w-full table-fixed border-collapse text-left">
              <colgroup>
                <col style="width: 2.5rem;" />
                <col style="width: 42%;" />
                <col style="width: 4.75rem;" />
                <col style="width: 6rem;" />
                <col />
              </colgroup>
              <thead>
                {#each fileTable.getHeaderGroups() as headerGroup (headerGroup.id)}
                  <tr class="border-b border-border-2/70">
                    {#each headerGroup.headers as header (header.id)}
                      <th
                        class="sticky top-0 z-[1] bg-bg-1 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-text-2"
                      >
                        {#if header.column.id === 'name'}
                          <div class="flex items-center gap-2">
                            <Checkbox
                              checked={allVisibleSelected}
                              indeterminate={someVisibleSelected}
                              onCheckedChange={toggleSelectVisible}
                            />
                            {#if someVisibleSelected}
                              <span class="text-[10px] normal-case tracking-normal text-text-2">{visibleSelectedCount}/{visiblePaths.length}</span>
                            {/if}
                          </div>
                        {:else if !header.isPlaceholder}
                          <button
                            type="button"
                            class="flex w-full min-w-0 items-center gap-1.5 text-left transition-colors hover:text-text-1"
                            onclick={header.column.getToggleSortingHandler()}
                          >
                            <span class={`min-w-0 flex-1 truncate ${header.column.id === 'size' ? 'text-right' : ''}`}>
                              <FlexRender content={header.column.columnDef.header} context={header.getContext()} />
                            </span>
                            {#if sortIndicator(header.column.id) === 'asc'}
                              <ArrowUp class="h-3.5 w-3.5 shrink-0" />
                            {:else if sortIndicator(header.column.id) === 'desc'}
                              <ArrowDown class="h-3.5 w-3.5 shrink-0" />
                            {/if}
                          </button>
                        {/if}
                      </th>
                    {/each}
                  </tr>
                {/each}
              </thead>
              <tbody>
                {#each fileTable.getRowModel().rows as row (row.original.absPath)}
                  <tr class="input-files-card__row border-b border-border transition-colors last:border-b-0 hover:bg-bg-2" oncontextmenu={(e) => handleContextMenu(e, row.original.absPath)}>
                    <td class="px-3 py-2.5 align-top">
                      <div class="flex h-9 items-center justify-center">
                        <Checkbox checked={isSelected(row.original.absPath)} onCheckedChange={(checked) => toggleSelection(row.original.absPath, checked)} />
                      </div>
                    </td>
                    <td class="min-w-0 px-3 py-2.5">
                      <div class="flex min-w-0 items-center gap-3" title={row.original.absPath}>
                        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-bg-1">
                          <LocalFilePreview
                            path={row.original.absPath}
                            name={row.original.name}
                            enabled={showOriginalPreview}
                            class="h-full w-full"
                            iconClass="h-4 w-4 text-text-2"
                            imageClass="h-full w-full object-cover"
                          />
                        </div>
                        <div class="min-w-0">
                          <div class="truncate text-xs font-medium text-text-1">{row.original.name}</div>
                          <div class="truncate text-[11px] text-text-2">{row.original.ext ? `.${row.original.ext}` : 'file'}</div>
                        </div>
                      </div>
                    </td>
                    <td class="min-w-0 px-3 py-2.5">
                      <span class="inline-flex max-w-full truncate rounded-sm border border-border bg-bg-2 px-2 py-0.5 text-[10px] uppercase tracking-normal text-text-2">
                        {row.original.ext || '-'}
                      </span>
                    </td>
                    <td class="min-w-0 px-3 py-2.5 text-right text-[11px] tabular-nums text-text-2">
                      {formatBytes(row.original.size)}
                    </td>
                    <td class="min-w-0 px-3 py-2.5">
                      <div class="truncate text-[11px] text-text-2" title={row.original.dir}>{row.original.dir}</div>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          {:else}
            <div class="py-1">
              {#if treeModel.rootLabel}
                <div class="border-b border-border-2/50 px-3 py-2 text-[11px] text-text-2">
                  <div class="flex items-center gap-2">
                    <Checkbox
                      checked={allVisibleSelected}
                      indeterminate={someVisibleSelected}
                      onCheckedChange={toggleSelectVisible}
                    />
                    <span class="truncate">{treeModel.rootLabel}</span>
                    {#if selectedCount > 0}
                      <span class="ml-auto text-[10px] text-text-2">已选 {selectedCount}</span>
                    {/if}
                  </div>
                </div>
              {/if}

              {#each visibleTreeRows as row (row.node.id)}
                {#if row.node.kind === 'folder'}
                  {@const folderState = getFolderSelectionState(row.node)}
                  <div
                    class="input-files-card__tree-row input-files-card__tree-row--folder flex items-center gap-2 px-3 py-2 transition-colors hover:bg-bg-2"
                    style={`padding-left:${12 + row.depth * 16}px`}
                  >
                    <Checkbox
                      checked={folderState === 'all'}
                      indeterminate={folderState === 'partial'}
                      onCheckedChange={(checked) => toggleFolderSelection(row.node, checked)}
                    />
                    <button
                      type="button"
                      class="flex min-w-0 flex-1 items-center gap-2 text-left"
                      onclick={() => toggleFolder(row.node.id)}
                    >
                      <ChevronRight class={`h-3.5 w-3.5 shrink-0 text-text-2 transition-transform ${isExpanded(row.node.id) ? 'rotate-90' : ''}`} />
                      <Folder class="h-4 w-4 shrink-0 text-text-2" />
                      <span class="min-w-0 flex-1 truncate text-xs font-medium text-text-1">{row.node.name}</span>
                    </button>
                    <div class="input-files-card__tree-meta ml-auto flex items-center gap-2">
                      <span class="shrink-0 text-[10px] tabular-nums text-text-2">{row.node.fileCount}</span>
                      <span class="shrink-0 text-[11px] tabular-nums text-text-2">{formatBytes(row.node.size)}</span>
                    </div>
                  </div>
                {:else}
                  <div
                    role="row"
                    tabindex="-1"
                    class="input-files-card__tree-row flex items-center gap-2 px-3 py-2 transition-colors hover:bg-bg-2"
                    style={`padding-left:${12 + row.depth * 16}px`}
                    oncontextmenu={(e) => handleContextMenu(e, row.node.path)}
                  >
                    <Checkbox checked={isSelected(row.node.path)} onCheckedChange={(checked) => toggleSelection(row.node.path, checked)} />
                    <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-bg-1">
                      <LocalFilePreview
                        path={row.node.path}
                        name={row.node.name}
                        enabled={showOriginalPreview}
                        class="h-full w-full"
                        iconClass="h-3.5 w-3.5 text-text-2"
                        imageClass="h-full w-full object-cover"
                      />
                    </div>
                    <div class="min-w-0 flex-1" title={row.node.path}>
                      <div class="truncate text-xs text-text-1">{row.node.name}</div>
                      <div class="truncate text-[11px] text-text-2">{row.node.ext ? `.${row.node.ext}` : 'file'}</div>
                    </div>
                    <div class="input-files-card__tree-meta ml-auto flex items-center gap-2">
                      <span class="shrink-0 rounded-sm border border-border bg-bg-2 px-2 py-0.5 text-[10px] uppercase tracking-normal text-text-2">
                        {row.node.ext || '-'}
                      </span>
                      <span class="shrink-0 text-[11px] tabular-nums text-text-2">{formatBytes(row.node.size)}</span>
                    </div>
                  </div>
                {/if}
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <div class="input-files-card__footer">
      {#if appState.isConverting}
        <Button kind="outline" variant="neutral" size="sm" class="w-full" onclick={() => appState.cancelConversion()}>
          <Square class="h-3.5 w-3.5 mr-1.5" />
          {$_('dialog.cancel')}
        </Button>
      {:else}
        <Button kind="solid" variant="pop" size="sm" class="w-full" onclick={() => appState.startConversion()} disabled={appState.fileItems.length === 0}>
          <Play class="h-3.5 w-3.5 mr-1.5" />
          {$_('input.convert')} ({appState.fileItems.length})
        </Button>
      {/if}
    </div>
  </div>

  {#if ctxMenu}
    <ContextMenu
      x={ctxMenu.x}
      y={ctxMenu.y}
      items={contextMenuItems()}
      onSelect={handleCtxSelect}
      onClose={() => { ctxMenu = null; }}
    />
  {/if}
</LaneCard>
