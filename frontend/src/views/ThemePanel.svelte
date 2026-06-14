<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';
  import { Sun, Moon, Monitor, Image, CircleDot, Palette, Check, Upload, X } from '@lucide/svelte';
  import { applyThemeColors, getThemeMode, getThemePreviewColors, getThemesByHue, resolveEffectiveMode } from '$lib/utils/themes';
  import type { BackgroundSettings, BackgroundMode } from '$lib/utils/backgroundSettings';
  import { _ } from 'svelte-i18n';

  interface Props {
    currentThemeName: string;
    backgroundSettings: BackgroundSettings;
    onThemeChange: (name: string) => void;
    onThemeModeChange: (mode: 'light' | 'dark' | 'system') => void;
    onBackgroundChange: (partial: Partial<BackgroundSettings>) => void;
  }

  let { currentThemeName, backgroundSettings, onThemeChange, onThemeModeChange, onBackgroundChange }: Props = $props();

  let activeTab = $state<'theme' | 'background'>('theme');
  let bgImageUrlInput = $state('');
  let fileInputRef = $state<HTMLInputElement | null>(null);

  $effect(() => {
    bgImageUrlInput = backgroundSettings.imageUrl;
  });

  function sortedThemes() {
    const mode = resolveEffectiveMode(getThemeMode());
    return getThemesByHue(mode);
  }

  function currentEffectiveMode(): 'light' | 'dark' {
    return resolveEffectiveMode(getThemeMode());
  }

  function handleSelectTheme(name: string) {
    applyThemeColors(getThemeMode(), name);
    onThemeChange(name);
  }

  function handleBgModeChange(mode: BackgroundMode) {
    onBackgroundChange({ mode });
  }

  function handleBgUrlBlur() {
    onBackgroundChange({ imageUrl: bgImageUrlInput });
  }

  function handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      onBackgroundChange({ imageUrl: dataUrl, mode: 'image' });
      bgImageUrlInput = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  function clearBackgroundImage() {
    onBackgroundChange({ imageUrl: '' });
    bgImageUrlInput = '';
  }

  function handleOpacityInput(e: Event) {
    const val = Number((e.target as HTMLInputElement).value);
    onBackgroundChange({ opacity: val });
  }

  function handleBlurInput(e: Event) {
    const val = Number((e.target as HTMLInputElement).value);
    onBackgroundChange({ blur: val });
  }

  const bgModeOptions: { value: BackgroundMode; label: string; icon: typeof Image }[] = [
    { value: 'dot-grid', label: $_('theme_panel.dot_grid'), icon: CircleDot },
    { value: 'image', label: $_('theme_panel.image'), icon: Image },
    { value: 'none', label: $_('theme_panel.none'), icon: Palette },
  ];
</script>

<div class="theme-panel">
  <!-- Tab bar -->
  <div class="theme-panel__tabs">
    <button
      type="button"
      class="theme-panel__tab"
      class:theme-panel__tab--active={activeTab === 'theme'}
      onclick={() => (activeTab = 'theme')}
    >
      <Palette class="w-3 h-3" />
      {$_('theme_panel.theme_tab')}
    </button>
    <button
      type="button"
      class="theme-panel__tab"
      class:theme-panel__tab--active={activeTab === 'background'}
      onclick={() => (activeTab = 'background')}
    >
      <Image class="w-3 h-3" />
      {$_('theme_panel.background_tab')}
    </button>
  </div>

  <!-- Theme Tab -->
  {#if activeTab === 'theme'}
    <div class="theme-panel__content">
      <!-- Mode selection -->
      <div class="theme-panel__section">
        <span class="theme-panel__label">{$_('theme_panel.mode')}</span>
        <div class="theme-panel__mode-grid">
          <button
            type="button"
            class="theme-panel__mode-btn"
            class:theme-panel__mode-btn--active={getThemeMode() === 'light'}
            onclick={() => onThemeModeChange('light')}
          >
            <Sun class="w-4 h-4" />
            <span>{$_('theme_panel.light')}</span>
            {#if getThemeMode() === 'light'}<span class="theme-panel__check"><Check class="w-3 h-3" /></span>{/if}
          </button>
          <button
            type="button"
            class="theme-panel__mode-btn"
            class:theme-panel__mode-btn--active={getThemeMode() === 'dark'}
            onclick={() => onThemeModeChange('dark')}
          >
            <Moon class="w-4 h-4" />
            <span>{$_('theme_panel.dark')}</span>
            {#if getThemeMode() === 'dark'}<span class="theme-panel__check"><Check class="w-3 h-3" /></span>{/if}
          </button>
          <button
            type="button"
            class="theme-panel__mode-btn"
            class:theme-panel__mode-btn--active={getThemeMode() === 'system'}
            onclick={() => onThemeModeChange('system')}
          >
            <Monitor class="w-4 h-4" />
            <span>{$_('theme_panel.system')}</span>
            {#if getThemeMode() === 'system'}<span class="theme-panel__check"><Check class="w-3 h-3" /></span>{/if}
          </button>
        </div>
      </div>

      <!-- Color schemes — compact dot palette -->
      <div class="theme-panel__section">
        <span class="theme-panel__label">{$_('theme_panel.color_scheme')}</span>
        <div class="theme-panel__dot-map">
          {#each sortedThemes() as theme}
            {@const colors = getThemePreviewColors(theme, currentEffectiveMode())}
            <button
              type="button"
              onclick={() => handleSelectTheme(theme.name)}
              class="theme-panel__dot-wrap"
              class:theme-panel__dot-wrap--active={currentThemeName === theme.name}
              data-theme={theme.name}
              title={theme.name}
            >
              <span
                class="theme-panel__dot"
                style="background: {colors.primary}"
              ></span>
            </button>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- Background Tab -->
  {#if activeTab === 'background'}
    <div class="theme-panel__content">
      <!-- Background mode -->
      <div class="theme-panel__section">
        <span class="theme-panel__label">{$_('theme_panel.mode')}</span>
        <div class="theme-panel__bg-modes">
          {#each bgModeOptions as option}
            <button
              type="button"
              class="theme-panel__bg-mode-btn"
              class:theme-panel__bg-mode-btn--active={backgroundSettings.mode === option.value}
              onclick={() => handleBgModeChange(option.value)}
            >
              <option.icon class="w-4 h-4" />
              <span>{option.label}</span>
            </button>
          {/each}
        </div>
      </div>

      {#if backgroundSettings.mode === 'image'}
        <!-- Upload local file -->
        <div class="theme-panel__section">
          <span class="theme-panel__label">{$_('theme_panel.upload_image')}</span>
          <div class="theme-panel__upload-row">
            <input
              type="file"
              accept="image/*"
              style="display:none"
              onchange={handleFileUpload}
              bind:this={fileInputRef}
            />
            <Button kind="outline" variant="neutral" size="sm" onclick={() => fileInputRef?.click()}>
              <Upload class="w-3 h-3" />
              {$_('theme_panel.choose_file')}
            </Button>
            {#if backgroundSettings.imageUrl}
              <Button kind="outline" variant="neutral" size="sm" onclick={clearBackgroundImage}>
                <X class="w-3 h-3" />
                {$_('common.clear')}
              </Button>
            {/if}
          </div>
          {#if backgroundSettings.imageUrl}
            <div class="theme-panel__preview" style="background-image: url({backgroundSettings.imageUrl})"></div>
          {/if}
        </div>

        <!-- Image URL -->
        <div class="theme-panel__section">
          <span class="theme-panel__label">{$_('theme_panel.or_image_url')}</span>
          <div class="theme-panel__url-row">
            <input
              type="text"
              bind:value={bgImageUrlInput}
              onchange={handleBgUrlBlur}
              placeholder="https://example.com/bg.jpg"
              class="theme-panel__input"
            />
            <Button kind="outline" variant="neutral" size="sm" onclick={handleBgUrlBlur}><Check class="w-3 h-3" />{$_('common.apply')}</Button>
          </div>
        </div>

        <!-- Opacity -->
        <div class="theme-panel__section">
          <div class="theme-panel__slider-header">
            <span class="theme-panel__label">{$_('theme_panel.opacity')}</span>
            <span class="theme-panel__value">{backgroundSettings.opacity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={backgroundSettings.opacity}
            oninput={handleOpacityInput}
            class="theme-panel__slider"
          />
        </div>

        <!-- Blur -->
        <div class="theme-panel__section">
          <div class="theme-panel__slider-header">
            <span class="theme-panel__label">{$_('theme_panel.blur')}</span>
            <span class="theme-panel__value">{backgroundSettings.blur}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="30"
            step="1"
            value={backgroundSettings.blur}
            oninput={handleBlurInput}
            class="theme-panel__slider"
          />
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .theme-panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 260px;
  }

  .theme-panel__tabs {
    display: flex;
    gap: 2px;
    background: var(--bg-2);
    border-radius: 8px;
    padding: 2px;
  }

  .theme-panel__tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 5px 8px;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-2);
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .theme-panel__tab:hover {
    color: var(--text-1);
    background: color-mix(in oklch, var(--bg-1) 60%, transparent);
  }

  .theme-panel__tab--active {
    color: var(--text-1);
    background: var(--bg-1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .theme-panel__content {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .theme-panel__section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .theme-panel__label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-2);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .theme-panel__mode-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
  }

  .theme-panel__mode-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 8px 4px;
    font-size: 10px;
    font-weight: 500;
    color: var(--text-2);
    background: var(--bg-2);
    border: 1px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
    position: relative;
  }

  .theme-panel__mode-btn:hover {
    color: var(--text-1);
    background: color-mix(in oklch, var(--bg-1) 80%, transparent);
  }

  .theme-panel__mode-btn--active {
    color: var(--fill-pop-bg);
    border-color: color-mix(in oklch, var(--fill-pop-bg) 40%, transparent);
    background: color-mix(in oklch, var(--fill-pop-bg) 8%, var(--bg-2));
  }

  .theme-panel__check {
    position: absolute;
    top: 3px;
    right: 3px;
  }

  .theme-panel__dot-map {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
    padding: 2px 0;
  }

  .theme-panel__dot-wrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    padding: 0;
    background: transparent;
    transition: all 0.12s ease;
  }

  .theme-panel__dot-wrap:hover {
    border-color: color-mix(in oklch, var(--border-2) 70%, transparent);
    transform: scale(1.25);
    z-index: 1;
  }

  .theme-panel__dot-wrap--active {
    border-color: var(--fill-pop-bg);
    box-shadow: 0 0 0 1.5px var(--fill-pop-bg);
  }

  .theme-panel__dot {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    box-shadow: inset 0 0 0 0.5px rgba(128, 128, 128, 0.18);
  }

  /* Tooltip on hover */
  .theme-panel__dot-wrap::after {
    content: attr(data-theme);
    position: absolute;
    bottom: calc(100% + 5px);
    left: 50%;
    transform: translateX(-50%);
    padding: 3px 7px;
    font-size: 10px;
    font-weight: 500;
    color: var(--text-1);
    background: var(--bg-1);
    border: 1px solid var(--border-2);
    border-radius: 5px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.12s ease;
    z-index: 20;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
  }

  .theme-panel__dot-wrap:hover::after {
    opacity: 1;
  }

  .theme-panel__bg-modes {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
  }

  .theme-panel__bg-mode-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 8px 4px;
    font-size: 10px;
    font-weight: 500;
    color: var(--text-2);
    background: var(--bg-2);
    border: 1px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .theme-panel__bg-mode-btn:hover {
    color: var(--text-1);
    background: color-mix(in oklch, var(--bg-1) 80%, transparent);
  }

  .theme-panel__bg-mode-btn--active {
    color: var(--fill-pop-bg);
    border-color: color-mix(in oklch, var(--fill-pop-bg) 40%, transparent);
    background: color-mix(in oklch, var(--fill-pop-bg) 8%, var(--bg-2));
  }

  .theme-panel__url-row {
    display: flex;
    gap: 4px;
  }

  .theme-panel__input {
    flex: 1;
    padding: 4px 8px;
    font-size: 11px;
    color: var(--text-1);
    background: var(--bg-2);
    border: 1px solid var(--border-2);
    border-radius: 6px;
    outline: none;
    min-width: 0;
  }

  .theme-panel__input:focus {
    border-color: var(--fill-pop-bg);
  }

  .theme-panel__slider-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .theme-panel__value {
    font-size: 11px;
    font-weight: 500;
    color: var(--fill-pop-bg);
    font-variant-numeric: tabular-nums;
  }

  .theme-panel__slider {
    width: 100%;
    height: 4px;
    appearance: none;
    background: var(--border-2);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
    accent-color: var(--fill-pop-bg);
  }

  .theme-panel__slider::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--fill-pop-bg);
    cursor: pointer;
  }

  .theme-panel__upload-row {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .theme-panel__preview {
    width: 100%;
    height: 60px;
    border-radius: 6px;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    border: 1px solid var(--border-2);
    margin-top: 2px;
  }
</style>
