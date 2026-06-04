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
  const formatOptions = ['JPEG XL', 'AVIF', 'JPEG', 'WebP', 'PNG', 'Lossless JPEG Transcoding', 'JPEG Reconstruction'].map((value) => ({ value, label: value }));
  const normalizeOptions = [
    { value: 'On Fail', label: $_('output.on_fail') },
    { value: 'Always', label: $_('output.always') },
  ];
  const fmt = $derived(appState.outputSettings.format || 'JPEG XL');
  const isJxl = $derived(fmt === 'JPEG XL');
  const isAvif = $derived(fmt === 'AVIF');
  const isWebp = $derived(fmt === 'WebP');
  const supportsLossless = $derived(isJxl || isAvif || isWebp);
  const supportsQuality = $derived(!appState.outputSettings.lossless && (isJxl || isAvif || fmt === 'JPEG' || isWebp));
  const supportsEffort = $derived(supportsLossless && !appState.outputSettings.lossless);
</script>

<LaneCard id="output-format" laneId={laneId} movable header={$_('output.format')}>
  <div class="flex flex-col gap-3">
    <Select value={fmt} options={formatOptions} onChange={(v) => appState.updateOutput('format', v)} />
    {#if supportsLossless}<label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.outputSettings.lossless} onCheckedChange={(v) => appState.updateOutput('lossless', v)} />{$_('output.lossless')}</label>{/if}
    {#if supportsQuality}<NumberInput label={$_('output.quality')} value={appState.outputSettings.quality || 80} onChange={(v) => appState.updateOutput('quality', v)} min={1} max={100} />{/if}
    {#if supportsEffort}<NumberInput label={$_('output.effort')} value={appState.outputSettings.effort || 7} onChange={(v) => appState.updateOutput('effort', v)} min={1} max={10} />{/if}
    {#if isJxl && !appState.outputSettings.lossless}<label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.outputSettings.jxl_modular} onCheckedChange={(v) => appState.updateOutput('jxl_modular', v)} />{$_('settings.jxl_lossy_modular')}</label>{/if}
    {#if isJxl}
      <label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.outputSettings.jxl_png_fallback} onCheckedChange={(v) => appState.updateOutput('jxl_png_fallback', v)} />{$_('output.png_fallback')}</label>
      <label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.outputSettings.jxl_verify} onCheckedChange={(v) => appState.updateOutput('jxl_verify', v)} />{$_('output.verify')}</label>
      <label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.outputSettings.jxl_normalize_enable} onCheckedChange={(v) => appState.updateOutput('jxl_normalize_enable', v)} />{$_('output.normalize')}</label>
      {#if appState.outputSettings.jxl_normalize_enable}<Select value={appState.outputSettings.jxl_normalize_when || 'On Fail'} options={normalizeOptions} onChange={(v) => appState.updateOutput('jxl_normalize_when', v)} />{/if}
    {/if}
    {#if supportsEffort}<label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.outputSettings.intelligent_effort} onCheckedChange={(v) => appState.updateOutput('intelligent_effort', v)} />{$_('output.intelligent_effort')}</label>{/if}
  </div>
</LaneCard>
