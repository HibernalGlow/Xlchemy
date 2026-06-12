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
    neutral:
      'bg-bg-3 text-text-1 border-border-2 hover:bg-bg-2 active:bg-bg-1',
    pop: 'bg-fill-pop text-white border-transparent hover:brightness-110 active:brightness-95',
    success: 'bg-[oklch(0.55_0.15_145)] text-white border-transparent hover:brightness-110 active:brightness-95',
    error: 'bg-[oklch(0.55_0.22_25)] text-white border-transparent hover:brightness-110 active:brightness-95',
    warning: 'bg-[oklch(0.70_0.15_75)] text-bg-2 border-transparent hover:brightness-110 active:brightness-95',
  };

  const outlineMap: Record<ComponentColor, string> = {
    neutral:
      'bg-transparent border-border-2 text-text-1 hover:bg-bg-2 active:bg-bg-3',
    pop: 'bg-transparent border-fill-pop text-fill-pop hover:bg-fill-pop/10 active:bg-fill-pop/20',
    success: 'bg-transparent border-[oklch(0.55_0.15_145)] text-[oklch(0.55_0.15_145)] hover:bg-[oklch(0.55_0.15_145)]/10 active:bg-[oklch(0.55_0.15_145)]/20',
    error: 'bg-transparent border-[oklch(0.55_0.22_25)] text-[oklch(0.55_0.22_25)] hover:bg-[oklch(0.55_0.22_25)]/10 active:bg-[oklch(0.55_0.22_25)]/20',
    warning: 'bg-transparent border-[oklch(0.70_0.15_75)] text-[oklch(0.70_0.15_75)] hover:bg-[oklch(0.70_0.15_75)]/10 active:bg-[oklch(0.70_0.15_75)]/20',
  };

  const ghostMap: Record<ComponentColor, string> = {
    neutral:
      'bg-transparent border-transparent text-text-2 hover:bg-bg-2 hover:text-text-1 active:bg-bg-3',
    pop: 'bg-transparent border-transparent text-fill-pop hover:bg-fill-pop/10 active:bg-fill-pop/20',
    success: 'bg-transparent border-transparent text-[oklch(0.55_0.15_145)] hover:bg-[oklch(0.55_0.15_145)]/10 active:bg-[oklch(0.55_0.15_145)]/20',
    error: 'bg-transparent border-transparent text-[oklch(0.55_0.22_25)] hover:bg-[oklch(0.55_0.22_25)]/10 active:bg-[oklch(0.55_0.22_25)]/20',
    warning: 'bg-transparent border-transparent text-[oklch(0.70_0.15_75)] hover:bg-[oklch(0.70_0.15_75)]/10 active:bg-[oklch(0.70_0.15_75)]/20',
  };

  const buttonVariants = cva(
    [
      'inline-flex items-center justify-center gap-1',
      'font-sans text-[11px] font-semibold tracking-[0.01em]',
      'rounded-gb border',
      'transition-colors duration-100 ease-in-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fill-pop focus-visible:ring-offset-1 focus-visible:ring-offset-bg-1',
      'disabled:pointer-events-none disabled:opacity-50',
    ],
    {
      variants: {
        kind: { solid: '', outline: '', ghost: '' },
        variant: { neutral: '', pop: '', success: '', error: '', warning: '' },
        size: {
          default: 'h-7 px-2.5',
          sm: 'h-6 px-2',
          icon: 'h-7 w-7 p-0',
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
