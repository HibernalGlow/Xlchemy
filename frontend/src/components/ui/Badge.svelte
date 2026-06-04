<script lang="ts">
  import { cva } from 'class-variance-authority';
  import { cn } from '$lib/utils/cn';

  interface Props {
    variant?: 'default' | 'secondary' | 'outline';
    class?: string;
    children?: import('svelte').Snippet;
  }

  let { variant = 'default', class: className = '', children }: Props = $props();

  const badgeVariants = cva(
    [
      'inline-flex items-center h-5 px-1.5 rounded-[4px] text-[11px] font-medium',
      'transition-[color,background-color,border-color] duration-50 ease-in-out',
    ],
    {
      variants: {
        variant: {
          default: 'bg-fill-pop text-bg-2',
          secondary: 'border border-[color-mix(in_oklch,var(--border-2)_60%,transparent)] bg-[color-mix(in_oklch,var(--bg-1)_70%,transparent)] text-text-1 shadow-[0_1px_0_rgba(255,255,255,0.65)_inset]',
          outline: 'border border-[color-mix(in_oklch,var(--border-2)_72%,transparent)] bg-[color-mix(in_oklch,var(--bg-1)_40%,transparent)] text-text-1',
        },
      },
      defaultVariants: { variant: 'default' },
    },
  );
</script>

<div class={cn(badgeVariants({ variant }), className)}>
  {@render children?.()}
</div>
