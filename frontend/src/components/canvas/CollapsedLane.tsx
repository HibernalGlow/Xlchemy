import * as React from 'react';
import { cn } from '~/utils/cn';

interface CollapsedLaneProps {
  title: string;
  icon?: React.ReactNode;
  onExpand: () => void;
}

export const CollapsedLane: React.FC<CollapsedLaneProps> = ({
  title,
  icon,
  onExpand,
}) => {
  return (
    <div
      className="collapsed-lane"
      role="presentation"
    >
      <button
        type="button"
        className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-[var(--bg-3)]/40 transition-colors gap-2 py-3"
        onClick={onExpand}
        title={`Expand ${title}`}
      >
        {icon && <span className="text-text-2">{icon}</span>}
        <span
          className="text-[11px] text-text-2 font-medium tracking-wide whitespace-nowrap"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          {title}
        </span>
      </button>
    </div>
  );
};
