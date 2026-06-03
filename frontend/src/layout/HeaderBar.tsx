import * as React from 'react';
import { Badge } from '~/components/ui/Badge';
import { cn } from '~/utils/cn';

interface LaneTab {
  id: string;
  title: string;
  icon: React.ReactNode;
  active: boolean;
}

interface HeaderBarProps {
  version?: string;
  laneTabs?: LaneTab[];
  onLaneSelect?: (laneId: string) => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  version,
  laneTabs = [],
  onLaneSelect,
}) => {
  return (
    <header className="flex items-center h-[44px] bg-[var(--bg-3)] border-b border-[var(--border-2)] px-[14px] shrink-0 gap-3">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-fill-pop text-white font-bold text-sm">
          X
        </div>
        <span className="text-sm font-semibold text-text-1">Xlchemy</span>
        {version && (
          <Badge variant="secondary" className="text-[10px]">
            {version}
          </Badge>
        )}
      </div>

      {/* Drag region */}
      <div className="flex-1 h-full" data-tauri-drag-region />

      {/* Lane quick-nav pills */}
      {laneTabs.length > 0 && (
        <nav className="flex items-center gap-1 shrink-0">
          {laneTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer',
                tab.active
                  ? 'bg-fill-pop/15 text-fill-pop'
                  : 'text-text-2 hover:text-text-1 hover:bg-[var(--bg-1)]/60',
              )}
              onClick={() => onLaneSelect?.(tab.id)}
              title={tab.title}
            >
              <span className="w-3.5 h-3.5 flex items-center justify-center">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.title}</span>
            </button>
          ))}
        </nav>
      )}
    </header>
  );
};
