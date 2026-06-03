import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '~/utils/cn';

const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn('relative h-1 w-full overflow-hidden rounded-[2px] bg-bg-3', className)}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full rounded-[2px] bg-fill-pop transition-[width] duration-150 ease-in-out"
      style={{ width: `${value ?? 0}%` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = 'Progress';

export { Progress };
