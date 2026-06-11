<script lang="ts">
  import Badge from '$lib/components/ui/Badge.svelte';
  import ThemePanel from '$lib/views/ThemePanel.svelte';
  import { Palette, ChevronDown } from '@lucide/svelte';
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

<header class="chrome-header">
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
  </div>
</header>

<style>
  .theme-popover-anchor {
    position: relative;
  }

  .chrome-header__theme-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 11px;
    height: 32px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-1);
    background:
      linear-gradient(180deg, color-mix(in oklch, var(--bg-1) 94%, transparent), color-mix(in oklch, var(--bg-1) 82%, var(--surface-ornament)));
    border: 1px solid color-mix(in oklch, var(--border-2) 70%, transparent);
    border-radius: 10px;
    cursor: pointer;
    backdrop-filter: blur(12px);
    box-shadow:
      inset 0 1px 0 var(--highlight),
      0 10px 24px rgba(var(--shadow-color-rgb), 0.08);
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .chrome-header__theme-button:hover {
    background:
      linear-gradient(180deg, color-mix(in oklch, var(--bg-1) 98%, transparent), color-mix(in oklch, var(--bg-1) 86%, var(--surface-ornament)));
    color: var(--text-1);
    border-color: color-mix(in oklch, var(--fill-pop-bg) 26%, var(--border-2));
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
    padding: 10px;
    background: color-mix(in oklch, var(--bg-1) 92%, transparent);
    border: 1px solid color-mix(in oklch, var(--border-2) 74%, transparent);
    border-radius: 12px;
    backdrop-filter: blur(18px);
    box-shadow:
      inset 0 1px 0 var(--highlight),
      0 16px 40px rgba(0, 0, 0, 0.18);
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
