<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import { clearDrag, setLaneDrag } from '$lib/state/dragState';
  import CollapsedLane from './CollapsedLane.svelte';
  import LaneDragHandle from './LaneDragHandle.svelte';

  interface Props {
    id: string;
    title: string;
    children?: import('svelte').Snippet;
    collapsed: boolean;
    onToggleCollapse: () => void;
    width: number;
    dragOverId?: string | null;
  }

  let { id, title, children, collapsed, onToggleCollapse, width, dragOverId = null }: Props = $props();
  let isDragging = $state(false);
  let laneEl = $state<HTMLDivElement | null>(null);

  function handleDragStart(e: DragEvent) {
    const target = e.target as HTMLElement;
    const cardEl = target.closest?.('[data-card-id]');
    if (cardEl) return;
    const handle = target.closest?.('.lane-drag-handle');
    if (!handle) {
      e.preventDefault();
      return;
    }
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
</script>

{#if collapsed}
  <CollapsedLane laneId={id} title={title} onExpand={onToggleCollapse} draggable={true} onDragStart={handleDragStart} onDragEnd={handleDragEnd} {isDragging} />
{:else}
  <div
    role="group"
    aria-label={title}
    bind:this={laneEl}
    class={cn('lane', isDragging && 'lane--dragging', isDragOver && !isDragging && 'lane--drag-over')}
    data-lane-id={id}
    style={`width:${width}rem;min-width:16rem;max-width:40rem;`}
    draggable="true"
    ondragstart={handleDragStart}
    ondragend={handleDragEnd}
  >
    <div class="stack-view">
      <LaneDragHandle title={title} {collapsed} onToggleCollapse={onToggleCollapse} />
      <div class="stack-content">
        {@render children?.()}
      </div>
    </div>
  </div>
{/if}
