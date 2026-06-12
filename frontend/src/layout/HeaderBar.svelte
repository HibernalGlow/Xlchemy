<script lang="ts">
  import Badge from '$lib/components/ui/Badge.svelte';
  import ThemePanel from '$lib/views/ThemePanel.svelte';
  import { Palette, ChevronDown, Minus, Maximize2, Minimize2, X } from '@lucide/svelte';
  import type { BackgroundSettings } from '$lib/utils/backgroundSettings';

  interface Props {
    version?: string;
    currentTheme?: string;
    backgroundSettings?: BackgroundSettings;
    isConverting?: boolean;
    onThemeChange?: (name: string) => void;
    onThemeModeChange?: (mode: 'light' | 'dark' | 'system') => void;
    onBackgroundChange?: (partial: Partial<BackgroundSettings>) => void;
  }

  let {
    version = '',
    currentTheme = 'Miku',
    backgroundSettings,
    isConverting = false,
    onThemeChange,
    onThemeModeChange,
    onBackgroundChange,
  }: Props = $props();

  let showThemePopover = $state(false);
  let popoverEl = $state<HTMLDivElement | null>(null);
  let buttonEl = $state<HTMLButtonElement | null>(null);
  let isMaximised = $state(false);

  async function handleMinimise() {
    const { Window } = await import('@wailsio/runtime');
    Window.Minimise();
  }

  async function handleToggleMaximise() {
    const { Window } = await import('@wailsio/runtime');
    Window.ToggleMaximise();
    isMaximised = !isMaximised;
  }

  async function handleClose() {
    const { Window } = await import('@wailsio/runtime');
    Window.Close();
  }

  function handleDblClick() {
    handleToggleMaximise();
  }

  function togglePopover() {
    showThemePopover = !showThemePopover;
  }

  function handleClickOutside(e: MouseEvent) {
    if (!showThemePopover) return;
    const target = e.target as Node;
    if (popoverEl && !popoverEl.contains(target) && buttonEl && !buttonEl.contains(target)) {
      showThemePopover = false;
    }
  }
</script>

<svelte:document onclick={handleClickOutside} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<header class="chrome-header" ondblclick={handleDblClick}>
  <div class="chrome-header__left">
    <div class="chrome-header__brand">
      <div class="chrome-header__logo">X</div>
      <div class="chrome-header__brand-copy">
        <div class="chrome-header__brand-row">
          <span class="chrome-header__brand-name">Xlchemy</span>
          {#if version}
            <Badge variant="secondary" class="chrome-header__version">v{version}</Badge>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <div class="chrome-header__center"></div>

  <div class="chrome-header__right">
    <!-- Theme button with popover -->
    <div class="theme-popover-anchor">
      <button
        type="button"
        bind:this={buttonEl}
        class="chrome-header__theme-button"
        onclick={togglePopover}
      >
        <Palette class="w-3.5 h-3.5" />
        <span>{currentTheme}</span>
        <span class="theme-chevron" class:theme-chevron--open={showThemePopover}><ChevronDown class="w-3 h-3" /></span>
      </button>

      {#if showThemePopover}
        <div bind:this={popoverEl} class="theme-popover">
          <ThemePanel
            currentThemeName={currentTheme}
            backgroundSettings={backgroundSettings!}
            onThemeChange={(name) => {
              onThemeChange?.(name);
            }}
            onThemeModeChange={(mode) => {
              onThemeModeChange?.(mode);
            }}
            onBackgroundChange={(partial) => {
              onBackgroundChange?.(partial);
            }}
          />
        </div>
      {/if}
    </div>

    <!-- Window control buttons -->
    <div class="window-controls">
      <button type="button" class="window-controls__btn" onclick={handleMinimise} aria-label="Minimise">
        <Minus class="w-3.5 h-3.5" />
      </button>
      <button type="button" class="window-controls__btn" onclick={handleToggleMaximise} aria-label="Maximise">
        {#if isMaximised}
          <Minimize2 class="w-3.5 h-3.5" />
        {:else}
          <Maximize2 class="w-3.5 h-3.5" />
        {/if}
      </button>
      <button type="button" class="window-controls__btn window-controls__btn--close" onclick={handleClose} aria-label="Close">
        <X class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</header>

<style>
  .theme-popover-anchor {
    position: relative;
  }

  .window-controls {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-left: 8px;
  }

  .window-controls__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-s, 4px);
    border: none;
    background: transparent;
    color: var(--text-2, #aaa);
    cursor: pointer;
    transition: background 0.12s ease, color 0.12s ease;
  }

  .window-controls__btn:hover {
    background: var(--bg-3, rgba(255, 255, 255, 0.08));
    color: var(--text-1, #fff);
  }

  .window-controls__btn--close:hover {
    background: #c42b1c;
    color: #fff;
  }

  .chrome-header__theme-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    height: 28px;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-1);
    background: var(--bg-1);
    border: 1px solid var(--border-2);
    border-radius: var(--radius-m);
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .chrome-header__theme-button:hover {
    background: var(--bg-1);
    color: var(--text-1);
    border-color: var(--border-2);
  }

  .theme-chevron {
    transition: transform 0.2s ease;
    opacity: 0.6;
  }

  .theme-chevron--open {
    transform: rotate(180deg);
  }

  .theme-popover {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: var(--z-dropdown);
    min-width: 280px;
    padding: 8px;
    background: var(--bg-1);
    border: 1px solid var(--border-2);
    border-radius: var(--radius-m);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    animation: popover-in 0.15s ease;
  }

  @keyframes popover-in {
    from {
      opacity: 0;
      transform: translateY(-4px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
</style>
