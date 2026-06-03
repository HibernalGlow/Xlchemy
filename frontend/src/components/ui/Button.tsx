import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '~/utils/cn';

type ComponentKind = 'solid' | 'outline' | 'ghost';
type ComponentColor = 'neutral' | 'pop' | 'success' | 'error' | 'warning';
type ComponentSize = 'sm' | 'default' | 'icon';

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

/* ── Color maps ─────────────────────────────────────────────── */

const solidMap: Record<ComponentColor, string> = {
  neutral:
    'bg-ntrl-40 text-ntrl-100 hover:bg-[color-mix(in_oklch,var(--ntrl-40)_85%,white)] active:bg-[color-mix(in_oklch,var(--ntrl-40)_75%,white)]',
  pop: 'bg-fill-pop text-bg-2 hover:bg-[color-mix(in_oklch,var(--fill-pop-bg)_85%,white)] active:bg-[color-mix(in_oklch,var(--fill-pop-bg)_75%,white)]',
  success:
    'bg-[oklch(0.55_0.15_145)] text-white hover:bg-[color-mix(in_oklch,oklch(0.55_0.15_145)_85%,white)] active:bg-[color-mix(in_oklch,oklch(0.55_0.15_145)_75%,white)]',
  error:
    'bg-[oklch(0.55_0.22_25)] text-white hover:bg-[color-mix(in_oklch,oklch(0.55_0.22_25)_85%,white)] active:bg-[color-mix(in_oklch,oklch(0.55_0.22_25)_75%,white)]',
  warning:
    'bg-[oklch(0.70_0.15_75)] text-bg-2 hover:bg-[color-mix(in_oklch,oklch(0.70_0.15_75)_85%,white)] active:bg-[color-mix(in_oklch,oklch(0.70_0.15_75)_75%,white)]',
};

const outlineMap: Record<ComponentColor, string> = {
  neutral:
    'border-border-2 text-text-2 bg-transparent hover:bg-ntrl-30 active:bg-ntrl-35',
  pop: 'border-fill-pop text-fill-pop bg-transparent hover:bg-[color-mix(in_oklch,var(--fill-pop-bg)_12%,transparent)] active:bg-[color-mix(in_oklch,var(--fill-pop-bg)_20%,transparent)]',
  success:
    'border-[oklch(0.55_0.15_145)] text-[oklch(0.55_0.15_145)] bg-transparent hover:bg-[color-mix(in_oklch,oklch(0.55_0.15_145)_12%,transparent)] active:bg-[color-mix(in_oklch,oklch(0.55_0.15_145)_20%,transparent)]',
  error:
    'border-[oklch(0.55_0.22_25)] text-[oklch(0.55_0.22_25)] bg-transparent hover:bg-[color-mix(in_oklch,oklch(0.55_0.22_25)_12%,transparent)] active:bg-[color-mix(in_oklch,oklch(0.55_0.22_25)_20%,transparent)]',
  warning:
    'border-[oklch(0.70_0.15_75)] text-[oklch(0.70_0.15_75)] bg-transparent hover:bg-[color-mix(in_oklch,oklch(0.70_0.15_75)_12%,transparent)] active:bg-[color-mix(in_oklch,oklch(0.70_0.15_75)_20%,transparent)]',
};

const ghostMap: Record<ComponentColor, string> = {
  neutral:
    'border-transparent text-text-2 bg-transparent hover:bg-ntrl-30 active:bg-ntrl-35',
  pop: 'border-transparent text-fill-pop bg-transparent hover:bg-[color-mix(in_oklch,var(--fill-pop-bg)_12%,transparent)] active:bg-[color-mix(in_oklch,var(--fill-pop-bg)_20%,transparent)]',
  success:
    'border-transparent text-[oklch(0.55_0.15_145)] bg-transparent hover:bg-[color-mix(in_oklch,oklch(0.55_0.15_145)_12%,transparent)] active:bg-[color-mix(in_oklch,oklch(0.55_0.15_145)_20%,transparent)]',
  error:
    'border-transparent text-[oklch(0.55_0.22_25)] bg-transparent hover:bg-[color-mix(in_oklch,oklch(0.55_0.22_25)_12%,transparent)] active:bg-[color-mix(in_oklch,oklch(0.55_0.22_25)_20%,transparent)]',
  warning:
    'border-transparent text-[oklch(0.70_0.15_75)] bg-transparent hover:bg-[color-mix(in_oklch,oklch(0.70_0.15_75)_12%,transparent)] active:bg-[color-mix(in_oklch,oklch(0.70_0.15_75)_20%,transparent)]',
};

/* ── Variant resolver ───────────────────────────────────────── */

function resolveColorClass(
  kind: ComponentKind,
  variant: ComponentColor,
): string {
  const map =
    kind === 'solid' ? solidMap : kind === 'outline' ? outlineMap : ghostMap;
  return map[variant];
}

/* ── CVA ────────────────────────────────────────────────────── */

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-1.5',
    'font-sans text-xs font-medium',
    'rounded-gb border',
    'transition-[color,background-color,border-color] duration-50 ease-in-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fill-pop focus-visible:ring-offset-1 focus-visible:ring-offset-bg-1',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      kind: {
        solid: '',
        outline: '',
        ghost: '',
      },
      variant: {
        neutral: '',
        pop: '',
        success: '',
        error: '',
        warning: '',
      },
      size: {
        default: 'h-7 px-2.5',
        sm: 'h-6 px-2',
        icon: 'h-7 w-7 p-0',
      },
    },
    compoundVariants: [
      /* solid + color */
      { kind: 'solid', variant: 'neutral', class: solidMap.neutral },
      { kind: 'solid', variant: 'pop', class: solidMap.pop },
      { kind: 'solid', variant: 'success', class: solidMap.success },
      { kind: 'solid', variant: 'error', class: solidMap.error },
      { kind: 'solid', variant: 'warning', class: solidMap.warning },
      /* outline + color */
      { kind: 'outline', variant: 'neutral', class: outlineMap.neutral },
      { kind: 'outline', variant: 'pop', class: outlineMap.pop },
      { kind: 'outline', variant: 'success', class: outlineMap.success },
      { kind: 'outline', variant: 'error', class: outlineMap.error },
      { kind: 'outline', variant: 'warning', class: outlineMap.warning },
      /* ghost + color */
      { kind: 'ghost', variant: 'neutral', class: ghostMap.neutral },
      { kind: 'ghost', variant: 'pop', class: ghostMap.pop },
      { kind: 'ghost', variant: 'success', class: ghostMap.success },
      { kind: 'ghost', variant: 'error', class: ghostMap.error },
      { kind: 'ghost', variant: 'warning', class: ghostMap.warning },
    ],
    defaultVariants: {
      kind: 'solid',
      variant: 'neutral',
      size: 'default',
    },
  },
);

/* ── Component ──────────────────────────────────────────────── */

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, kind, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ kind, variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
export type { ButtonProps, ComponentKind, ComponentColor, ComponentSize };
