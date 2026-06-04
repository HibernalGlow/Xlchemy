<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';
  import { i18n } from '$lib/i18n/t.svelte';
  import { applyThemeColors, getCustomThemes, getThemeMode, presetThemes } from '$lib/utils/themes';

  interface Props {
    currentThemeName: string;
    onThemeChange: (name: string) => void;
    onThemeModeChange: (mode: 'light' | 'dark' | 'system') => void;
  }

  let { currentThemeName, onThemeChange, onThemeModeChange }: Props = $props();
  const t = i18n.t;

  function themeNames() {
    return [...presetThemes.map((theme) => theme.name), ...getCustomThemes().map((theme) => theme.name)];
  }

  function handleSelectTheme(name: string) {
    applyThemeColors(getThemeMode(), name);
    onThemeChange(name);
  }
</script>

<div class="flex flex-col gap-3">
  <div class="flex flex-wrap gap-2">
    <Button kind="outline" variant={getThemeMode() === 'system' ? 'pop' : 'neutral'} size="sm" onclick={() => onThemeModeChange('system')}>{t('System')}</Button>
    <Button kind="outline" variant={getThemeMode() === 'light' ? 'pop' : 'neutral'} size="sm" onclick={() => onThemeModeChange('light')}>{t('Light')}</Button>
    <Button kind="outline" variant={getThemeMode() === 'dark' ? 'pop' : 'neutral'} size="sm" onclick={() => onThemeModeChange('dark')}>{t('Dark')}</Button>
  </div>

  <div class="flex flex-wrap gap-2">
    {#each themeNames() as name}
      <button
        type="button"
        onclick={() => handleSelectTheme(name)}
        class={`inline-flex items-center gap-1.5 rounded-gb border px-2 py-1 text-xs transition-colors ${currentThemeName === name ? 'border-fill-pop bg-fill-pop/10 text-fill-pop' : 'border-border-2 bg-bg-2 text-text-1 hover:bg-ntrl-30'}`}
      >
        {name}
      </button>
    {/each}
  </div>
</div>
