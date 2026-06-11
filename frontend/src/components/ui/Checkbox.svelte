<script lang="ts">
  import { cn } from '$lib/utils/cn';

  interface Props {
    checked?: boolean;
    indeterminate?: boolean;
    disabled?: boolean;
    class?: string;
    onCheckedChange?: (checked: boolean) => void;
  }

  let {
    checked = false,
    indeterminate = false,
    disabled = false,
    class: className = '',
    onCheckedChange,
  }: Props = $props();

  function toggle() {
    if (disabled) return;
    const nextChecked = indeterminate ? true : !checked;
    checked = nextChecked;
    onCheckedChange?.(nextChecked);
  }
</script>

<button
  type="button"
  role="checkbox"
  aria-checked={indeterminate ? 'mixed' : checked}
  {disabled}
  onclick={toggle}
  class={cn(
    'inline-flex h-4 w-4 items-center justify-center rounded-[6px] border border-[color-mix(in_oklch,var(--border-2)_72%,transparent)] bg-[linear-gradient(180deg,color-mix(in_oklch,var(--bg-1)_94%,transparent),color-mix(in_oklch,var(--bg-1)_84%,var(--surface-ornament)))]',
    'backdrop-blur-sm shadow-[inset_0_1px_0_var(--highlight)]',
    'transition-[background-color,border-color,box-shadow] duration-50 ease-in-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fill-pop focus-visible:ring-offset-1 focus-visible:ring-offset-bg-1',
    (checked || indeterminate) && 'border-fill-pop bg-[linear-gradient(180deg,color-mix(in_oklch,var(--fill-pop-bg)_96%,white_4%),color-mix(in_oklch,var(--fill-pop-bg)_76%,var(--bg-3)_24%))] text-bg-2',
    disabled && 'cursor-not-allowed opacity-50',
    className,
  )}
>
  {#if checked}
    <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  {:else if indeterminate}
    <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  {/if}
</button>
