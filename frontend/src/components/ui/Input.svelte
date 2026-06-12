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
    'flex h-7 w-full rounded-gb border border-border-2 bg-bg-1 px-2.5 text-[11px] text-text-1',
    'transition-[border-color,box-shadow] duration-50 ease-in-out',
    'file:border-0 file:bg-transparent file:text-xs file:font-medium',
    'placeholder:text-text-2',
    'focus-visible:outline-none focus-visible:border-fill-pop focus-visible:ring-2 focus-visible:ring-fill-pop focus-visible:ring-offset-1 focus-visible:ring-offset-bg-1',
    'disabled:cursor-not-allowed disabled:opacity-50',
    className,
  )}
/>
