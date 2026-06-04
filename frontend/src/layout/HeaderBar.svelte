<script lang="ts">
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { i18n } from '$lib/i18n/t.svelte';

  interface Props {
    version?: string;
    fileCount?: number;
    currentTheme?: string;
    isConverting?: boolean;
    onConvert?: () => void;
    onCancel?: () => void;
    singleLaneMode?: boolean;
    onToggleSingleLaneMode?: () => void;
    onCreateLane?: () => void;
  }

  let {
    version = '',
    fileCount = 0,
    currentTheme = 'Miku',
    isConverting = false,
    onConvert,
    onCancel,
    singleLaneMode = false,
    onToggleSingleLaneMode,
    onCreateLane,
  }: Props = $props();
  const t = i18n.t;
</script>

<header class="chrome-header">
  <div class="chrome-header__left">
    <div class="chrome-header__brand">
      <div class="chrome-header__logo">X</div>
      <span class="text-sm font-semibold text-text-1">Xlchemy</span>
      {#if version}
        <Badge variant="secondary" class="text-[10px]">v{version}</Badge>
      {/if}
    </div>
    <div class="chrome-header__status text-xs text-text-2">{fileCount} {t('file(s)')}</div>
  </div>

  <div class="chrome-header__center">
    <button type="button" class="chrome-selector-btn">
      <span class="chrome-selector-btn__content">
        <span class="text-12 text-bold">Xlchemy workspace</span>
      </span>
    </button>
  </div>

  <div class="chrome-header__right">
    <Button kind="outline" variant={singleLaneMode ? 'pop' : 'neutral'} size="sm" onclick={onToggleSingleLaneMode}>{singleLaneMode ? 'Single lane' : 'Multi lane'}</Button>
    <Button kind="outline" variant="neutral" size="sm" onclick={onCreateLane}>+ Lane</Button>
    {#if isConverting}
      <Button kind="outline" variant="neutral" size="sm" onclick={onCancel}>{t('Cancel')}</Button>
    {:else}
      <Button kind="solid" variant="pop" size="sm" onclick={onConvert}>{t('Convert')}</Button>
    {/if}
    <Button kind="outline" variant="neutral" size="sm">{currentTheme}</Button>
  </div>
</header>
