<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';
  import Checkbox from '$lib/components/ui/Checkbox.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import Textarea from '$lib/components/ui/Textarea.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { i18n } from '$lib/i18n/t.svelte';
  import ThemePanel from '$lib/views/ThemePanel.svelte';

  const t = i18n.t;

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'zh', label: '中文' },
  ];
  const jpgEncoderOptions = ['JPEGLI', 'libjpeg'].map((value) => ({ value, label: value }));
  const avifEncoderOptions = ['AOM AV1', 'SVT-AV1-PSY', 'slimg'].map((value) => ({ value, label: value }));
  const avifBitDepthOptions = ['Auto', '12', '10', '8'].map((value) => ({ value, label: value === 'Auto' ? t('Auto') : value }));
  const ramOptimizerOptions = ['Dynamic', 'Static', 'Disabled'].map((value) => ({ value, label: t(value) }));
  const processingOrderOptions = ['Original', 'Random', 'Sequential', 'Path Ascending', 'Path Descending', 'Size Ascending', 'Size Descending'].map((value) => ({ value, label: t(value) }));
</script>

<div class="flex flex-col gap-2">
  <LaneCard id="settings-appearance" header={t('Appearance')}>
    <div class="flex flex-col gap-3">
      <Select value={appState.currentLang} options={languageOptions} onChange={(v) => appState.changeLanguage(v)} />
      <ThemePanel currentThemeName={appState.appSettings.theme || 'Miku'} onThemeChange={(name) => appState.changeTheme(name)} onThemeModeChange={(mode) => appState.changeThemeMode(mode)} />
    </div>
  </LaneCard>

  <LaneCard id="settings-general" header={t('General')}>
    <div class="flex flex-col gap-2">
      {#each [
        ['disable_downscaling_startup', t('Disable downscaling on startup')],
        ['disable_delete_startup', t('Disable delete original on startup')],
        ['sorting_disabled', t('Disable sorting')],
        ['enable_quality_precision_snapping', t('Quality precision snapping')],
        ['play_sound_on_finish', t('Play sound on finish')],
      ] as [key, label]}
        <label class="flex items-center gap-2 text-[11px] text-text-1">
          <Checkbox checked={!!appState.appSettings[key]} onCheckedChange={(v) => appState.updateApp(key, v)} />
          {label}
        </label>
      {/each}

      {#if appState.appSettings.play_sound_on_finish}
        <div class="flex items-center gap-2 ml-5">
          <span class="text-[11px] text-text-2">{t('Volume:')}</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={appState.appSettings.play_sound_on_finish_vol ?? 0.5}
            oninput={(e) => appState.updateApp('play_sound_on_finish_vol', Number((e.currentTarget as HTMLInputElement).value))}
            class="w-28 accent-[var(--fill-pop-bg)]"
          />
        </div>
      {/if}
    </div>
  </LaneCard>

  <LaneCard id="settings-conversion" header={t('Conversion Settings')}>
    <div class="flex flex-col gap-3">
      <Select value={appState.appSettings.jpg_encoder || 'JPEGLI'} options={jpgEncoderOptions} onChange={(v) => appState.updateApp('jpg_encoder', v)} />
      <Select value={appState.appSettings.avif_encoder || 'AOM AV1'} options={avifEncoderOptions} onChange={(v) => appState.updateApp('avif_encoder', v)} />
      <Select value={appState.appSettings.avif_bit_depth || 'Auto'} options={avifBitDepthOptions} onChange={(v) => appState.updateApp('avif_bit_depth', v)} />

      {#each [
        ['disable_progressive_jpegli', t('Disable progressive JPEGLI')],
        ['avif_aom_iq_tune', t('AOM IQ Tune')],
        ['keep_if_larger', t('Keep original if result is larger')],
        ['copy_if_larger', t('Copy original if result is larger')],
        ['jxl_lossy_modular', t('JXL lossy modular')],
        ['jxl_auto_lossless_jpeg', t('Auto lossless JPEG transcode for JXL')],
      ] as [key, label]}
        <label class="flex items-center gap-2 text-[11px] text-text-1">
          <Checkbox checked={!!appState.appSettings[key]} onCheckedChange={(v) => appState.updateApp(key, v)} />
          {label}
        </label>
      {/each}
    </div>
  </LaneCard>

  <LaneCard id="settings-exiftool" header={t('ExifTool')}>
    <div class="flex flex-col gap-2">
      {#each [
        ['ExifTool - Wipe', t('Wipe command:')],
        ['ExifTool - Preserve', t('Preserve command:')],
        ['ExifTool - Unsafe Wipe', t('Unsafe Wipe command:')],
        ['ExifTool - Custom', t('Custom command:')],
      ] as [key, label]}
        <div class="flex flex-col gap-1">
          <span class="text-[11px] text-text-2">{label}</span>
          <Textarea
            value={appState.appSettings.exiftool_args?.[key] || ''}
            onchange={(e) => appState.updateApp('exiftool_args', { ...(appState.appSettings.exiftool_args || {}), [key]: (e.currentTarget as HTMLTextAreaElement).value })}
            class="min-h-[40px] text-xs font-mono"
          />
        </div>
      {/each}
    </div>
  </LaneCard>

  <LaneCard id="settings-advanced" header={t('Advanced')}>
    <div class="flex flex-col gap-3">
      <Select value={appState.appSettings.ram_optimizer || 'Disabled'} options={ramOptimizerOptions} onChange={(v) => appState.updateApp('ram_optimizer', v)} />

      {#if appState.appSettings.ram_optimizer === 'Static'}
        <Textarea value={appState.appSettings.ram_optimizer_rules || ''} onchange={(e) => appState.updateApp('ram_optimizer_rules', (e.currentTarget as HTMLTextAreaElement).value)} class="min-h-[40px] text-xs font-mono" />
      {/if}

      <label class="flex items-center gap-2 text-[11px] text-text-1">
        <Checkbox checked={!!appState.appSettings.enable_custom_args} onCheckedChange={(v) => appState.updateApp('enable_custom_args', v)} />
        {t('Extra encoder args')}
      </label>

      {#if appState.appSettings.enable_custom_args}
        <div class="flex flex-col gap-2">
          <Input value={appState.appSettings.cjxl_args || ''} placeholder={t('cjxl args:')} oninput={(e) => appState.updateApp('cjxl_args', (e.currentTarget as HTMLInputElement).value)} class="h-7 text-xs font-mono" />
          <Input value={appState.appSettings.avifenc_args || ''} placeholder={t('avifenc args:')} oninput={(e) => appState.updateApp('avifenc_args', (e.currentTarget as HTMLInputElement).value)} class="h-7 text-xs font-mono" />
          <Input value={appState.appSettings.cjpegli_args || ''} placeholder={t('cjpegli args:')} oninput={(e) => appState.updateApp('cjpegli_args', (e.currentTarget as HTMLInputElement).value)} class="h-7 text-xs font-mono" />
          <Input value={appState.appSettings.im_args || ''} placeholder={t('ImageMagick args:')} oninput={(e) => appState.updateApp('im_args', (e.currentTarget as HTMLInputElement).value)} class="h-7 text-xs font-mono" />
        </div>
      {/if}

      <Select value={appState.appSettings.processing_order || 'Original'} options={processingOrderOptions} onChange={(v) => appState.updateApp('processing_order', v)} />

      <div class="flex gap-2 flex-wrap pt-2 border-t border-border-2/50">
        <Button kind="outline" variant="neutral" size="sm" onclick={() => appState.handleExportSettings()}>{t('Export')}</Button>
        <Button kind="outline" variant="neutral" size="sm" onclick={() => (appState.showImportDialog = true)}>{t('Import')}</Button>
      </div>
    </div>
  </LaneCard>
</div>
