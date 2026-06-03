import * as React from 'react';

interface CustomScrollbarProps {
  viewport: React.RefObject<HTMLDivElement | null>;
}

export const CustomScrollbar: React.FC<CustomScrollbarProps> = ({ viewport }) => {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [thumbStyle, setThumbStyle] = React.useState<React.CSSProperties>({});
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStart = React.useRef({ x: 0, scrollLeft: 0 });

  const updateThumb = React.useCallback(() => {
    const el = viewport.current;
    const track = trackRef.current;
    if (!el || !track) return;

    const { scrollWidth, clientWidth, scrollLeft } = el;
    if (scrollWidth <= clientWidth) {
      setThumbStyle({ display: 'none' });
      return;
    }

    const trackWidth = track.clientWidth;
    const thumbWidth = Math.max((clientWidth / scrollWidth) * trackWidth, 40);
    const maxScroll = scrollWidth - clientWidth;
    const thumbLeft = (scrollLeft / maxScroll) * (trackWidth - thumbWidth);

    setThumbStyle({
      display: 'block',
      width: `${thumbWidth}px`,
      transform: `translateX(${thumbLeft}px)`,
    });
  }, [viewport]);

  // Observe scroll events
  React.useEffect(() => {
    const el = viewport.current;
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
  }, [viewport, updateThumb]);

  // Drag to scroll
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const el = viewport.current;
    if (!el) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, scrollLeft: el.scrollLeft };
  }, [viewport]);

  React.useEffect(() => {
    if (!isDragging) return;

    const el = viewport.current;
    const track = trackRef.current;
    if (!el || !track) return;

    const handleMouseMove = (e: MouseEvent) => {
      const { scrollWidth, clientWidth } = el;
      const trackWidth = track.clientWidth;
      const thumbWidth = Math.max((clientWidth / scrollWidth) * trackWidth, 40);
      const maxScroll = scrollWidth - clientWidth;
      const maxThumbTravel = trackWidth - thumbWidth;

      const dx = e.clientX - dragStart.current.x;
      const scrollDelta = (dx / maxThumbTravel) * maxScroll;
      el.scrollLeft = dragStart.current.scrollLeft + scrollDelta;
    };

    const handleMouseUp = () => setIsDragging(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, viewport]);

  return (
    <div className="custom-scrollbar" ref={trackRef}>
      <div
        className={cn(
          'custom-scrollbar__thumb',
          isDragging && 'custom-scrollbar__thumb--active',
        )}
        style={thumbStyle}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
};

function cn(...classes: (string | false | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
