<script lang="ts">
  import { tick } from 'svelte';
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
  let hoveredValue = $state<string | null>(null);

  const selectedLabel = $derived(options.find((o) => o.value === value)?.label || '');

  function portal(node: HTMLElement) {
    document.body.appendChild(node);

    return {
      destroy() {
        node.remove();
      },
    };
  }

  function buildPanelStyle() {
    if (!rootEl) return '';
    const rect = rootEl.getBoundingClientRect();

    const margin = 8;
    const viewportWidth = window.innerWidth;
    const desiredWidth = Math.max(rect.width, panelEl?.offsetWidth ?? rect.width);
    const maxWidth = Math.max(120, viewportWidth - margin * 2);
    const width = Math.min(desiredWidth, maxWidth);
    const left = Math.min(
      Math.max(margin, rect.left),
      Math.max(margin, viewportWidth - width - margin),
    );
    const top = Math.max(margin, rect.bottom + 6);
    const maxHeight = Math.max(140, window.innerHeight - top - margin);

    return `position:fixed;top:${top}px;left:${left}px;min-width:${rect.width}px;max-width:${maxWidth}px;max-height:${maxHeight}px;z-index:9999;`;
  }

  function updatePanelPosition() {
    panelStyle = buildPanelStyle();
  }

  async function syncPanelPosition() {
    updatePanelPosition();
    await tick();
    updatePanelPosition();
    requestAnimationFrame(() => updatePanelPosition());
  }

  async function toggleOpen() {
    if (disabled) return;
    if (open) {
      open = false;
      hoveredValue = null;
      return;
    }

    panelStyle = buildPanelStyle();
    open = true;
    await syncPanelPosition();
  }

  function handleSelect(v: string) {
    value = v;
    onChange?.(v);
    open = false;
    hoveredValue = null;
  }

  function handleClickOutside(e: MouseEvent) {
    if (rootEl && !rootEl.contains(e.target as Node) && panelEl && !panelEl.contains(e.target as Node)) {
      open = false;
      hoveredValue = null;
    }
  }

  $effect(() => {
    if (!open) return;

    void syncPanelPosition();
    const handleViewportChange = () => updatePanelPosition();
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  });
</script>

<div bind:this={rootEl} class={cn('relative inline-block', className)}>
  <button
    type="button"
    {disabled}
    onclick={toggleOpen}
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
    <div
      bind:this={panelEl}
      use:portal
      class="overflow-hidden rounded-[14px] border border-[color-mix(in_oklch,var(--border-2)_70%,transparent)] bg-[color-mix(in_oklch,var(--bg-1)_92%,transparent)] shadow-[0_18px_36px_rgba(15,23,42,0.14)] backdrop-blur-xl"
      style={panelStyle}
      onmouseleave={() => (hoveredValue = null)}
    >
      <div class="p-1">
        {#each options as option}
          <button
            type="button"
            onclick={() => handleSelect(option.value)}
            onmouseenter={() => (hoveredValue = option.value)}
            onfocus={() => (hoveredValue = option.value)}
            class={cn(
              'relative flex h-7 w-full cursor-default select-none items-center rounded-[4px] pr-8 pl-2 text-xs text-text-1 outline-none',
              'transition-colors duration-50',
              hoveredValue === option.value && 'bg-secondary text-secondary-foreground',
              hoveredValue !== option.value && option.value === value && 'bg-[color-mix(in_oklch,var(--fill-pop-bg)_14%,transparent)]',
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
