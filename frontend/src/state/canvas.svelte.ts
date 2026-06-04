export class CanvasState {
  canvasEl = $state<HTMLDivElement | null>(null);
  isOverflowing = $state(false);
  visibleLanes = $state<string[]>([]);
  dragOverId = $state<string | null>(null);

  updateOverflow() {
    const el = this.canvasEl;
    if (!el) return;
    this.isOverflowing = el.scrollWidth > el.clientWidth;
  }

  updateVisibleLanes() {
    const el = this.canvasEl;
    if (!el) return;
    const lanes = el.querySelectorAll<HTMLElement>('[data-lane-id]');
    const visible: string[] = [];
    const rect = el.getBoundingClientRect();
    lanes.forEach((lane) => {
      const lr = lane.getBoundingClientRect();
      if (lr.right > rect.left && lr.left < rect.right) {
        const id = lane.getAttribute('data-lane-id');
        if (id) visible.push(id);
      }
    });
    this.visibleLanes = visible;
  }

  scrollToLane(laneId: string) {
    const el = this.canvasEl;
    if (!el) return;
    const target = el.querySelector<HTMLElement>(`[data-lane-id="${laneId}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
  }

  setupEffects() {
    $effect(() => {
      const el = this.canvasEl;
      if (!el) return;

      const handleScroll = () => this.updateVisibleLanes();
      const ro = new ResizeObserver(() => {
        this.updateOverflow();
        this.updateVisibleLanes();
      });

      el.addEventListener('scroll', handleScroll, { passive: true });
      ro.observe(el);

      this.updateOverflow();
      this.updateVisibleLanes();

      return () => {
        el.removeEventListener('scroll', handleScroll);
        ro.disconnect();
      };
    });
  }
}

export const canvasState = new CanvasState();
