import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '~/utils/cn';

const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn('relative flex w-full touch-none select-none items-center', className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-[2px] bg-bg-3">
      <SliderPrimitive.Range className="absolute h-full bg-fill-pop" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className={cn(
        'block h-3.5 w-3.5 rounded-full bg-fill-pop border-2 border-white',
        'transition-[box-shadow] duration-50 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fill-pop focus-visible:ring-offset-1 focus-visible:ring-offset-bg-1',
        'disabled:pointer-events-none disabled:opacity-50',
      )}
    />
  </SliderPrimitive.Root>
));
Slider.displayName = 'Slider';

export { Slider };
