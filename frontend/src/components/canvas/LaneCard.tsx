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
  noshrink?: boolean;
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

/**
 * GitButler-style Drawer component.
 * - PreviewHeader (42px) with chevron + header + actions
 * - Independently scrollable content
 * - Container query on content wrapper
 * - Collapsed: margin-bottom -1px for border collapse
 */
export const LaneCard: React.FC<LaneCardProps> = ({
  id,
  header,
  children,
  defaultCollapsed = false,
  showBorder = true,
  grow = false,
  noshrink = false,
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
        'drawer',
        grow && 'drawer--grow',
        noshrink && 'drawer--noshrink',
        collapsed && 'drawer--collapsed',
        showBorder && !collapsed && 'drawer--border',
        className,
      )}
    >
      {/* PreviewHeader (GitButler style: 42px, bg-2, border-bottom) */}
      <div className="drawer-header">
        <div className="drawer-header__title">
          <button
            type="button"
            className={cn('drawer-chevron', !collapsed && 'drawer-chevron--expanded')}
            onClick={handleToggle}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <span className="drawer-header__text">{header}</span>
        </div>
        {actions && (
          <div className="drawer-header__actions" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      {!collapsed && (
        <div className="drawer-scroll">
          <div className="drawer__content">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};
