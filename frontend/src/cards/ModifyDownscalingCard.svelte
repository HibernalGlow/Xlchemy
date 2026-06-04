<script lang="ts">
  import Checkbox from '$lib/components/ui/Checkbox.svelte';
  import NumberInput from '$lib/components/ui/NumberInput.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { _ } from 'svelte-i18n';
  import type { LaneId } from '$lib/cards/definitions';

  interface Props { laneId: LaneId }
  let { laneId }: Props = $props();
  const modeOptions = [
    { value: 'Resolution', label: $_('modify.resolution') },
    { value: 'Percent', label: $_('modify.percent') },
    { value: 'File Size', label: $_('modify.file_size') },
    { value: 'Shortest Side', label: $_('modify.shortest_side') },
    { value: 'Longest Side', label: $_('modify.longest_side') },
    { value: 'Megapixels', label: $_('modify.megapixels') },
  ];
  const ds = $derived(appState.modifySettings.downscaling || {});

  function resampleOptions() {
    const allowed = Array.isArray(appState.constants.allowedResampling) ? appState.constants.allowedResampling : [];
    return ['Default', ...allowed].map((value) => ({ value, label: value }));
  }
</script>

<LaneCard id="modify-downscaling" laneId={laneId} movable header={$_('modify.downscaling')}>
  <div class="flex flex-col gap-3">
    <label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!ds.enabled} onCheckedChange={(v) => appState.updateModify(['downscaling', 'enabled'], v)} />{$_('modify.enable_downscaling')}</label>
    {#if ds.enabled}
      <Select value={ds.mode || 'Resolution'} options={modeOptions} onChange={(v) => appState.updateModify(['downscaling', 'mode'], v)} />
      {#if ds.mode === 'Resolution' || !ds.mode}
        <div class="flex gap-2 flex-wrap">
          <NumberInput label={$_('modify.width')} value={ds.width || 1920} onChange={(v) => appState.updateModify(['downscaling', 'width'], v)} min={1} max={32768} />
          <NumberInput label={$_('modify.height')} value={ds.height || 1080} onChange={(v) => appState.updateModify(['downscaling', 'height'], v)} min={1} max={32768} />
        </div>
      {:else if ds.mode === 'Percent'}
        <NumberInput label={$_('modify.percent_label')} value={ds.percent || 50} onChange={(v) => appState.updateModify(['downscaling', 'percent'], v)} min={1} max={100} />
      {:else if ds.mode === 'File Size'}
        <NumberInput label={$_('modify.file_size')} value={ds.file_size || 500} onChange={(v) => appState.updateModify(['downscaling', 'file_size'], v)} min={1} max={1048576} />
      {:else if ds.mode === 'Shortest Side'}
        <NumberInput label={$_('modify.shortest_side')} value={ds.shortest_side || 1080} onChange={(v) => appState.updateModify(['downscaling', 'shortest_side'], v)} min={1} max={32768} />
      {:else if ds.mode === 'Longest Side'}
        <NumberInput label={$_('modify.longest_side')} value={ds.longest_side || 1920} onChange={(v) => appState.updateModify(['downscaling', 'longest_side'], v)} min={1} max={32768} />
      {:else if ds.mode === 'Megapixels'}
        <NumberInput label={$_('modify.megapixels_label')} value={ds.megapixels || 2.1} onChange={(v) => appState.updateModify(['downscaling', 'megapixels'], v)} min={0.1} max={1000} step={0.1} />
      {/if}
      <Select value={ds.resample || 'Default'} options={resampleOptions()} onChange={(v) => appState.updateModify(['downscaling', 'resample'], v)} />
    {/if}
  </div>
</LaneCard>
