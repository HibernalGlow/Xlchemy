import * as React from 'react';
import { Slider } from './Slider';
import { cn } from '~/utils/cn';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  label?: string;
  className?: string;
}

const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  className,
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '' || raw === '-') {
      return;
    }
    const num = Number(raw);
    if (!isNaN(num)) {
      onChange(Math.min(max, Math.max(min, num)));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const num = Number(e.target.value);
    if (isNaN(num)) {
      onChange(min);
    } else {
      onChange(Math.min(max, Math.max(min, num)));
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && (
        <span className="shrink-0 text-xs text-text-2">{label}</span>
      )}
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
        className="flex-1"
      />
      <input
        type="number"
        value={value}
        onChange={handleInputChange}
        onBlur={handleBlur}
        min={min}
        max={max}
        step={step}
        className={cn(
          'h-7 w-12 shrink-0 rounded-gb border border-border-2 bg-bg-1 px-1 text-center text-xs text-text-1',
          'transition-[border-color,box-shadow] duration-50 ease-in-out',
          'focus-visible:outline-none focus-visible:border-fill-pop focus-visible:ring-2 focus-visible:ring-fill-pop focus-visible:ring-offset-1 focus-visible:ring-offset-bg-1',
          '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
        )}
      />
    </div>
  );
};

NumberInput.displayName = 'NumberInput';

export { NumberInput };
