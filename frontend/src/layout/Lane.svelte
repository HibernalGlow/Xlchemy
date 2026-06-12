<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import { clearDrag, setLaneDrag } from '$lib/state/dragState';
  import CollapsedLane from './CollapsedLane.svelte';
  import LaneDragHandle from './LaneDragHandle.svelte';
  import LaneResizer from './LaneResizer.svelte';
  import { _ } from 'svelte-i18n';

  interface Props {
    id: string;
    title: string;
    children?: import('svelte').Snippet;
    collapsed: boolean;
    onToggleCollapse: () => void;
    width: number;
    maxWidth?: number;
    fill?: boolean;
    autoFit?: boolean;
    laneCount?: number;
    dragOverId?: string | null;
    onRename?: () => void;
    onDelete?: () => void;
    onHide?: () => void;
    onResize?: (nextWidth: number) => void;
    onResizeEnd?: (nextWidth: number) => void;
  }

  let {
    id,
    title,
    children,
    collapsed,
    onToggleCollapse,
    width,
    maxWidth = 44,
    fill = false,
    autoFit = false,
    laneCount = 1,
    dragOverId = null,
    onRename,
    onDelete,
    onHide,
    onResize,
    onResizeEnd,
  }: Props = $props();
  let isDragging = $state(false);
  let isResizing = $state(false);
  let laneEl = $state<HTMLDivElement | null>(null);
  let poppedOut = $state(false);
  let liveWidth = $state(18);
  const MIN_LANE_WIDTH = 12;

  function clampWidth(value: number): number {
    return Math.max(MIN_LANE_WIDTH, Math.min(maxWidth, value));
  }

  function handleResize(deltaPx: number) {
    isResizing = true;
    const nextWidth = clampWidth(liveWidth + deltaPx / 16);
    liveWidth = nextWidth;
    onResize?.(nextWidth);
  }

  function handleResizeEnd() {
    isResizing = false;
    onResizeEnd?.(liveWidth);
  }

  function handleDragStart(e: DragEvent) {
    setLaneDrag(id);
    e.dataTransfer?.setData('text/x-lane-id', id);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    isDragging = true;
  }

  function handleDragEnd() {
    isDragging = false;
    clearDrag();
  }

  const isDragOver = $derived(dragOverId === id);

  $effect(() => {
    if (isResizing) return;
    liveWidth = clampWidth(width);
  });
</script>

{#if collapsed}
  <CollapsedLane laneId={id} title={title} onExpand={onToggleCollapse} draggable={true} onDragStart={handleDragStart} onDragEnd={handleDragEnd} {isDragging} />
{:else}
  <div
    role="group"
    aria-label={title}
    bind:this={laneEl}
    class={cn('lane', fill && 'lane--fill', autoFit && !fill && 'lane--auto-fit', isDragging && 'lane--dragging', isDragOver && !isDragging && 'lane--drag-over')}
    data-lane-id={id}
    style={fill ? 'width:100%;min-width:0;flex:1;' : autoFit ? `min-width:${MIN_LANE_WIDTH}rem;max-width:${maxWidth}rem;flex:1;` : `width:${liveWidth}rem;min-width:${MIN_LANE_WIDTH}rem;max-width:${maxWidth}rem;`}
  >
    <div class="stack-view">
      <LaneDragHandle
        title={title}
        {collapsed}
        onToggleCollapse={onToggleCollapse}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        {onRename}
        {onDelete}
        {onHide}
        onPopout={() => (poppedOut = true)}
        poppedOut={poppedOut}
      />
      <div class="stack-content">
        {@render children?.()}
      </div>
      {#if !fill && !autoFit}
        <LaneResizer onResize={handleResize} onResizeEnd={handleResizeEnd} />
      {/if}
    </div>
  </div>

  {#if poppedOut}
    <div class="lane-popout">
      <button type="button" class="lane-popout__backdrop" aria-label={$_('lane_actions.close_popout')} onclick={() => (poppedOut = false)}></button>
      <div class="lane-popout__panel">
        <div class="stack-view">
          <LaneDragHandle
            title={title}
            {collapsed}
            onToggleCollapse={onToggleCollapse}
            {onRename}
            {onDelete}
            {onHide}
            onPopout={() => (poppedOut = false)}
            poppedOut={poppedOut}
          />
          <div class="lane-popout__body">
            {@render children?.()}
          </div>
        </div>
      </div>
    </div>
  {/if}
{/if}
