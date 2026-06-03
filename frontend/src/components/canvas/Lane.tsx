import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Resizer } from '~/components/resizer/Resizer';
import { CollapsedLane } from './CollapsedLane';
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
  /** Minimum width in rem */
  minWidth?: number;
  /** Maximum width in rem */
  maxWidth?: number;
  onWidthChange?: (w: number) => void;
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
}) => {
  const laneRef = React.useRef<HTMLDivElement>(null);

  if (collapsed) {
    return <CollapsedLane title={title} icon={icon} onExpand={onToggleCollapse} />;
  }

  return (
    <div
      className="lane"
      data-lane-id={id}
      ref={laneRef}
      style={{ width: `${width}rem`, minWidth: `${minWidth}rem` }}
    >
      {/* Lane Header */}
      <div className="lane__header">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {icon && <span className="text-text-2 shrink-0">{icon}</span>}
          <span className="text-xs font-semibold text-text-1 truncate">{title}</span>
        </div>
        <button
          type="button"
          className="flex items-center justify-center w-5 h-5 rounded text-text-2 hover:text-text-1 hover:bg-[var(--bg-3)]/50 transition-colors shrink-0 cursor-pointer"
          onClick={onToggleCollapse}
          title={`Collapse ${title}`}
        >
          <ChevronLeft className="w-3 h-3" />
        </button>
      </div>

      {/* Lane Content */}
      <div className="lane__content">
        {children}
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
