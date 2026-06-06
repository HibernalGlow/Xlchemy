<script lang="ts">
  import { cn } from '$lib/utils/cn';

  interface Props {
    value?: string;
    type?: string;
    placeholder?: string;
    class?: string;
    onchange?: (e: Event) => void;
    oninput?: (e: Event) => void;
    disabled?: boolean;
  }

  let {
    value = $bindable(''),
    type = 'text',
    placeholder = '',
    class: className = '',
    onchange,
    oninput,
    disabled = false,
  }: Props = $props();
</script>

<input
  {type}
  bind:value
  {placeholder}
  {disabled}
  {onchange}
  {oninput}
  class={cn(
    'flex h-7 w-full rounded-gb border border-[color-mix(in_oklch,var(--border-2)_70%,transparent)] bg-[color-mix(in_oklch,var(--bg-1)_82%,transparent)] px-2 text-xs text-text-1',
    'backdrop-blur-sm shadow-[inset_0_1px_0_var(--highlight)]',
    'transition-[border-color,box-shadow] duration-50 ease-in-out',
    'file:border-0 file:bg-transparent file:text-xs file:font-medium',
    'placeholder:text-text-2',
    'focus-visible:outline-none focus-visible:border-fill-pop focus-visible:ring-2 focus-visible:ring-fill-pop focus-visible:ring-offset-1 focus-visible:ring-offset-bg-1',
    'disabled:cursor-not-allowed disabled:opacity-50',
    className,
  )}
/>
