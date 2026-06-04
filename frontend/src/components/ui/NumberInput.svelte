<script lang="ts">
  import { cn } from '$lib/utils/cn';

  interface Props {
    value?: number;
    onChange?: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    class?: string;
  }

  let {
    value = 0,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    label = '',
    class: className = '',
  }: Props = $props();

  function handleInput(e: Event) {
    const num = Number((e.currentTarget as HTMLInputElement).value);
    if (Number.isNaN(num)) return;
    const clamped = Math.min(max, Math.max(min, num));
    onChange?.(clamped);
  }
</script>

<div class={cn('flex items-center gap-2', className)}>
  {#if label}
    <span class="shrink-0 text-xs text-text-2">{label}</span>
  {/if}
  <input
    type="number"
    {min}
    {max}
    {step}
    value={value}
    oninput={handleInput}
    class={cn(
      'h-7 w-20 shrink-0 rounded-gb border border-border-2 bg-bg-1 px-2 text-center text-xs text-text-1',
      'transition-[border-color,box-shadow] duration-50 ease-in-out',
      'focus-visible:outline-none focus-visible:border-fill-pop focus-visible:ring-2 focus-visible:ring-fill-pop focus-visible:ring-offset-1 focus-visible:ring-offset-bg-1',
      '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
    )}
  />
</div>
