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
      <label class="flex items-center gap-2 text-[11px] text-text-1">
        <Checkbox checked={!!appState.appSettings.disable_downscaling_startup} onCheckedChange={(v) => appState.updateApp('disable_downscaling_startup', v)} />
        {t('Disable downscaling on startup')}
      </label>
      <label class="flex items-center gap-2 text-[11px] text-text-1">
        <Checkbox checked={!!appState.appSettings.disable_delete_startup} onCheckedChange={(v) => appState.updateApp('disable_delete_startup', v)} />
        {t('Disable delete original on startup')}
      </label>
      <label class="flex items-center gap-2 text-[11px] text-text-1">
        <Checkbox checked={!!appState.appSettings.sorting_disabled} onCheckedChange={(v) => appState.updateApp('sorting_disabled', v)} />
        {t('Disable sorting')}
      </label>
      <label class="flex items-center gap-2 text-[11px] text-text-1">
        <Checkbox checked={!!appState.appSettings.enable_quality_precision_snapping} onCheckedChange={(v) => appState.updateApp('enable_quality_precision_snapping', v)} />
        {t('Quality precision snapping')}
      </label>
      <label class="flex items-center gap-2 text-[11px] text-text-1">
        <Checkbox checked={!!appState.appSettings.play_sound_on_finish} onCheckedChange={(v) => appState.updateApp('play_sound_on_finish', v)} />
        {t('Play sound on finish')}
      </label>

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

      <label class="flex items-center gap-2 text-[11px] text-text-1">
        <Checkbox checked={!!appState.appSettings.disable_progressive_jpegli} onCheckedChange={(v) => appState.updateApp('disable_progressive_jpegli', v)} />
        {t('Disable progressive JPEGLI')}
      </label>
      <label class="flex items-center gap-2 text-[11px] text-text-1">
        <Checkbox checked={!!appState.appSettings.avif_aom_iq_tune} onCheckedChange={(v) => appState.updateApp('avif_aom_iq_tune', v)} />
        {t('AOM IQ Tune')}
      </label>
      <label class="flex items-center gap-2 text-[11px] text-text-1">
        <Checkbox checked={!!appState.appSettings.keep_if_larger} onCheckedChange={(v) => appState.updateApp('keep_if_larger', v)} />
        {t('Keep original if result is larger')}
      </label>
      <label class="flex items-center gap-2 text-[11px] text-text-1">
        <Checkbox checked={!!appState.appSettings.copy_if_larger} onCheckedChange={(v) => appState.updateApp('copy_if_larger', v)} />
        {t('Copy original if result is larger')}
      </label>
      <label class="flex items-center gap-2 text-[11px] text-text-1">
        <Checkbox checked={!!appState.appSettings.jxl_lossy_modular} onCheckedChange={(v) => appState.updateApp('jxl_lossy_modular', v)} />
        {t('JXL lossy modular')}
      </label>
      <label class="flex items-center gap-2 text-[11px] text-text-1">
        <Checkbox checked={!!appState.appSettings.jxl_auto_lossless_jpeg} onCheckedChange={(v) => appState.updateApp('jxl_auto_lossless_jpeg', v)} />
        {t('Auto lossless JPEG transcode for JXL')}
      </label>
    </div>
  </LaneCard>

  <LaneCard id="settings-exiftool" header={t('ExifTool')}>
    <div class="flex flex-col gap-2">
      <div class="flex flex-col gap-1">
        <span class="text-[11px] text-text-2">{t('Wipe command:')}</span>
        <Textarea value={appState.appSettings.exiftool_args?.['ExifTool - Wipe'] || ''} onchange={(e) => appState.updateApp('exiftool_args', { ...(appState.appSettings.exiftool_args || {}), 'ExifTool - Wipe': (e.currentTarget as HTMLTextAreaElement).value })} class="min-h-[40px] text-xs font-mono" />
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-[11px] text-text-2">{t('Preserve command:')}</span>
        <Textarea value={appState.appSettings.exiftool_args?.['ExifTool - Preserve'] || ''} onchange={(e) => appState.updateApp('exiftool_args', { ...(appState.appSettings.exiftool_args || {}), 'ExifTool - Preserve': (e.currentTarget as HTMLTextAreaElement).value })} class="min-h-[40px] text-xs font-mono" />
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-[11px] text-text-2">{t('Unsafe Wipe command:')}</span>
        <Textarea value={appState.appSettings.exiftool_args?.['ExifTool - Unsafe Wipe'] || ''} onchange={(e) => appState.updateApp('exiftool_args', { ...(appState.appSettings.exiftool_args || {}), 'ExifTool - Unsafe Wipe': (e.currentTarget as HTMLTextAreaElement).value })} class="min-h-[40px] text-xs font-mono" />
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-[11px] text-text-2">{t('Custom command:')}</span>
        <Textarea value={appState.appSettings.exiftool_args?.['ExifTool - Custom'] || ''} onchange={(e) => appState.updateApp('exiftool_args', { ...(appState.appSettings.exiftool_args || {}), 'ExifTool - Custom': (e.currentTarget as HTMLTextAreaElement).value })} class="min-h-[40px] text-xs font-mono" />
      </div>
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
