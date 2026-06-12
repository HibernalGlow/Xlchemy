<script lang="ts">
  import { Clock, Timer } from '@lucide/svelte';
  import type { LaneId } from '$lib/cards/definitions';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Checkbox from '$lib/components/ui/Checkbox.svelte';
  import Progress from '$lib/components/ui/Progress.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { _ } from 'svelte-i18n';

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
    if (!appState.isConverting || appState.progress.completed <= 0 || appState.progress.total <= 0) {
      return '--:--';
    }
    const elapsedMs = appState.conversionElapsed;
    const avgPerTask = elapsedMs / appState.progress.completed;
    const remaining = appState.progress.total - appState.progress.completed;
    return formatDuration(remaining * avgPerTask);
  });

  const speed = $derived(() => {
    if (!appState.isConverting || appState.conversionElapsed <= 0 || appState.progress.completed <= 0) {
      return '';
    }
    const perSec = appState.progress.completed / (appState.conversionElapsed / 1000);
    if (perSec >= 1) return `${perSec.toFixed(1)}/s`;
    return `${(perSec * 60).toFixed(1)}/min`;
  });
</script>

<LaneCard id="progress-status" laneId={laneId} movable header={$_('dialog.converting')}>
  <div class="progress-card flex flex-col gap-3">
    <div class="rounded-[18px] border border-border/75 bg-[color-mix(in_oklch,var(--bg-1)_78%,transparent)] p-3 shadow-[inset_0_1px_0_var(--highlight),0_12px_24px_rgba(var(--shadow-color-rgb),0.08)]">
      <div class="mb-3 flex items-center justify-between gap-3">
        <div>
          <div class="text-[11px] tracking-[0.08em] text-text-2">运行状态</div>
          <div class="mt-1 text-sm font-semibold text-text-1">
            {#if appState.isConverting}
              转换进行中
            {:else if appState.progress.total > 0}
              最近一次转换已完成
            {:else}
              等待开始
            {/if}
          </div>
        </div>
        <Badge variant={appState.isConverting ? 'default' : 'secondary'}>
          {#if appState.isConverting}
            运行中
          {:else if appState.progress.total > 0}
            已完成
          {:else}
            待机
          {/if}
        </Badge>
      </div>

      <Progress value={percent} />

      <div class="progress-card__stats mt-3 grid grid-cols-3 gap-2">
        <div class="rounded-[14px] border border-border/65 bg-[color-mix(in_oklch,var(--bg-2)_82%,transparent)] px-3 py-2">
          <div class="text-[10px] tracking-[0.08em] text-text-2">进度</div>
          <div class="mt-1 text-sm font-semibold tabular-nums text-text-1">
            {appState.progress.completed}/{appState.progress.total || 0}
          </div>
        </div>
        <div class="rounded-[14px] border border-border/65 bg-[color-mix(in_oklch,var(--bg-2)_82%,transparent)] px-3 py-2">
          <div class="text-[10px] tracking-[0.08em] text-text-2">已用时间</div>
          <div class="mt-1 text-sm font-semibold tabular-nums text-text-1">{elapsed}</div>
        </div>
        <div class="rounded-[14px] border border-border/65 bg-[color-mix(in_oklch,var(--bg-2)_82%,transparent)] px-3 py-2">
          <div class="text-[10px] tracking-[0.08em] text-text-2">ETA</div>
          <div class="mt-1 text-sm font-semibold tabular-nums text-text-1">
            {appState.isConverting ? eta() : '--:--'}
          </div>
        </div>
      </div>
    </div>

    {#if appState.isConverting || appState.conversionElapsed > 0}
      <div class="flex items-center gap-3 rounded-[16px] border border-border/65 bg-[color-mix(in_oklch,var(--bg-1)_72%,transparent)] px-3 py-2 text-[11px] text-text-2 tabular-nums shadow-[inset_0_1px_0_var(--highlight)]">
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

    {#if appState.progressCurrentFile() || appState.progressSizeChange()}
      <div class="rounded-[16px] border border-border/65 bg-[color-mix(in_oklch,var(--bg-1)_72%,transparent)] px-3 py-2 shadow-[inset_0_1px_0_var(--highlight)]">
        {#if appState.progressCurrentFile()}
          <div class="truncate text-xs font-medium text-text-1">{appState.progressCurrentFile()}</div>
        {/if}
        {#if appState.progressSizeChange()}
          <div class="mt-1 text-[11px] text-text-2">{appState.progressSizeChange()}</div>
        {/if}
      </div>
    {/if}

    <div class="text-xs leading-5 text-text-2">
      {appState.progressSummary() || '添加文件后，这里会显示当前进度、耗时、ETA 和输出摘要。'}
    </div>

    {#if appState.progressCardConfig.showRawLines}
      <div class="flex flex-col gap-1 rounded-[16px] border border-border/65 bg-[color-mix(in_oklch,var(--bg-2)_82%,transparent)] p-2.5 text-[11px] text-text-2">
        <div>{appState.progress.line1 || '—'}</div>
        <div>{appState.progress.line2 || '—'}</div>
      </div>
    {/if}

    <div class="progress-card__toggles grid grid-cols-2 gap-2 rounded-[16px] border border-border/65 bg-[color-mix(in_oklch,var(--bg-1)_72%,transparent)] p-3 text-[11px] text-text-1 shadow-[inset_0_1px_0_var(--highlight)]">
      <label class="flex items-center gap-2"><Checkbox checked={appState.progressCardConfig.showCounter} onCheckedChange={(v) => appState.updateProgressCardConfig('showCounter', v)} /> 计数</label>
      <label class="flex items-center gap-2"><Checkbox checked={appState.progressCardConfig.showSummary} onCheckedChange={(v) => appState.updateProgressCardConfig('showSummary', v)} /> 摘要</label>
      <label class="flex items-center gap-2"><Checkbox checked={appState.progressCardConfig.showEta} onCheckedChange={(v) => appState.updateProgressCardConfig('showEta', v)} /> ETA</label>
      <label class="flex items-center gap-2"><Checkbox checked={appState.progressCardConfig.showFormat} onCheckedChange={(v) => appState.updateProgressCardConfig('showFormat', v)} /> 格式</label>
      <label class="flex items-center gap-2"><Checkbox checked={appState.progressCardConfig.showEncoder} onCheckedChange={(v) => appState.updateProgressCardConfig('showEncoder', v)} /> 编码器</label>
      <label class="flex items-center gap-2"><Checkbox checked={appState.progressCardConfig.showRawLines} onCheckedChange={(v) => appState.updateProgressCardConfig('showRawLines', v)} /> 原始日志</label>
    </div>
  </div>
</LaneCard>
