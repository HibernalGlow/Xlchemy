<script lang="ts">
  import { ChevronDown, Check } from '@lucide/svelte';
  import { cn } from '$lib/utils/cn';

  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    value?: string;
    options?: Option[];
    placeholder?: string;
    class?: string;
    disabled?: boolean;
    onChange?: (value: string) => void;
  }

  let {
    value = $bindable(''),
    options = [],
    placeholder = '',
    class: className = '',
    disabled = false,
    onChange,
  }: Props = $props();

  let open = $state(false);
  let rootEl = $state<HTMLDivElement | null>(null);

  const selectedLabel = $derived(options.find((o) => o.value === value)?.label || '');

  function handleSelect(v: string) {
    value = v;
    onChange?.(v);
    open = false;
  }

  function handleClickOutside(e: MouseEvent) {
    if (rootEl && !rootEl.contains(e.target as Node)) {
      open = false;
    }
  }

  $effect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  });
</script>

<div bind:this={rootEl} class={cn('relative inline-block', className)}>
  <button
    type="button"
    {disabled}
    onclick={() => (open = !open)}
    class={cn(
      'flex h-7 w-full items-center justify-between gap-1.5 rounded-gb border border-border-2 bg-bg-1 px-2 text-xs text-text-1',
      'transition-[color,border-color] duration-50 ease-in-out',
      'focus:outline-none focus:ring-2 focus:ring-fill-pop focus:ring-offset-1 focus:ring-offset-bg-1',
      'disabled:cursor-not-allowed disabled:opacity-50',
      '[&>span]:truncate',
    )}
  >
    <span class="truncate">{selectedLabel || placeholder}</span>
    <ChevronDown class="h-3.5 w-3.5 shrink-0 text-text-2" />
  </button>

  {#if open}
    <div class="absolute z-50 mt-1 max-h-60 min-w-[8rem] overflow-hidden rounded-gb border border-border-2 bg-bg-1 shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
      <div class="p-1">
        {#each options as option}
          <button
            type="button"
            onclick={() => handleSelect(option.value)}
            class={cn(
              'relative flex h-7 w-full cursor-default select-none items-center rounded-[4px] pr-8 pl-2 text-xs text-text-1 outline-none',
              'transition-colors duration-50',
              'hover:bg-bg-3 hover:text-text-1',
              option.value === value && 'bg-bg-3',
            )}
          >
            <span class="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
              {#if option.value === value}
                <Check class="h-3.5 w-3.5" />
              {/if}
            </span>
            <span>{option.label}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
