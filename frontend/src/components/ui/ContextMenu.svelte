<script lang="ts">
  import { onMount } from 'svelte';

  export interface ContextMenuItem {
    id: string;
    label: string;
    icon?: any;
    separator?: boolean;
    disabled?: boolean;
  }

  interface Props {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onSelect?: (id: string) => void;
    onClose?: () => void;
  }

  let { x, y, items, onSelect, onClose }: Props = $props();

  let menuEl = $state<HTMLDivElement | null>(null);
  let adjustedX = $state(0);
  let adjustedY = $state(0);

  function updatePosition() {
    adjustedX = x;
    adjustedY = y;

    if (!menuEl) return;

    const rect = menuEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (rect.right > vw) adjustedX = Math.max(0, vw - rect.width - 4);
    if (rect.bottom > vh) adjustedY = Math.max(0, vh - rect.height - 4);
  }

  onMount(() => {
    updatePosition();

    function handleClickOutside(e: MouseEvent) {
      if (menuEl && !menuEl.contains(e.target as Node)) {
        onClose?.();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose?.();
    }

    setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true);
      document.addEventListener('keydown', handleKeyDown);
    }, 0);

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  });

  $effect(() => {
    x;
    y;
    updatePosition();
  });

  function handleSelect(id: string) {
    const item = items.find((i) => i.id === id);
    if (item?.disabled) return;
    onSelect?.(id);
    onClose?.();
  }
</script>

<div
  bind:this={menuEl}
  role="menu"
  tabindex="-1"
  class="ctx-menu"
  style="left:{adjustedX}px;top:{adjustedY}px;"
  oncontextmenu={(e) => e.preventDefault()}
>
  {#each items as item (item.id)}
    {#if item.separator}
      <div class="ctx-menu__separator" role="separator"></div>
    {:else}
      {@const Icon = item.icon}
      <button
        type="button"
        role="menuitem"
        class="ctx-menu__item"
        class:ctx-menu__item--disabled={item.disabled}
        onclick={() => handleSelect(item.id)}
      >
        {#if Icon}
          <Icon class="ctx-menu__icon" />
        {/if}
        <span class="ctx-menu__label">{item.label}</span>
      </button>
    {/if}
  {/each}
</div>

<style>
  .ctx-menu {
    position: fixed;
    z-index: var(--z-dropdown, 1000);
    min-width: 160px;
    padding: 4px;
    background: var(--bg-1);
    border: 1px solid var(--border-2);
    border-radius: var(--radius-m);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    animation: ctx-menu-in 0.12s ease;
  }

  @keyframes ctx-menu-in {
    from {
      opacity: 0;
      transform: scale(0.96);
    }

    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .ctx-menu__item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 10px;
    font-size: 12px;
    font-weight: 450;
    color: var(--text-1);
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.1s ease;
    text-align: left;
    white-space: nowrap;
  }

  .ctx-menu__item:hover {
    background: var(--bg-2);
  }

  .ctx-menu__item--disabled {
    opacity: 0.4;
    cursor: default;
    pointer-events: none;
  }

  .ctx-menu__icon {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    color: var(--text-2);
  }

  .ctx-menu__label {
    min-width: 0;
    flex: 1;
  }

  .ctx-menu__separator {
    height: 1px;
    margin: 3px 6px;
    background: var(--border-2);
  }
</style>
