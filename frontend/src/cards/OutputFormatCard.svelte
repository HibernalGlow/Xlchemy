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
  const formatOptions = ['JPEG XL', 'AVIF', 'JPEG', 'WebP', 'PNG', 'Lossless JPEG Transcoding', 'JPEG Reconstruction'].map((value) => ({ value, label: value }));
  const normalizeOptions = ['On Fail', 'Always'].map((value) => ({ value, label: t(value) }));
  const fmt = $derived(appState.outputSettings.format || 'JPEG XL');
  const isJxl = $derived(fmt === 'JPEG XL');
  const isAvif = $derived(fmt === 'AVIF');
  const isWebp = $derived(fmt === 'WebP');
  const supportsLossless = $derived(isJxl || isAvif || isWebp);
  const supportsQuality = $derived(!appState.outputSettings.lossless && (isJxl || isAvif || fmt === 'JPEG' || isWebp));
  const supportsEffort = $derived(supportsLossless && !appState.outputSettings.lossless);
</script>

<LaneCard id="output-format" laneId={laneId} movable header={t('Format')}>
  <div class="flex flex-col gap-3">
    <Select value={fmt} options={formatOptions} onChange={(v) => appState.updateOutput('format', v)} />
    {#if supportsLossless}<label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.outputSettings.lossless} onCheckedChange={(v) => appState.updateOutput('lossless', v)} />{t('Lossless')}</label>{/if}
    {#if supportsQuality}<NumberInput label={t('Quality:')} value={appState.outputSettings.quality || 80} onChange={(v) => appState.updateOutput('quality', v)} min={1} max={100} />{/if}
    {#if supportsEffort}<NumberInput label={t('Effort:')} value={appState.outputSettings.effort || 7} onChange={(v) => appState.updateOutput('effort', v)} min={1} max={10} />{/if}
    {#if isJxl && !appState.outputSettings.lossless}<label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.outputSettings.jxl_modular} onCheckedChange={(v) => appState.updateOutput('jxl_modular', v)} />{t('JXL lossy modular')}</label>{/if}
    {#if isJxl}
      <label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.outputSettings.jxl_png_fallback} onCheckedChange={(v) => appState.updateOutput('jxl_png_fallback', v)} />{t('PNG fallback')}</label>
      <label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.outputSettings.jxl_verify} onCheckedChange={(v) => appState.updateOutput('jxl_verify', v)} />{t('Verify')}</label>
      <label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.outputSettings.jxl_normalize_enable} onCheckedChange={(v) => appState.updateOutput('jxl_normalize_enable', v)} />{t('Normalize')}</label>
      {#if appState.outputSettings.jxl_normalize_enable}<Select value={appState.outputSettings.jxl_normalize_when || 'On Fail'} options={normalizeOptions} onChange={(v) => appState.updateOutput('jxl_normalize_when', v)} />{/if}
    {/if}
    {#if supportsEffort}<label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.outputSettings.intelligent_effort} onCheckedChange={(v) => appState.updateOutput('intelligent_effort', v)} />{t('Intelligent effort')}</label>{/if}
  </div>
</LaneCard>
