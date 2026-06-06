<script lang="ts">
  import Checkbox from '$lib/components/ui/Checkbox.svelte';
  import Progress from '$lib/components/ui/Progress.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { _ } from 'svelte-i18n';
  import type { LaneId } from '$lib/cards/definitions';
  import { Clock, Timer } from '@lucide/svelte';

  interface Props {
    laneId: LaneId;
  }

  let { laneId }: Props = $props();

  const percent = $derived(
    appState.progress.total > 0
      ? Math.round((appState.progress.completed / appState.progress.total) * 100)
      : 0
  );

  function formatDuration(ms: number): string {
    if (ms <= 0) return '00:00';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  const elapsed = $derived(formatDuration(appState.conversionElapsed));

  const eta = $derived(() => {
    if (!appState.isConverting || appState.progress.completed <= 0 || appState.progress.total <= 0) return '--:--';
    const elapsedMs = appState.conversionElapsed;
    const avgPerTask = elapsedMs / appState.progress.completed;
    const remaining = appState.progress.total - appState.progress.completed;
    const etaMs = remaining * avgPerTask;
    return formatDuration(etaMs);
  });

  const speed = $derived(() => {
    if (!appState.isConverting || appState.conversionElapsed <= 0 || appState.progress.completed <= 0) return '';
    const perSec = (appState.progress.completed / (appState.conversionElapsed / 1000));
    if (perSec >= 1) return `${perSec.toFixed(1)}/s`;
    return `${(perSec * 60).toFixed(1)}/min`;
  });
</script>

<LaneCard id="progress-status" laneId={laneId} movable header={$_('dialog.converting')}>
  <div class="flex flex-col gap-3">
    <Progress value={percent} />

    <!-- Timing row -->
    {#if appState.isConverting || appState.conversionElapsed > 0}
      <div class="flex items-center gap-3 text-[11px] text-text-2 tabular-nums">
        <span class="inline-flex items-center gap-1">
          <Clock class="h-3 w-3" />
          <span class="text-text-1">{elapsed}</span>
        </span>
        {#if appState.isConverting && appState.progress.completed > 0}
          <span class="inline-flex items-center gap-1">
            <Timer class="h-3 w-3" />
            <span>ETA {eta()}</span>
          </span>
          <span class="text-text-2">{speed()}</span>
        {/if}
        <span class="ml-auto">{percent}%</span>
      </div>
    {/if}

    <div class="text-xs text-text-2">{appState.progressSummary() || $_('dialog.converting')}</div>

    {#if appState.progressCardConfig.showRawLines}
      <div class="flex flex-col gap-1 rounded-gb border border-border-2 bg-bg-2 p-2 text-[11px] text-text-2">
        <div>{appState.progress.line1 || '—'}</div>
        <div>{appState.progress.line2 || '—'}</div>
      </div>
    {/if}

    <div class="grid grid-cols-2 gap-2 text-[11px] text-text-1">
      <label class="flex items-center gap-2"><Checkbox checked={appState.progressCardConfig.showCounter} onCheckedChange={(v) => appState.updateProgressCardConfig('showCounter', v)} /> Counter</label>
      <label class="flex items-center gap-2"><Checkbox checked={appState.progressCardConfig.showSummary} onCheckedChange={(v) => appState.updateProgressCardConfig('showSummary', v)} /> Summary</label>
      <label class="flex items-center gap-2"><Checkbox checked={appState.progressCardConfig.showEta} onCheckedChange={(v) => appState.updateProgressCardConfig('showEta', v)} /> ETA</label>
      <label class="flex items-center gap-2"><Checkbox checked={appState.progressCardConfig.showFormat} onCheckedChange={(v) => appState.updateProgressCardConfig('showFormat', v)} /> Format</label>
      <label class="flex items-center gap-2"><Checkbox checked={appState.progressCardConfig.showEncoder} onCheckedChange={(v) => appState.updateProgressCardConfig('showEncoder', v)} /> Encoder</label>
      <label class="flex items-center gap-2"><Checkbox checked={appState.progressCardConfig.showRawLines} onCheckedChange={(v) => appState.updateProgressCardConfig('showRawLines', v)} /> Raw lines</label>
    </div>
  </div>
</LaneCard>
