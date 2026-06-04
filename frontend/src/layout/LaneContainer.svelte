<script lang="ts">
  import { canvasState } from '$lib/state/canvas.svelte';
  import { clearDrag, getDragMode, getDragState, setCardDropTarget } from '$lib/state/dragState';

  interface Props {
    children?: import('svelte').Snippet;
    onReorderLanes?: (fromId: string, toId: string) => void;
    onMoveCard?: (cardId: string, fromLaneId: string, toLaneId: string, targetCardId?: string | null) => void;
  }

  let { children, onReorderLanes, onMoveCard }: Props = $props();

  function findNearestCard(e: DragEvent, laneEl: HTMLElement): { cardId: string | null; insertAfter: boolean } {
    const cards = laneEl.querySelectorAll<HTMLElement>('[data-card-id]');
    if (cards.length === 0) return { cardId: null, insertAfter: false };

    let nearest: HTMLElement | null = null;
    let nearestDist = Infinity;
    let insertAfter = false;

    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const dist = Math.abs(e.clientY - midpoint);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = card;
        insertAfter = e.clientY > midpoint;
      }
    }

    return { cardId: nearest?.dataset?.cardId ?? null, insertAfter };
  }

  function handleDragOver(e: DragEvent) {
    const mode = getDragMode();
    if (mode === 'none') return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const target = (e.target as HTMLElement).closest?.('[data-lane-id]') as HTMLElement | null;
    canvasState.dragOverId = target?.dataset?.laneId ?? null;

    if (mode === 'card') {
      const targetCard = (e.target as HTMLElement).closest?.('[data-card-id]') as HTMLElement | null;
      if (targetCard) {
        const rect = targetCard.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const insertAfter = e.clientY > midpoint;
        const targetCardId = targetCard.dataset?.cardId ?? null;
        canvasState.dragTargetCardId = targetCardId;
        canvasState.dragInsertAfter = insertAfter;
        setCardDropTarget(targetCardId, insertAfter);
      } else if (target) {
        const { cardId, insertAfter } = findNearestCard(e, target);
        canvasState.dragTargetCardId = cardId;
        canvasState.dragInsertAfter = insertAfter;
        setCardDropTarget(cardId, insertAfter);
      } else {
        canvasState.dragTargetCardId = null;
        canvasState.dragInsertAfter = false;
        setCardDropTarget(null, false);
      }
    }
  }

  function handleDragLeave(e: DragEvent) {
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as Node).contains(related)) return;
    canvasState.dragOverId = null;
    canvasState.dragTargetCardId = null;
    canvasState.dragInsertAfter = false;
    setCardDropTarget(null, false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();

    const mode = getDragMode();
    const target = (e.target as HTMLElement).closest?.('[data-lane-id]') as HTMLElement | null;
    const toLaneId = target?.dataset?.laneId;
    const targetCard = (e.target as HTMLElement).closest?.('[data-card-id]') as HTMLElement | null;
    const targetCardId = targetCard?.dataset?.cardId ?? null;

    if (mode === 'lane' && onReorderLanes) {
      const { laneId: fromId } = getDragState();
      if (fromId && toLaneId && fromId !== toLaneId) {
        onReorderLanes(fromId, toLaneId);
      }
    } else if (mode === 'card' && onMoveCard) {
      const { cardId, fromLaneId, targetCardId, insertAfter } = getDragState();
      if (cardId && fromLaneId && toLaneId) {
        const effectiveTarget = targetCardId ? `${targetCardId}${insertAfter ? '::after' : ''}` : null;
        if (fromLaneId !== toLaneId || (effectiveTarget && !effectiveTarget.startsWith(cardId))) {
          onMoveCard(cardId, fromLaneId, toLaneId, effectiveTarget);
        }
      }
    }

    clearDrag();
    canvasState.dragOverId = null;
    canvasState.dragTargetCardId = null;
    canvasState.dragInsertAfter = false;
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
