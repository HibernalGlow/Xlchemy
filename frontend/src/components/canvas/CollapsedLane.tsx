import * as React from 'react';
import { GripVertical } from 'lucide-react';

interface CollapsedLaneProps {
  title: string;
  icon?: React.ReactNode;
  onExpand: () => void;
}

/**
 * GitButler-style collapsed lane:
 * - Gradient background (bg-2 → bg-3)
 * - Vertical text (writing-mode: vertical-lr)
 * - Drag handle dots at top
 * - Custom collapse SVG button
 */
export const CollapsedLane: React.FC<CollapsedLaneProps> = ({
  title,
  icon,
  onExpand,
}) => {
  return (
    <div className="folded-lane">
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
