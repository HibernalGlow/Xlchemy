import * as React from 'react';
import { Resizer } from '~/components/resizer/Resizer';
import { CollapsedLane } from './CollapsedLane';
import { LaneDragHandle } from './LaneDragHandle';
import { setLaneDrag, clearDrag } from './dragState';
import { cn } from '~/utils/cn';

interface LaneProps {
  id: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  collapsed: boolean;
  onToggleCollapse: () => void;
  width: number; // rem
  showBorder?: boolean;
  minWidth?: number;
  maxWidth?: number;
  onWidthChange?: (w: number) => void;
  /** Lane ID currently being dragged over (from parent) */
  dragOverId?: string | null;
}

const LANE_RESIZER_CONFIG = {
  minWidth: 16,
  maxWidth: 40,
};

export const Lane: React.FC<LaneProps> = ({
  id,
  title,
  icon,
  children,
  collapsed,
  onToggleCollapse,
  width,
  showBorder = true,
  minWidth = LANE_RESIZER_CONFIG.minWidth,
  maxWidth = LANE_RESIZER_CONFIG.maxWidth,
  onWidthChange,
  dragOverId,
}) => {
  const laneRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragStart = React.useCallback(
    (e: React.DragEvent) => {
      const target = e.target as HTMLElement;

      // If the drag originates from a draggable card, let the card handle it
      const cardEl = target.closest?.('[data-card-id]');
      if (cardEl) {
        return; // card's own dragstart will fire
      }

      // Only allow drag from the drag handle area
      const handle = target.closest?.('.lane-drag-handle');
      if (!handle) {
        e.preventDefault();
        return;
      }

      setLaneDrag(id);
      e.dataTransfer.setData('text/x-lane-id', id);
      e.dataTransfer.effectAllowed = 'move';
      setIsDragging(true);
    },
    [id],
  );

  const handleDragEnd = React.useCallback(() => {
    setIsDragging(false);
    clearDrag();
  }, []);

  if (collapsed) {
    return (
      <CollapsedLane
        id={id}
        title={title}
        icon={icon}
        onExpand={onToggleCollapse}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        isDragging={isDragging}
      />
    );
  }

  const isDragOver = dragOverId === id;

  return (
    <div
      className={cn(
        'lane',
        isDragging && 'lane--dragging',
        isDragOver && !isDragging && 'lane--drag-over',
      )}
      data-lane-id={id}
      ref={laneRef}
      style={{ width: `${width}rem`, minWidth: `${minWidth}rem` }}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="stack-view">
        {/* Drag Handle */}
        <LaneDragHandle
          title={title}
          icon={icon}
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
        />

        {/* Lane Content: vertically stacked LaneCards */}
        <div className="stack-content">
          {children}
        </div>
      </div>

      {/* Right-side Resizer */}
      {laneRef.current && (
        <Resizer
          viewport={laneRef as React.RefObject<HTMLElement>}
          direction="right"
          minWidth={minWidth}
          maxWidth={maxWidth}
          defaultValue={width}
          showBorder={showBorder}
          syncName="lane-width"
          persistId={`lane-${id}-width`}
          onWidth={(w) => onWidthChange?.(w)}
        />
      )}
    </div>
  );
};
