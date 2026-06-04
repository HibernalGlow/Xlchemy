<script lang="ts">
  interface Props {
    onResize?: (delta: number) => void;
  }

  let { onResize }: Props = $props();
  let startX = 0;

  function handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    startX = e.clientX;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      startX = moveEvent.clientX;
      onResize?.(delta);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }
</script>

<button type="button" aria-label="Resize lane" class="lane-resizer" onmousedown={handleMouseDown}></button>
