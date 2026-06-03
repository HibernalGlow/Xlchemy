import * as React from 'react';

interface LaneContainerProps {
  children: React.ReactNode;
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

export const LaneContainer: React.FC<LaneContainerProps> = ({
  children,
  canvasRef,
}) => {
  return (
    <div className="canvas-container" ref={canvasRef as React.Ref<HTMLDivElement>}>
      <div className="lanes-scrollable">
        {children}
      </div>
    </div>
  );
};
