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
    fill?: boolean;
    dragOverId?: string | null;
    onRename?: () => void;
    onDelete?: () => void;
  }

  let { id, title, children, collapsed, onToggleCollapse, width, fill = false, dragOverId = null, onRename, onDelete }: Props = $props();
  let isDragging = $state(false);
  let laneEl = $state<HTMLDivElement | null>(null);

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
</script>

{#if collapsed}
  <CollapsedLane laneId={id} title={title} onExpand={onToggleCollapse} draggable={true} onDragStart={handleDragStart} onDragEnd={handleDragEnd} {isDragging} />
{:else}
  <div
    role="group"
    aria-label={title}
    bind:this={laneEl}
    class={cn('lane', fill && 'lane--fill', isDragging && 'lane--dragging', isDragOver && !isDragging && 'lane--drag-over')}
    data-lane-id={id}
    style={fill ? 'width:100%;min-width:0;flex:1;' : `width:${width}rem;min-width:14rem;max-width:30rem;`}
  >
    <div class="stack-view">
      <LaneDragHandle title={title} {collapsed} onToggleCollapse={onToggleCollapse} onDragStart={handleDragStart} onDragEnd={handleDragEnd} {onRename} {onDelete} />
      <div class="stack-content">
        {@render children?.()}
      </div>
    </div>
  </div>
{/if}
