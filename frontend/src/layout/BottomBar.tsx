import * as React from 'react';
import { X } from 'lucide-react';
import { Button } from '~/components/ui/Button';
import { Badge } from '~/components/ui/Badge';
import { Progress } from '~/components/ui/Progress';
import { cn } from '~/utils/cn';

interface BottomBarProps {
  isConverting: boolean;
  progress: { completed: number; total: number; line1: string; line2: string };
  fileCount: number;
  exceptionCount: number;
  onConvert: () => void;
  onCancel: () => void;
  onShowExceptions: () => void;
  disabled?: boolean;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  isConverting,
  progress,
  fileCount,
  exceptionCount,
  onConvert,
  onCancel,
  onShowExceptions,
  disabled = false,
}) => {
  const progressPercent =
    progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <footer
      className={cn(
        'flex items-center justify-between h-[48px] bg-[var(--bg-3)] border-t border-[var(--border-2)] px-[14px] shrink-0',
        disabled && 'opacity-50 pointer-events-none',
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {isConverting ? (
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex-1 min-w-[120px] max-w-[240px]">
              <Progress value={progressPercent} />
            </div>
            <span className="text-xs text-text-2 whitespace-nowrap">
              {progress.line1}
            </span>
            {progress.line2 && (
              <span className="text-xs text-text-3 whitespace-nowrap hidden sm:inline">
                {progress.line2}
              </span>
            )}
          </div>
        ) : (
          <>
            <Badge variant="secondary">
              {fileCount} {fileCount === 1 ? 'file' : 'files'}
            </Badge>
            {exceptionCount > 0 && (
              <Button
                kind="ghost"
                variant="error"
                size="sm"
                onClick={onShowExceptions}
              >
                {exceptionCount} {exceptionCount === 1 ? 'exception' : 'exceptions'}
              </Button>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isConverting ? (
          <Button
            kind="outline"
            variant="neutral"
            size="sm"
            onClick={onCancel}
          >
            <X className="h-3 w-3" />
            Cancel
          </Button>
        ) : (
          <Button
            kind="solid"
            variant="pop"
            size="default"
            onClick={onConvert}
            disabled={disabled}
          >
            Convert
          </Button>
        )}
      </div>
    </footer>
  );
};
