import * as React from 'react';
import {
  FileOutput,
} from 'lucide-react';
import { HeaderBar } from '~/layout/HeaderBar';
import { BottomBar } from '~/layout/BottomBar';
import { LaneContainer } from './LaneContainer';
import { Lane } from './Lane';
import { CustomScrollbar } from './CustomScrollbar';
import { useCanvasState } from '~/hooks/useCanvasState';

export interface LaneConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface CanvasChromeProps {
  lanes: LaneConfig[];
  collapsedLanes: Set<string>;
  onToggleCollapse: (id: string) => void;
  laneWidth: number;
  onLaneWidthChange: (w: number) => void;
  onReorderLanes?: (fromId: string, toId: string) => void;
  onMoveCard?: (cardId: string, fromLaneId: string, toLaneId: string) => void;
  version?: string;
  isConverting: boolean;
  progress: { completed: number; total: number; line1: string; line2: string };
  fileCount: number;
  exceptionCount: number;
  onConvert: () => void;
  onCancel: () => void;
  onShowExceptions: () => void;
  visibleLanes?: string[];
  onScrollToLane?: (laneId: string) => void;
}

export const CanvasChrome: React.FC<CanvasChromeProps> = ({
  lanes,
  collapsedLanes,
  onToggleCollapse,
  laneWidth,
  onLaneWidthChange,
  onReorderLanes,
  onMoveCard,
  version,
  isConverting,
  progress,
  fileCount,
  exceptionCount,
  onConvert,
  onCancel,
  onShowExceptions,
  visibleLanes: externalVisibleLanes,
  onScrollToLane,
}) => {
  const { canvasRef, visibleLanes, scrollToLane, dragOverId, setDragOverId } = useCanvasState();
  const activeVisible = externalVisibleLanes ?? visibleLanes;
  const handleScrollToLane = onScrollToLane ?? scrollToLane;

  return (
    <div className="flex flex-col h-screen canvas-bg text-text-1 select-none">
      <HeaderBar
        version={version}
        laneTabs={lanes.map((l) => ({
          id: l.id,
          title: l.title,
          icon: l.icon,
          active: activeVisible.includes(l.id),
        }))}
        onLaneSelect={handleScrollToLane}
      />

      <LaneContainer
        canvasRef={canvasRef}
        onReorderLanes={onReorderLanes}
        onMoveCard={onMoveCard}
        setDragOverId={setDragOverId}
      >
        {lanes.map((lane, i) => (
          <Lane
            key={lane.id}
            id={lane.id}
            title={lane.title}
            icon={lane.icon}
            collapsed={collapsedLanes.has(lane.id)}
            onToggleCollapse={() => onToggleCollapse(lane.id)}
            width={laneWidth}
            showBorder={i < lanes.length - 1}
            onWidthChange={onLaneWidthChange}
            dragOverId={dragOverId}
          >
            {lane.content}
          </Lane>
        ))}

        {/* End spacer: convert action area when not converting */}
        {!isConverting && fileCount > 0 && (
          <div className="flex flex-col items-center justify-center p-6 shrink-0 opacity-40 min-w-[120px]">
            <button
              type="button"
              className="flex flex-col items-center gap-2 cursor-pointer text-text-2 hover:text-fill-pop transition-colors"
              onClick={onConvert}
            >
              <div className="w-12 h-12 rounded-xl border-2 border-dashed border-border-2 flex items-center justify-center">
                <FileOutput className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-medium">Convert</span>
            </button>
          </div>
        )}
      </LaneContainer>

      <CustomScrollbar viewport={canvasRef} />

      <BottomBar
        isConverting={isConverting}
        progress={progress}
        fileCount={fileCount}
        exceptionCount={exceptionCount}
        onConvert={onConvert}
        onCancel={onCancel}
        onShowExceptions={onShowExceptions}
        disabled={isConverting}
      />
    </div>
  );
};
