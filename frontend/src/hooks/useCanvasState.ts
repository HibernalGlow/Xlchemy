import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Canvas-level state: manages the horizontal scroll container,
 * lane visibility tracking, and horizontal panning.
 */
export function useCanvasState() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [visibleLanes, setVisibleLanes] = useState<string[]>([]);

  // Check if content overflows the container
  const updateOverflow = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    setIsOverflowing(el.scrollWidth > el.clientWidth);
  }, []);

  // Track which lanes are visible in the viewport
  const updateVisibleLanes = useCallback(() => {
    const el = canvasRef.current;
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
    setVisibleLanes(visible);
  }, []);

  // Scroll to a specific lane smoothly
  const scrollToLane = useCallback((laneId: string) => {
    const el = canvasRef.current;
    if (!el) return;
    const target = el.querySelector<HTMLElement>(`[data-lane-id="${laneId}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
  }, []);

  // Observe scroll and resize events
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const handleScroll = () => {
      updateVisibleLanes();
    };

    const ro = new ResizeObserver(() => {
      updateOverflow();
      updateVisibleLanes();
    });

    el.addEventListener('scroll', handleScroll, { passive: true });
    ro.observe(el);

    // Initial check
    updateOverflow();
    updateVisibleLanes();

    return () => {
      el.removeEventListener('scroll', handleScroll);
      ro.disconnect();
    };
  }, [updateOverflow, updateVisibleLanes]);

  return {
    canvasRef,
    isOverflowing,
    visibleLanes,
    scrollToLane,
  };
}
