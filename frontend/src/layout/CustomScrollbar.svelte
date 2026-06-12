<script lang="ts">
  import { _ } from 'svelte-i18n';

  interface Props {
    viewport: { current?: HTMLDivElement | null } | HTMLDivElement | null;
  }

  let { viewport }: Props = $props();
  let trackEl = $state<HTMLDivElement | null>(null);
  let thumbStyle = $state<Record<string, string>>({});
  let isDragging = $state(false);
  let dragStartX = 0;
  let dragStartScroll = 0;

  function getViewportEl(): HTMLDivElement | null {
    if (!viewport) return null;
    if (viewport instanceof HTMLDivElement) return viewport;
    return viewport.current ?? null;
  }

  function updateThumb() {
    const el = getViewportEl();
    const track = trackEl;
    if (!el || !track) return;

    const { scrollWidth, clientWidth, scrollLeft } = el;
    if (scrollWidth <= clientWidth) {
      thumbStyle = { display: 'none' };
      return;
    }

    const trackWidth = track.clientWidth;
    const thumbWidth = Math.max((clientWidth / scrollWidth) * trackWidth, 40);
    const maxScroll = scrollWidth - clientWidth;
    const thumbLeft = (scrollLeft / maxScroll) * (trackWidth - thumbWidth);

    thumbStyle = {
      display: 'block',
      width: `${thumbWidth}px`,
      transform: `translateX(${thumbLeft}px)`,
    };
  }

  function handleMouseDown(e: MouseEvent) {
    e.preventDefault();
    const el = getViewportEl();
    if (!el) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartScroll = el.scrollLeft;
  }

  $effect(() => {
    const el = getViewportEl();
    if (!el) return;

    const onScroll = () => updateThumb();
    el.addEventListener('scroll', onScroll, { passive: true });

    const ro = new ResizeObserver(() => updateThumb());
    ro.observe(el);
    updateThumb();

    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  });

  $effect(() => {
    if (!isDragging) return;
    const el = getViewportEl();
    const track = trackEl;
    if (!el || !track) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { scrollWidth, clientWidth } = el;
      const trackWidth = track.clientWidth;
      const thumbWidth = Math.max((clientWidth / scrollWidth) * trackWidth, 40);
      const maxScroll = scrollWidth - clientWidth;
      const maxThumbTravel = trackWidth - thumbWidth;
      const dx = e.clientX - dragStartX;
      const scrollDelta = (dx / maxThumbTravel) * maxScroll;
      el.scrollLeft = dragStartScroll + scrollDelta;
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  });
</script>

<div bind:this={trackEl} class="custom-scrollbar" role="presentation">
  <button
    type="button"
    aria-label={$_('layout_misc.scroll_lanes')}
    class:custom-scrollbar__thumb--active={isDragging}
    class="custom-scrollbar__thumb"
    style={Object.entries(thumbStyle).map(([k, v]) => `${k}:${v}`).join(';')}
    onmousedown={handleMouseDown}
  ></button>
</div>
