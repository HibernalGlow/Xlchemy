import * as React from 'react';
import { cn } from '~/utils/cn';

interface ToggleGroupProps {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  disabled?: boolean;
  className?: string;
}

const ToggleGroup: React.FC<ToggleGroupProps> = ({
  options,
  value,
  onChange,
  disabled = false,
  className,
}) => {
  return (
    <div className={cn('inline-flex items-center gap-0.5', className)}>
      {options.map((option) => {
        const isSelected = option.key === value;
        return (
          <button
            key={option.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.key)}
            className={cn(
              'inline-flex h-6 items-center justify-center px-1.5 rounded-[4px] text-[11px] font-medium',
              'transition-[color,background-color,border-color] duration-50 ease-in-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fill-pop focus-visible:ring-offset-1 focus-visible:ring-offset-bg-1',
              'disabled:pointer-events-none disabled:opacity-50',
              isSelected
                ? 'bg-fill-pop text-bg-2'
                : 'bg-transparent text-text-2 hover:bg-ntrl-30 active:bg-ntrl-35',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

ToggleGroup.displayName = 'ToggleGroup';

export { ToggleGroup };
