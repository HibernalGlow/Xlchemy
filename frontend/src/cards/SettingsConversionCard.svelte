<script lang="ts">
  import Checkbox from '$lib/components/ui/Checkbox.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { i18n } from '$lib/i18n/t.svelte';
  import type { LaneId } from '$lib/cards/definitions';

  interface Props { laneId: LaneId }
  let { laneId }: Props = $props();
  const t = i18n.t;
  const jpgEncoderOptions = ['JPEGLI', 'libjpeg'].map((value) => ({ value, label: value }));
  const avifEncoderOptions = ['AOM AV1', 'SVT-AV1-PSY', 'slimg'].map((value) => ({ value, label: value }));
  const avifBitDepthOptions = ['Auto', '12', '10', '8'].map((value) => ({ value, label: value === 'Auto' ? t('Auto') : value }));
</script>

<LaneCard id="settings-conversion" laneId={laneId} movable header={t('Conversion Settings')}>
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
