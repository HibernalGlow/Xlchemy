<script lang="ts">
  import { cn } from '$lib/utils/cn';

  interface Props {
    checked?: boolean;
    disabled?: boolean;
    class?: string;
    onCheckedChange?: (checked: boolean) => void;
  }

  let {
    checked = false,
    disabled = false,
    class: className = '',
    onCheckedChange,
  }: Props = $props();

  function toggle() {
    if (disabled) return;
    checked = !checked;
    onCheckedChange?.(checked);
  }
</script>

<button
  type="button"
  role="checkbox"
  aria-checked={checked}
  {disabled}
  onclick={toggle}
  class={cn(
    'inline-flex h-4 w-4 items-center justify-center rounded-[4px] border border-border-2 bg-bg-1',
    'transition-[background-color,border-color] duration-50 ease-in-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fill-pop focus-visible:ring-offset-1 focus-visible:ring-offset-bg-1',
    checked && 'border-fill-pop bg-fill-pop text-bg-2',
    disabled && 'cursor-not-allowed opacity-50',
    className,
  )}
>
  {#if checked}
    <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  {/if}
</button>
