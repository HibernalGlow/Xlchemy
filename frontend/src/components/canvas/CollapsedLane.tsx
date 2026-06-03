import * as React from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '~/utils/cn';

interface CollapsedLaneProps {
  id?: string;
  title: string;
  icon?: React.ReactNode;
  onExpand: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}

/**
 * Collapsed/folded lane – vertical floating panel.
 * Shows a narrow strip with the lane title written vertically.
 */
export const CollapsedLane: React.FC<CollapsedLaneProps> = ({
  id,
  title,
  icon,
  onExpand,
  draggable,
  onDragStart,
  onDragEnd,
  isDragging,
}) => {
  return (
    <div
      className={cn('folded-lane', isDragging && 'folded-lane--dragging')}
      data-lane-id={id || ''}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {/* Collapse button (expand toggle) */}
      <button
        type="button"
        className="folded-lane__toggle"
        onClick={onExpand}
        title={`Expand ${title}`}
      >
        <svg
          className="folded-lane__collapse-icon"
          viewBox="0 0 15 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M11.75 0.75H2.75C1.64543 0.75 0.75 1.64543 0.75 2.75V6.75C0.75 7.85457 1.64543 8.75 2.75 8.75H11.75C12.8546 8.75 13.75 7.85457 13.75 6.75V2.75C13.75 1.64543 12.8546 0.75 11.75 0.75Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <rect
            className="folded-lane__collapse-rect"
            x="0.75"
            y="0.75"
            width="5"
            height="8"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="currentColor"
          />
        </svg>
      </button>

      {/* Drag handle dots */}
      <div className="folded-lane__grip">
        <GripVertical className="w-[10px] h-[14px]" />
      </div>

      {/* Vertical text with lane title */}
      <div className="folded-lane__text">
        {icon && <span className="folded-lane__icon">{icon}</span>}
        <span className="folded-lane__title">{title}</span>
      </div>
    </div>
  );
};
