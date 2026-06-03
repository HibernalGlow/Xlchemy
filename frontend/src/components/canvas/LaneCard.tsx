import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '~/utils/cn';

interface LaneCardProps {
  id: string;
  header: React.ReactNode;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  persistId?: string;
  showBorder?: boolean;
  grow?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

function loadCollapsed(id: string): boolean {
  try {
    return localStorage.getItem(`xlchemy-card-${id}`) === 'true';
  } catch {
    return false;
  }
}

function saveCollapsed(id: string, v: boolean) {
  try {
    localStorage.setItem(`xlchemy-card-${id}`, String(v));
  } catch { /* ignore */ }
}

export const LaneCard: React.FC<LaneCardProps> = ({
  id,
  header,
  children,
  defaultCollapsed = false,
  showBorder = true,
  grow = false,
  actions,
  className,
}) => {
  const [collapsed, setCollapsed] = React.useState(() => loadCollapsed(id) || defaultCollapsed);

  const handleToggle = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      saveCollapsed(id, next);
      return next;
    });
  }, [id]);

  return (
    <div
      className={cn(
        'flex flex-col bg-[var(--bg-1)] w-full',
        grow && 'flex-1 min-h-0',
        !grow && 'flex-shrink-0',
        collapsed && 'flex-shrink-0',
        showBorder && 'border-b border-[var(--border-2)]',
        className,
      )}
    >
      {/* Card Header */}
      <button
        type="button"
        className="flex items-center gap-1.5 px-3 py-2 w-full text-left cursor-pointer hover:bg-[var(--bg-3)]/30 transition-colors shrink-0"
        onClick={handleToggle}
      >
        <ChevronRight
          className={cn(
            'w-3.5 h-3.5 text-text-2 shrink-0 transition-transform duration-150',
            !collapsed && 'rotate-90',
          )}
        />
        <span className="text-xs font-medium text-text-1 flex-1 min-w-0">{header}</span>
        {actions && (
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </button>

      {/* Card Content */}
      {!collapsed && (
        <div className={cn('px-3 pb-3', grow && 'flex-1 min-h-0 overflow-auto')}>
          {children}
        </div>
      )}
    </div>
  );
};
