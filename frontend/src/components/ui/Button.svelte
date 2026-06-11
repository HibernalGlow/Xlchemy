<script lang="ts">
  import { cva } from 'class-variance-authority';
  import { cn } from '$lib/utils/cn';

  type ComponentKind = 'solid' | 'outline' | 'ghost';
  type ComponentColor = 'neutral' | 'pop' | 'success' | 'error' | 'warning';
  type ComponentSize = 'sm' | 'default' | 'icon';

  interface Props {
    kind?: ComponentKind;
    variant?: ComponentColor;
    size?: ComponentSize;
    disabled?: boolean;
    class?: string;
    title?: string;
    onclick?: (e: MouseEvent) => void;
    type?: 'button' | 'submit' | 'reset';
    children?: import('svelte').Snippet;
  }

  let {
    kind = 'solid',
    variant = 'neutral',
    size = 'default',
    disabled = false,
    class: className = '',
    title = '',
    onclick,
    type = 'button',
    children,
  }: Props = $props();

  const solidMap: Record<ComponentColor, string> = {
    neutral: 'border-[color-mix(in_oklch,var(--border-2)_68%,transparent)] bg-[linear-gradient(180deg,color-mix(in_oklch,var(--bg-1)_98%,transparent),color-mix(in_oklch,var(--bg-1)_84%,var(--surface-ornament)))] text-text-1 hover:bg-[linear-gradient(180deg,color-mix(in_oklch,var(--bg-1)_100%,transparent),color-mix(in_oklch,var(--bg-1)_88%,var(--fill-pop-soft)))] active:bg-[color-mix(in_oklch,var(--bg-3)_82%,white_18%)]',
    pop: 'border-[color-mix(in_oklch,var(--fill-pop-bg)_58%,white_12%)] bg-[linear-gradient(180deg,color-mix(in_oklch,var(--fill-pop-bg)_95%,white_5%),color-mix(in_oklch,var(--fill-pop-bg)_76%,var(--bg-3)_24%))] text-white hover:shadow-[0_14px_30px_rgba(34,211,238,0.18)] active:bg-[linear-gradient(180deg,color-mix(in_oklch,var(--fill-pop-bg)_88%,white_12%),color-mix(in_oklch,var(--fill-pop-bg)_70%,var(--bg-3)_30%))]',
    success: 'bg-[oklch(0.55_0.15_145)] text-white hover:bg-[color-mix(in_oklch,oklch(0.55_0.15_145)_85%,white)] active:bg-[color-mix(in_oklch,oklch(0.55_0.15_145)_75%,white)]',
    error: 'bg-[oklch(0.55_0.22_25)] text-white hover:bg-[color-mix(in_oklch,oklch(0.55_0.22_25)_85%,white)] active:bg-[color-mix(in_oklch,oklch(0.55_0.22_25)_75%,white)]',
    warning: 'bg-[oklch(0.70_0.15_75)] text-bg-2 hover:bg-[color-mix(in_oklch,oklch(0.70_0.15_75)_85%,white)] active:bg-[color-mix(in_oklch,oklch(0.70_0.15_75)_75%,white)]',
  };

  const outlineMap: Record<ComponentColor, string> = {
    neutral: 'border-[color-mix(in_oklch,var(--border-2)_72%,transparent)] text-[color-mix(in_oklch,var(--text-1)_72%,var(--text-2))] bg-[color-mix(in_oklch,var(--bg-1)_70%,transparent)] hover:bg-[color-mix(in_oklch,var(--bg-1)_92%,transparent)] hover:text-text-1 active:bg-[color-mix(in_oklch,var(--bg-3)_82%,white_18%)]',
    pop: 'border-[color-mix(in_oklch,var(--fill-pop-bg)_55%,transparent)] text-[color-mix(in_oklch,var(--fill-pop-bg)_84%,var(--text-1)_16%)] bg-[color-mix(in_oklch,var(--fill-pop-bg)_10%,transparent)] hover:bg-[color-mix(in_oklch,var(--fill-pop-bg)_18%,transparent)] active:bg-[color-mix(in_oklch,var(--fill-pop-bg)_24%,transparent)]',
    success: 'border-[oklch(0.55_0.15_145)] text-[oklch(0.55_0.15_145)] bg-transparent hover:bg-[color-mix(in_oklch,oklch(0.55_0.15_145)_12%,transparent)] active:bg-[color-mix(in_oklch,oklch(0.55_0.15_145)_20%,transparent)]',
    error: 'border-[oklch(0.55_0.22_25)] text-[oklch(0.55_0.22_25)] bg-transparent hover:bg-[color-mix(in_oklch,oklch(0.55_0.22_25)_12%,transparent)] active:bg-[color-mix(in_oklch,oklch(0.55_0.22_25)_20%,transparent)]',
    warning: 'border-[oklch(0.70_0.15_75)] text-[oklch(0.70_0.15_75)] bg-transparent hover:bg-[color-mix(in_oklch,oklch(0.70_0.15_75)_12%,transparent)] active:bg-[color-mix(in_oklch,oklch(0.70_0.15_75)_20%,transparent)]',
  };

  const ghostMap: Record<ComponentColor, string> = {
    neutral: 'border-transparent text-text-2 bg-transparent hover:bg-[color-mix(in_oklch,var(--bg-1)_78%,transparent)] hover:text-text-1 active:bg-[color-mix(in_oklch,var(--bg-3)_82%,white_18%)]',
    pop: 'border-transparent text-fill-pop bg-transparent hover:bg-[color-mix(in_oklch,var(--fill-pop-bg)_12%,transparent)] active:bg-[color-mix(in_oklch,var(--fill-pop-bg)_20%,transparent)]',
    success: 'border-transparent text-[oklch(0.55_0.15_145)] bg-transparent hover:bg-[color-mix(in_oklch,oklch(0.55_0.15_145)_12%,transparent)] active:bg-[color-mix(in_oklch,oklch(0.55_0.15_145)_20%,transparent)]',
    error: 'border-transparent text-[oklch(0.55_0.22_25)] bg-transparent hover:bg-[color-mix(in_oklch,oklch(0.55_0.22_25)_12%,transparent)] active:bg-[color-mix(in_oklch,oklch(0.55_0.22_25)_20%,transparent)]',
    warning: 'border-transparent text-[oklch(0.70_0.15_75)] bg-transparent hover:bg-[color-mix(in_oklch,oklch(0.70_0.15_75)_12%,transparent)] active:bg-[color-mix(in_oklch,oklch(0.70_0.15_75)_20%,transparent)]',
  };

  const buttonVariants = cva(
    [
      'inline-flex items-center justify-center gap-1.5',
      'font-sans text-[11px] font-semibold tracking-[0.01em]',
      'rounded-gb border',
      'backdrop-blur-sm shadow-[0_1px_0_var(--highlight)_inset,0_10px_22px_rgba(var(--shadow-color-rgb),0.08)]',
      'transition-[color,background-color,border-color,box-shadow,transform] duration-100 ease-in-out',
      'hover:-translate-y-px active:translate-y-0',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fill-pop focus-visible:ring-offset-1 focus-visible:ring-offset-bg-1',
      'disabled:pointer-events-none disabled:opacity-50',
    ],
    {
      variants: {
        kind: { solid: '', outline: '', ghost: '' },
        variant: { neutral: '', pop: '', success: '', error: '', warning: '' },
        size: {
          default: 'h-8 px-3',
          sm: 'h-7 px-2.5',
          icon: 'h-8 w-8 p-0',
        },
      },
      compoundVariants: [
        { kind: 'solid', variant: 'neutral', class: solidMap.neutral },
        { kind: 'solid', variant: 'pop', class: solidMap.pop },
        { kind: 'solid', variant: 'success', class: solidMap.success },
        { kind: 'solid', variant: 'error', class: solidMap.error },
        { kind: 'solid', variant: 'warning', class: solidMap.warning },
        { kind: 'outline', variant: 'neutral', class: outlineMap.neutral },
        { kind: 'outline', variant: 'pop', class: outlineMap.pop },
        { kind: 'outline', variant: 'success', class: outlineMap.success },
        { kind: 'outline', variant: 'error', class: outlineMap.error },
        { kind: 'outline', variant: 'warning', class: outlineMap.warning },
        { kind: 'ghost', variant: 'neutral', class: ghostMap.neutral },
        { kind: 'ghost', variant: 'pop', class: ghostMap.pop },
        { kind: 'ghost', variant: 'success', class: ghostMap.success },
        { kind: 'ghost', variant: 'error', class: ghostMap.error },
        { kind: 'ghost', variant: 'warning', class: ghostMap.warning },
      ],
      defaultVariants: { kind: 'solid', variant: 'neutral', size: 'default' },
    },
  );
</script>

<button
  class={cn(buttonVariants({ kind, variant, size }), className)}
  {disabled}
  {onclick}
  {type}
  {title}
>
  {@render children?.()}
</button>
