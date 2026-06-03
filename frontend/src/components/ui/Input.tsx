import * as React from 'react';
import { cn } from '~/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-7 w-full rounded-gb border border-border-2 bg-bg-1 px-2 text-xs text-text-1',
          'transition-[border-color,box-shadow] duration-50 ease-in-out',
          'file:border-0 file:bg-transparent file:text-xs file:font-medium',
          'placeholder:text-text-2',
          'focus-visible:outline-none focus-visible:border-fill-pop focus-visible:ring-2 focus-visible:ring-fill-pop focus-visible:ring-offset-1 focus-visible:ring-offset-bg-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
