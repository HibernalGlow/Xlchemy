import * as React from 'react';
import { Resizer } from '~/components/resizer/Resizer';
import { CollapsedLane } from './CollapsedLane';
import { LaneDragHandle } from './LaneDragHandle';

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
      <div className="stack-view">
        {/* GitButler-style Drag Handle (replaces header bar) */}
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
