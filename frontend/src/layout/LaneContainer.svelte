<script lang="ts">
  import { canvasState } from '$lib/state/canvas.svelte';
  import { clearDrag, getDragMode, getDragState } from '$lib/state/dragState';

  interface Props {
    children?: import('svelte').Snippet;
    onReorderLanes?: (fromId: string, toId: string) => void;
    onMoveCard?: (cardId: string, fromLaneId: string, toLaneId: string) => void;
  }

  let { children, onReorderLanes, onMoveCard }: Props = $props();

  function handleDragOver(e: DragEvent) {
    const mode = getDragMode();
    if (mode === 'none') return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const target = (e.target as HTMLElement).closest?.('[data-lane-id]') as HTMLElement | null;
    canvasState.dragOverId = target?.dataset?.laneId ?? null;
  }

  function handleDragLeave(e: DragEvent) {
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as Node).contains(related)) return;
    canvasState.dragOverId = null;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();

    const mode = getDragMode();
    const target = (e.target as HTMLElement).closest?.('[data-lane-id]') as HTMLElement | null;
    const toLaneId = target?.dataset?.laneId;

    if (mode === 'lane' && onReorderLanes) {
      const { laneId: fromId } = getDragState();
      if (fromId && toLaneId && fromId !== toLaneId) {
        onReorderLanes(fromId, toLaneId);
      }
    } else if (mode === 'card' && onMoveCard) {
      const { cardId, fromLaneId } = getDragState();
      if (cardId && fromLaneId && toLaneId && fromLaneId !== toLaneId) {
        onMoveCard(cardId, fromLaneId, toLaneId);
      }
    }

    clearDrag();
    canvasState.dragOverId = null;
  }
</script>

<div
  role="list"
  bind:this={canvasState.canvasEl}
  class="canvas-container"
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
  <div class="lanes-scrollable">
    {@render children?.()}
  </div>
</div>
