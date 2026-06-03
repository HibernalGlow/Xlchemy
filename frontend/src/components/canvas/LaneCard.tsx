import * as React from 'react';
import { ChevronRight, X, GripVertical } from 'lucide-react';
import { setCardDrag, clearDrag } from './dragState';
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
  /** Optional detail content shown in a side panel when expanded */
  detail?: React.ReactNode;
  /** Whether this card can be expanded to the side */
  expandable?: boolean;
  /** The lane ID this card belongs to (for cross-lane drag) */
  laneId?: string;
  /** Whether this card can be dragged to another lane */
  movable?: boolean;
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
 * Floating-style card with optional side-expansion and cross-lane dragging.
 * - PreviewHeader (42px) with chevron + title + actions
 * - Independently scrollable content
 * - When expanded, a detail panel drops down over the card content
 * - When movable, a grip handle allows dragging to another lane
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
  detail,
  expandable = false,
  laneId,
  movable = false,
}) => {
  const [collapsed, setCollapsed] = React.useState(() => loadCollapsed(id) || defaultCollapsed);
  const [expanded, setExpanded] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleToggle = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      saveCollapsed(id, next);
      return next;
    });
  }, [id]);

  const handleExpandToggle = React.useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  // Card drag for cross-lane movement
  const handleCardDragStart = React.useCallback(
    (e: React.DragEvent) => {
      if (!movable || !laneId) {
        e.preventDefault();
        return;
      }
      // Only allow drag from the grip area
      const grip = (e.target as HTMLElement).closest?.('.card-grip');
      if (!grip) {
        e.preventDefault();
        return;
      }
      e.stopPropagation(); // prevent lane's dragstart
      setCardDrag(id, laneId);
      e.dataTransfer.setData('text/x-card-id', id);
      e.dataTransfer.effectAllowed = 'move';
      setIsDragging(true);
    },
    [id, laneId, movable],
  );

  const handleCardDragEnd = React.useCallback(() => {
    setIsDragging(false);
    clearDrag();
  }, []);

  const showDetail = expandable && !!detail && expanded && !collapsed;

  return (
    <div
      className={cn(
        'drawer',
        grow && 'drawer--grow',
        noshrink && 'drawer--noshrink',
        collapsed && 'drawer--collapsed',
        showBorder && !collapsed && 'drawer--border',
        showDetail && 'drawer--expanded',
        isDragging && 'drawer--dragging',
        className,
      )}
      data-card-id={movable ? id : undefined}
      draggable={movable || undefined}
      onDragStart={movable ? handleCardDragStart : undefined}
      onDragEnd={movable ? handleCardDragEnd : undefined}
    >
      {/* PreviewHeader (42px, bg-2, border-bottom) */}
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
          {/* Card move grip (visible when movable) */}
          {movable && (
            <span className="card-grip" title="Drag to another lane">
              <GripVertical className="w-3 h-3.5" />
            </span>
          )}
        </div>
        {actions && (
          <div className="drawer-header__actions" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
        {expandable && !collapsed && (
          <button
            type="button"
            className="drawer-chevron"
            onClick={handleExpandToggle}
            title={expanded ? 'Collapse detail' : 'Expand detail'}
            style={{
              marginLeft: 'auto',
              color: expanded ? 'var(--fill-pop-bg)' : undefined,
              transform: expanded ? 'rotate(90deg)' : 'rotate(-90deg)',
            }}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
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

      {/* Side detail panel (absolute, drops down within card) */}
      {expandable && detail && showDetail && (
        <div className="drawer-detail">
          <button
            type="button"
            className="drawer-detail__close"
            onClick={() => setExpanded(false)}
            title="Close detail"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="drawer-detail__inner">
            {detail}
          </div>
        </div>
      )}
    </div>
  );
};
