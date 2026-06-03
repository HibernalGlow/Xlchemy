import * as React from 'react';
import { getDragMode, getDragState, clearDrag } from './dragState';

interface LaneContainerProps {
  children: React.ReactNode;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onReorderLanes?: (fromId: string, toId: string) => void;
  onMoveCard?: (cardId: string, fromLaneId: string, toLaneId: string) => void;
  setDragOverId?: (id: string | null) => void;
}

export const LaneContainer: React.FC<LaneContainerProps> = ({
  children,
  canvasRef,
  onReorderLanes,
  onMoveCard,
  setDragOverId,
}) => {
  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    const mode = getDragMode();
    if (mode === 'none') return;

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const target = (e.target as HTMLElement).closest?.('[data-lane-id]') as HTMLElement | null;
    const id = target?.dataset?.laneId ?? null;
    setDragOverId?.(id);
  }, [setDragOverId]);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    // Only clear if we're actually leaving the container (not entering a child)
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as Node).contains(related)) return;
    setDragOverId?.(null);
  }, [setDragOverId]);

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const mode = getDragMode();
      const target = (e.target as HTMLElement).closest?.('[data-lane-id]') as HTMLElement | null;
      const toLaneId = target?.dataset?.laneId;

      if (mode === 'lane' && onReorderLanes) {
        const { laneId: fromId } = getDragState();
        if (fromId && toLaneId && fromId !== toLaneId) {
          onReorderLanes(fromId, toLaneId);
        }
      } else if (mode === 'card' && onMoveCard) {
        const { cardId, fromLaneId } = getDragState();
        if (cardId && fromLaneId && toLaneId && fromLaneId !== toLaneId) {
          onMoveCard(cardId, fromLaneId, toLaneId);
        }
      }

      clearDrag();
      setDragOverId?.(null);
    },
    [onReorderLanes, onMoveCard, setDragOverId],
  );

  return (
    <div
      className="canvas-container"
      ref={canvasRef as React.Ref<HTMLDivElement>}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="lanes-scrollable">
        {children}
      </div>
    </div>
  );
};
