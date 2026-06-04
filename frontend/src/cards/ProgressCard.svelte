<script lang="ts">
  import Checkbox from '$lib/components/ui/Checkbox.svelte';
  import Progress from '$lib/components/ui/Progress.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { _ } from 'svelte-i18n';
  import type { LaneId } from '$lib/cards/definitions';

  interface Props {
    laneId: LaneId;
  }

  let { laneId }: Props = $props();
  const percent = $derived(appState.progress.total > 0 ? Math.round((appState.progress.completed / appState.progress.total) * 100) : 0);
</script>

<LaneCard id="progress-status" laneId={laneId} movable header={$_('dialog.converting')}>
  <div class="flex flex-col gap-3">
    <Progress value={percent} />
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
