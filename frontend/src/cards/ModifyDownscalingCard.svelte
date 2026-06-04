<script lang="ts">
  import Checkbox from '$lib/components/ui/Checkbox.svelte';
  import NumberInput from '$lib/components/ui/NumberInput.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { i18n } from '$lib/i18n/t.svelte';
  import type { LaneId } from '$lib/cards/definitions';

  interface Props { laneId: LaneId }
  let { laneId }: Props = $props();
  const t = i18n.t;
  const modeOptions = ['Resolution', 'Percent', 'File Size', 'Shortest Side', 'Longest Side', 'Megapixels'].map((value) => ({ value, label: t(value) }));
  const ds = $derived(appState.modifySettings.downscaling || {});

  function resampleOptions() {
    const allowed = Array.isArray(appState.constants.allowedResampling) ? appState.constants.allowedResampling : [];
    return ['Default', ...allowed].map((value) => ({ value, label: value }));
  }
</script>

<LaneCard id="modify-downscaling" laneId={laneId} movable header={t('Downscaling')}>
  <div class="flex flex-col gap-3">
    <label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!ds.enabled} onCheckedChange={(v) => appState.updateModify(['downscaling', 'enabled'], v)} />{t('Enable downscaling')}</label>
    {#if ds.enabled}
      <Select value={ds.mode || 'Resolution'} options={modeOptions} onChange={(v) => appState.updateModify(['downscaling', 'mode'], v)} />
      {#if ds.mode === 'Resolution' || !ds.mode}
        <div class="flex gap-2 flex-wrap">
          <NumberInput label={t('Width:')} value={ds.width || 1920} onChange={(v) => appState.updateModify(['downscaling', 'width'], v)} min={1} max={32768} />
          <NumberInput label={t('Height:')} value={ds.height || 1080} onChange={(v) => appState.updateModify(['downscaling', 'height'], v)} min={1} max={32768} />
        </div>
      {:else if ds.mode === 'Percent'}
        <NumberInput label={t('Percent:')} value={ds.percent || 50} onChange={(v) => appState.updateModify(['downscaling', 'percent'], v)} min={1} max={100} />
      {:else if ds.mode === 'File Size'}
        <NumberInput label={t('File Size')} value={ds.file_size || 500} onChange={(v) => appState.updateModify(['downscaling', 'file_size'], v)} min={1} max={1048576} />
      {:else if ds.mode === 'Shortest Side'}
        <NumberInput label={t('Shortest Side')} value={ds.shortest_side || 1080} onChange={(v) => appState.updateModify(['downscaling', 'shortest_side'], v)} min={1} max={32768} />
      {:else if ds.mode === 'Longest Side'}
        <NumberInput label={t('Longest Side')} value={ds.longest_side || 1920} onChange={(v) => appState.updateModify(['downscaling', 'longest_side'], v)} min={1} max={32768} />
      {:else if ds.mode === 'Megapixels'}
        <NumberInput label={t('Megapixels:')} value={ds.megapixels || 2.1} onChange={(v) => appState.updateModify(['downscaling', 'megapixels'], v)} min={0.1} max={1000} step={0.1} />
      {/if}
      <Select value={ds.resample || 'Default'} options={resampleOptions()} onChange={(v) => appState.updateModify(['downscaling', 'resample'], v)} />
    {/if}
  </div>
</LaneCard>
