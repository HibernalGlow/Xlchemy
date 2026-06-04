<script lang="ts">
  import Checkbox from '$lib/components/ui/Checkbox.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { _ } from 'svelte-i18n';
  import type { LaneId } from '$lib/cards/definitions';

  interface Props { laneId: LaneId }
  let { laneId }: Props = $props();
  const jpgEncoderOptions = ['JPEGLI', 'libjpeg'].map((value) => ({ value, label: value }));
  const avifEncoderOptions = ['AOM AV1', 'SVT-AV1-PSY', 'slimg'].map((value) => ({ value, label: value }));
  const avifBitDepthOptions = ['Auto', '12', '10', '8'].map((value) => ({ value, label: value === 'Auto' ? $_('common.auto') : value }));
</script>

<LaneCard id="settings-conversion" laneId={laneId} movable header={$_('settings.conversion')}>
  <div class="flex flex-col gap-3">
    <Select value={appState.appSettings.jpg_encoder || 'JPEGLI'} options={jpgEncoderOptions} onChange={(v) => appState.updateApp('jpg_encoder', v)} />
    <Select value={appState.appSettings.avif_encoder || 'AOM AV1'} options={avifEncoderOptions} onChange={(v) => appState.updateApp('avif_encoder', v)} />
    <Select value={appState.appSettings.avif_bit_depth || 'Auto'} options={avifBitDepthOptions} onChange={(v) => appState.updateApp('avif_bit_depth', v)} />

    <label class="flex items-center gap-2 text-[11px] text-text-1">
      <Checkbox checked={!!appState.appSettings.disable_progressive_jpegli} onCheckedChange={(v) => appState.updateApp('disable_progressive_jpegli', v)} />
      {$_('settings.disable_progressive_jpegli')}
    </label>
    <label class="flex items-center gap-2 text-[11px] text-text-1">
      <Checkbox checked={!!appState.appSettings.avif_aom_iq_tune} onCheckedChange={(v) => appState.updateApp('avif_aom_iq_tune', v)} />
      {$_('settings.aom_iq_tune')}
    </label>
    <label class="flex items-center gap-2 text-[11px] text-text-1">
      <Checkbox checked={!!appState.appSettings.keep_if_larger} onCheckedChange={(v) => appState.updateApp('keep_if_larger', v)} />
      {$_('settings.keep_original_larger')}
    </label>
    <label class="flex items-center gap-2 text-[11px] text-text-1">
      <Checkbox checked={!!appState.appSettings.copy_if_larger} onCheckedChange={(v) => appState.updateApp('copy_if_larger', v)} />
      {$_('settings.copy_original_larger')}
    </label>
    <label class="flex items-center gap-2 text-[11px] text-text-1">
      <Checkbox checked={!!appState.appSettings.jxl_lossy_modular} onCheckedChange={(v) => appState.updateApp('jxl_lossy_modular', v)} />
      {$_('settings.jxl_lossy_modular')}
    </label>
    <label class="flex items-center gap-2 text-[11px] text-text-1">
      <Checkbox checked={!!appState.appSettings.jxl_auto_lossless_jpeg} onCheckedChange={(v) => appState.updateApp('jxl_auto_lossless_jpeg', v)} />
      {$_('settings.auto_lossless_jpeg')}
    </label>
  </div>
</LaneCard>
