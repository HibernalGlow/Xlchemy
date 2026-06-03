import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '~/utils/cn';

const badgeVariants = cva(
  [
    'inline-flex items-center h-5 px-1.5 rounded-[4px] text-[11px] font-medium',
    'transition-[color,background-color,border-color] duration-50 ease-in-out',
  ],
  {
    variants: {
      variant: {
        default: 'bg-fill-pop text-bg-2',
        secondary: 'bg-bg-3 text-text-1',
        outline: 'border border-border-2 bg-transparent text-text-1',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
