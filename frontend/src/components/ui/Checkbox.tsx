import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '~/utils/cn';

const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer h-4 w-4 shrink-0 rounded-[4px] border border-border-2',
      'bg-transparent',
      'transition-[color,background-color,border-color] duration-50 ease-in-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fill-pop focus-visible:ring-offset-1 focus-visible:ring-offset-bg-1',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:bg-fill-pop data-[state=checked]:border-fill-pop data-[state=checked]:text-bg-2',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      <Check className="h-3 w-3" strokeWidth={3} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = 'Checkbox';

export { Checkbox };
