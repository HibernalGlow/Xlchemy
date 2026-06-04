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
  let panelEl = $state<HTMLDivElement | null>(null);
  let panelStyle = $state('');

  const selectedLabel = $derived(options.find((o) => o.value === value)?.label || '');

  function updatePanelPosition() {
    if (!rootEl || !panelEl) return;
    const rect = rootEl.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    panelStyle = `position:fixed;top:${rect.bottom + scrollY}px;left:${rect.left + scrollX}px;min-width:${rect.width}px;z-index:9999;`;
  }

  function handleSelect(v: string) {
    value = v;
    onChange?.(v);
    open = false;
  }

  function handleClickOutside(e: MouseEvent) {
    if (rootEl && !rootEl.contains(e.target as Node) && panelEl && !panelEl.contains(e.target as Node)) {
      open = false;
    }
  }

  $effect(() => {
    if (open) {
      updatePanelPosition();
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
      'flex h-7 w-full items-center justify-between gap-1.5 rounded-gb border border-[color-mix(in_oklch,var(--border-2)_70%,transparent)] bg-[color-mix(in_oklch,var(--bg-1)_82%,transparent)] px-2 text-xs text-text-1',
      'backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]',
      'transition-[color,border-color,box-shadow] duration-50 ease-in-out',
      'focus:outline-none focus:ring-2 focus:ring-fill-pop focus:ring-offset-1 focus:ring-offset-bg-1',
      'disabled:cursor-not-allowed disabled:opacity-50',
      '[&>span]:truncate',
    )}
  >
    <span class="truncate">{selectedLabel || placeholder}</span>
    <ChevronDown class="h-3.5 w-3.5 shrink-0 text-text-2" />
  </button>

  {#if open}
    <div bind:this={panelEl} class="max-h-60 overflow-hidden rounded-[14px] border border-[color-mix(in_oklch,var(--border-2)_70%,transparent)] bg-[color-mix(in_oklch,var(--bg-1)_92%,transparent)] shadow-[0_18px_36px_rgba(15,23,42,0.14)] backdrop-blur-xl" style={panelStyle}>
      <div class="p-1">
        {#each options as option}
          <button
            type="button"
            onclick={() => handleSelect(option.value)}
            class={cn(
              'relative flex h-7 w-full cursor-default select-none items-center rounded-[4px] pr-8 pl-2 text-xs text-text-1 outline-none',
              'transition-colors duration-50',
              'hover:bg-[color-mix(in_oklch,var(--bg-3)_66%,white_34%)] hover:text-text-1',
              option.value === value && 'bg-[color-mix(in_oklch,var(--fill-pop-bg)_14%,transparent)]',
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
