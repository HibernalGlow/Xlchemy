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

    {#each [
      ['disable_progressive_jpegli', t('Disable progressive JPEGLI')],
      ['avif_aom_iq_tune', t('AOM IQ Tune')],
      ['keep_if_larger', t('Keep original if result is larger')],
      ['copy_if_larger', t('Copy original if result is larger')],
      ['jxl_lossy_modular', t('JXL lossy modular')],
      ['jxl_auto_lossless_jpeg', t('Auto lossless JPEG transcode for JXL')],
    ] as [string, string][] as item}
      {@const key = item[0]}
      {@const label = item[1]}
      <label class="flex items-center gap-2 text-[11px] text-text-1">
        <Checkbox checked={!!appState.appSettings[key]} onCheckedChange={(v) => appState.updateApp(key, v)} />
        {label}
      </label>
    {/each}
  </div>
</LaneCard>
