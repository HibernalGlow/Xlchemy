import * as React from 'react';
import { GripVertical, ChevronDown } from 'lucide-react';
import { cn } from '~/utils/cn';

interface LaneDragHandleProps {
  title: string;
  icon?: React.ReactNode;
  collapsed: boolean;
  onToggleCollapse: () => void;
  actions?: React.ReactNode;
}

/**
 * GitButler-style drag handle row (28px).
 * Replaces the old full-height lane header bar.
 * Contains: collapse button + drag grip + optional actions.
 */
export const LaneDragHandle: React.FC<LaneDragHandleProps> = ({
  title,
  icon,
  collapsed,
  onToggleCollapse,
  actions,
}) => {
  return (
    <div className="lane-drag-handle" draggable="false">
      {/* Left: collapse button */}
      <button
        type="button"
        className={cn(
          'lane-drag-handle__collapse',
          collapsed && 'lane-drag-handle__collapse--folded',
        )}
        onClick={onToggleCollapse}
        title={collapsed ? `Expand ${title}` : `Collapse ${title}`}
      >
        {/* Custom collapse SVG matching GitButler CollapseStackButton */}
        <svg
          className="lane-drag-handle__icon"
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
            className="lane-drag-handle__lane-rect"
            x="0.75"
            y="0.75"
            width="5"
            height="8"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </button>

      {/* Center: drag grip dots */}
      <div className="lane-drag-handle__grip">
        <GripVertical className="w-[10px] h-[14px]" />
      </div>

      {/* Lane title (subtle, between grip and actions) */}
      <span className="lane-drag-handle__title">{title}</span>

      {/* Right: optional actions */}
      {actions && (
        <div className="lane-drag-handle__actions">{actions}</div>
      )}
    </div>
  );
};
