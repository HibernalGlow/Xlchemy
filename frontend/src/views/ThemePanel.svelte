<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';
  import { Sun, Moon, Monitor, Image, CircleDot, Palette, Check, Upload, X } from '@lucide/svelte';
  import { applyThemeColors, getCustomThemes, getThemeMode, presetThemes } from '$lib/utils/themes';
  import type { BackgroundSettings, BackgroundMode } from '$lib/utils/backgroundSettings';

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
  let fileInputRef: HTMLInputElement | null = null;

  $effect(() => {
    bgImageUrlInput = backgroundSettings.imageUrl;
  });

  function themeNames() {
    return [...presetThemes.map((theme) => theme.name), ...getCustomThemes().map((theme) => theme.name)];
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
    { value: 'dot-grid', label: 'Dot Grid', icon: CircleDot },
    { value: 'image', label: 'Image', icon: Image },
    { value: 'none', label: 'None', icon: Palette },
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
      Theme
    </button>
    <button
      type="button"
      class="theme-panel__tab"
      class:theme-panel__tab--active={activeTab === 'background'}
      onclick={() => (activeTab = 'background')}
    >
      <Image class="w-3 h-3" />
      Background
    </button>
  </div>

  <!-- Theme Tab -->
  {#if activeTab === 'theme'}
    <div class="theme-panel__content">
      <!-- Mode selection -->
      <div class="theme-panel__section">
        <span class="theme-panel__label">Mode</span>
        <div class="theme-panel__mode-grid">
          <button
            type="button"
            class="theme-panel__mode-btn"
            class:theme-panel__mode-btn--active={getThemeMode() === 'light'}
            onclick={() => onThemeModeChange('light')}
          >
            <Sun class="w-4 h-4" />
            <span>Light</span>
            {#if getThemeMode() === 'light'}<span class="theme-panel__check"><Check class="w-3 h-3" /></span>{/if}
          </button>
          <button
            type="button"
            class="theme-panel__mode-btn"
            class:theme-panel__mode-btn--active={getThemeMode() === 'dark'}
            onclick={() => onThemeModeChange('dark')}
          >
            <Moon class="w-4 h-4" />
            <span>Dark</span>
            {#if getThemeMode() === 'dark'}<span class="theme-panel__check"><Check class="w-3 h-3" /></span>{/if}
          </button>
          <button
            type="button"
            class="theme-panel__mode-btn"
            class:theme-panel__mode-btn--active={getThemeMode() === 'system'}
            onclick={() => onThemeModeChange('system')}
          >
            <Monitor class="w-4 h-4" />
            <span>System</span>
            {#if getThemeMode() === 'system'}<span class="theme-panel__check"><Check class="w-3 h-3" /></span>{/if}
          </button>
        </div>
      </div>

      <!-- Color schemes -->
      <div class="theme-panel__section">
        <span class="theme-panel__label">Color Scheme</span>
        <div class="theme-panel__theme-list">
          {#each themeNames() as name}
            <button
              type="button"
              onclick={() => handleSelectTheme(name)}
              class="theme-panel__theme-btn"
              class:theme-panel__theme-btn--active={currentThemeName === name}
            >
              <span class="theme-panel__swatch" style="background: var(--primary)"></span>
              {name}
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
        <span class="theme-panel__label">Mode</span>
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
          <span class="theme-panel__label">Upload Image</span>
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
              Choose File
            </Button>
            {#if backgroundSettings.imageUrl}
              <Button kind="outline" variant="neutral" size="sm" onclick={clearBackgroundImage}>
                <X class="w-3 h-3" />
                Clear
              </Button>
            {/if}
          </div>
          {#if backgroundSettings.imageUrl}
            <div class="theme-panel__preview" style="background-image: url({backgroundSettings.imageUrl})"></div>
          {/if}
        </div>

        <!-- Image URL -->
        <div class="theme-panel__section">
          <span class="theme-panel__label">Or Image URL</span>
          <div class="theme-panel__url-row">
            <input
              type="text"
              bind:value={bgImageUrlInput}
              onchange={handleBgUrlBlur}
              placeholder="https://example.com/bg.jpg"
              class="theme-panel__input"
            />
            <Button kind="outline" variant="neutral" size="sm" onclick={handleBgUrlBlur}>Apply</Button>
          </div>
        </div>

        <!-- Opacity -->
        <div class="theme-panel__section">
          <div class="theme-panel__slider-header">
            <span class="theme-panel__label">Opacity</span>
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
            <span class="theme-panel__label">Blur</span>
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

  .theme-panel__theme-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .theme-panel__theme-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-1);
    background: var(--bg-2);
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .theme-panel__theme-btn:hover {
    background: color-mix(in oklch, var(--bg-1) 80%, transparent);
  }

  .theme-panel__theme-btn--active {
    border-color: var(--fill-pop-bg);
    background: color-mix(in oklch, var(--fill-pop-bg) 10%, var(--bg-2));
    color: var(--fill-pop-bg);
  }

  .theme-panel__swatch {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
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
