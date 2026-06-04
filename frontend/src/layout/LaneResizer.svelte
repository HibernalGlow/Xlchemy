<script lang="ts">
  interface Props {
    onResize?: (delta: number) => void;
    onResizeEnd?: () => void;
  }

  let { onResize, onResizeEnd }: Props = $props();
  let startX = 0;
  let pointerId: number | null = null;
  let resizerEl = $state<HTMLButtonElement | null>(null);

  function handlePointerDown(e: PointerEvent) {
    e.preventDefault();
    startX = e.clientX;
    pointerId = e.pointerId;
    resizerEl?.setPointerCapture(e.pointerId);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (pointerId !== moveEvent.pointerId) return;
      const delta = moveEvent.clientX - startX;
      startX = moveEvent.clientX;
      onResize?.(delta);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (pointerId !== upEvent.pointerId) return;
      pointerId = null;
      resizerEl?.releasePointerCapture(upEvent.pointerId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      onResizeEnd?.();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  }
</script>

<button bind:this={resizerEl} type="button" aria-label="Resize lane" class="lane-resizer" onpointerdown={handlePointerDown}></button>
