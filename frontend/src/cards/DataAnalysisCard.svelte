<script lang="ts">
  import { BarChart3, FileText, FolderOpen, HardDrive } from '@lucide/svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { _ } from 'svelte-i18n';
  import type { LaneId } from '$lib/cards/definitions';

  interface Props { laneId: LaneId }
  let { laneId }: Props = $props();

  let activeTab = $state<'input' | 'output'>('input');

  // ── Helpers ──
  function formatSize(bytes: number): string {
    if (bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  function formatNum(n: number): string {
    return n.toLocaleString();
  }

  // ── Input Stats ──
  const inputStats = $derived.by(() => {
    const files = appState.fileItems;
    const totalFiles = files.length;
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    const formatMap = new Map<string, { count: number; size: number }>();
    const folderMap = new Map<string, { count: number; size: number }>();

    for (const f of files) {
      const ext = f.ext || 'unknown';
      const cur = formatMap.get(ext) ?? { count: 0, size: 0 };
      cur.count++;
      cur.size += f.size;
      formatMap.set(ext, cur);

      const folder = f.dir.split(/[\\/]/).pop() || '/';
      const fc = folderMap.get(folder) ?? { count: 0, size: 0 };
      fc.count++;
      fc.size += f.size;
      folderMap.set(folder, fc);
    }

    const formats = [...formatMap.entries()]
      .map(([ext, data]) => ({ ext, ...data }))
      .sort((a, b) => b.size - a.size);

    const folders = [...folderMap.entries()]
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 6);

    const sizes = files.map((f) => f.size).sort((a, b) => a - b);
    const avgSize = totalFiles > 0 ? Math.round(totalSize / totalFiles) : 0;
    const minSize = sizes[0] ?? 0;
    const maxSize = sizes[sizes.length - 1] ?? 0;
    const medianSize = totalFiles > 0 ? sizes[Math.floor(sizes.length / 2)] : 0;

    return { totalFiles, totalSize, formats, folders, avgSize, minSize, maxSize, medianSize };
  });

  // ── Output Stats ──
  const outputStats = $derived.by(() => {
    const results = appState.conversionResults;
    const failedCount = appState.exceptions.length;
    const successCount = results.length;
    const total = successCount + failedCount;

    const totalSrcSize = results.reduce((sum, r) => sum + r.srcSize, 0);
    const totalDstSize = results.reduce((sum, r) => sum + r.dstSize, 0);
    const savedBytes = totalSrcSize - totalDstSize;
    const ratio = totalSrcSize > 0 ? totalDstSize / totalSrcSize : 0;
    const savedPercent = totalSrcSize > 0 ? (1 - ratio) * 100 : 0;

    const formatMap = new Map<string, { count: number; srcSize: number; dstSize: number }>();
    for (const r of results) {
      const ext = r.inputExt || 'unknown';
      const cur = formatMap.get(ext) ?? { count: 0, srcSize: 0, dstSize: 0 };
      cur.count++;
      cur.srcSize += r.srcSize;
      cur.dstSize += r.dstSize;
      formatMap.set(ext, cur);
    }

    const formatBreakdown = [...formatMap.entries()]
      .map(([ext, data]) => ({
        ext,
        ...data,
        ratio: data.srcSize > 0 ? data.dstSize / data.srcSize : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const elapsed = appState.conversionElapsed;
    const avgTime = successCount > 0 ? elapsed / successCount : 0;
    const speed = elapsed > 0 ? (successCount / elapsed) * 1000 : 0;

    return {
      successCount, failedCount, total,
      totalSrcSize, totalDstSize, savedBytes, savedPercent, ratio,
      formatBreakdown, avgTime, speed,
    };
  });

  const maxFormatSize = $derived(Math.max(...inputStats.formats.map((f) => f.size), 1));
  const maxFolderSize = $derived(Math.max(...inputStats.folders.map((f) => f.size), 1));
</script>

<LaneCard id="data-analysis" laneId={laneId} movable header={$_('analysis.title')}>
  <div class="analysis">
    <!-- Tabs -->
    <div class="analysis__tabs">
      <button
        type="button"
        class="analysis__tab"
        class:analysis__tab--active={activeTab === 'input'}
        onclick={() => (activeTab = 'input')}
      >
        <FolderOpen class="w-3 h-3" />
        {$_('analysis.input_tab')}
      </button>
      <button
        type="button"
        class="analysis__tab"
        class:analysis__tab--active={activeTab === 'output'}
        onclick={() => (activeTab = 'output')}
      >
        <BarChart3 class="w-3 h-3" />
        {$_('analysis.output_tab')}
      </button>
    </div>

    <!-- Input Tab -->
    {#if activeTab === 'input'}
      {#if inputStats.totalFiles === 0}
        <div class="analysis__empty">{$_('analysis.no_files')}</div>
      {:else}
        <!-- Summary -->
        <div class="analysis__summary">
          <div class="analysis__stat">
            <span class="analysis__stat-value">{formatNum(inputStats.totalFiles)}</span>
            <span class="analysis__stat-label">{$_('analysis.files')}</span>
          </div>
          <div class="analysis__stat">
            <span class="analysis__stat-value">{formatSize(inputStats.totalSize)}</span>
            <span class="analysis__stat-label">{$_('analysis.total_size')}</span>
          </div>
          <div class="analysis__stat">
            <span class="analysis__stat-value">{formatSize(inputStats.avgSize)}</span>
            <span class="analysis__stat-label">{$_('analysis.avg_size')}</span>
          </div>
        </div>

        <!-- Size Range -->
        <div class="analysis__section">
          <span class="analysis__section-title">{$_('analysis.size_range')}</span>
          <div class="analysis__range">
            <span>{formatSize(inputStats.minSize)}</span>
            <span class="analysis__range-mid">{formatSize(inputStats.medianSize)} (median)</span>
            <span>{formatSize(inputStats.maxSize)}</span>
          </div>
        </div>

        <!-- Format Distribution -->
        <div class="analysis__section">
          <span class="analysis__section-title">{$_('analysis.format_dist')}</span>
          <div class="analysis__bars">
            {#each inputStats.formats as fmt}
              <div class="analysis__bar-row">
                <span class="analysis__bar-label">.{fmt.ext}</span>
                <div class="analysis__bar-track">
                  <div
                    class="analysis__bar-fill"
                    style="width: {(fmt.size / maxFormatSize) * 100}%;"
                  ></div>
                </div>
                <span class="analysis__bar-value">{fmt.count} · {formatSize(fmt.size)}</span>
              </div>
            {/each}
          </div>
        </div>

        <!-- Folder Breakdown -->
        {#if inputStats.folders.length > 0}
          <div class="analysis__section">
            <span class="analysis__section-title">{$_('analysis.folder_dist')}</span>
            <div class="analysis__bars">
              {#each inputStats.folders as folder}
                <div class="analysis__bar-row">
                  <span class="analysis__bar-label analysis__bar-label--folder" title={folder.name}>{folder.name}</span>
                  <div class="analysis__bar-track">
                    <div
                      class="analysis__bar-fill analysis__bar-fill--accent"
                      style="width: {(folder.size / maxFolderSize) * 100}%;"
                    ></div>
                  </div>
                  <span class="analysis__bar-value">{folder.count} · {formatSize(folder.size)}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      {/if}
    {/if}

    <!-- Output Tab -->
    {#if activeTab === 'output'}
      {#if outputStats.total === 0}
        <div class="analysis__empty">{$_('analysis.no_results')}</div>
      {:else}
        <!-- Summary -->
        <div class="analysis__summary">
          <div class="analysis__stat analysis__stat--highlight">
            <span class="analysis__stat-value">{outputStats.savedPercent.toFixed(1)}%</span>
            <span class="analysis__stat-label">{$_('analysis.space_saved')}</span>
          </div>
          <div class="analysis__stat">
            <span class="analysis__stat-value">{formatSize(outputStats.savedBytes)}</span>
            <span class="analysis__stat-label">{$_('analysis.bytes_saved')}</span>
          </div>
          <div class="analysis__stat">
            <span class="analysis__stat-value">{outputStats.successCount}/{outputStats.total}</span>
            <span class="analysis__stat-label">{$_('analysis.success_rate')}</span>
          </div>
        </div>

        <!-- Speed -->
        {#if outputStats.speed > 0}
          <div class="analysis__section">
            <span class="analysis__section-title">{$_('analysis.performance')}</span>
            <div class="analysis__kv">
              <div class="analysis__kv-item">
                <span class="analysis__kv-label">{$_('analysis.speed')}</span>
                <span class="analysis__kv-value">{outputStats.speed.toFixed(1)} {$_('analysis.files_per_sec')}</span>
              </div>
              <div class="analysis__kv-item">
                <span class="analysis__kv-label">{$_('analysis.avg_time')}</span>
                <span class="analysis__kv-value">{(outputStats.avgTime / 1000).toFixed(1)}s</span>
              </div>
              <div class="analysis__kv-item">
                <span class="analysis__kv-label">{$_('analysis.total_time')}</span>
                <span class="analysis__kv-value">{(appState.conversionElapsed / 1000).toFixed(1)}s</span>
              </div>
            </div>
          </div>
        {/if}

        <!-- Format Breakdown -->
        {#if outputStats.formatBreakdown.length > 0}
          <div class="analysis__section">
            <span class="analysis__section-title">{$_('analysis.format_breakdown')}</span>
            <div class="analysis__bars">
              {#each outputStats.formatBreakdown as fmt}
                <div class="analysis__bar-row">
                  <span class="analysis__bar-label">.{fmt.ext}</span>
                  <div class="analysis__bar-track">
                    <div
                      class="analysis__bar-fill analysis__bar-fill--ratio"
                      style="width: {fmt.ratio * 100}%;"
                    ></div>
                  </div>
                  <span class="analysis__bar-value">
                    {fmt.count} · {((1 - fmt.ratio) * 100).toFixed(0)}% ↓
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Size comparison -->
        <div class="analysis__section">
          <span class="analysis__section-title">{$_('analysis.size_comparison')}</span>
          <div class="analysis__compare">
            <div class="analysis__compare-bar">
              <div class="analysis__compare-src" style="flex: 1;">
                <span class="analysis__compare-label">{$_('analysis.before')}: {formatSize(outputStats.totalSrcSize)}</span>
              </div>
            </div>
            <div class="analysis__compare-bar">
              <div
                class="analysis__compare-dst"
                style="flex: {Math.max(outputStats.ratio, 0.02)};"
              >
                <span class="analysis__compare-label">{$_('analysis.after')}: {formatSize(outputStats.totalDstSize)}</span>
              </div>
            </div>
          </div>
        </div>
      {/if}
    {/if}
  </div>
</LaneCard>

<style>
  .analysis {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 11px;
  }

  .analysis__tabs {
    display: flex;
    gap: 2px;
    background: var(--bg-2);
    border-radius: 6px;
    padding: 2px;
  }

  .analysis__tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 4px 8px;
    font-size: 10px;
    font-weight: 500;
    color: var(--text-2);
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.12s ease;
  }

  .analysis__tab:hover {
    color: var(--text-1);
  }

  .analysis__tab--active {
    color: var(--text-1);
    background: var(--bg-1);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  }

  .analysis__empty {
    text-align: center;
    padding: 20px 8px;
    color: var(--text-2);
    font-size: 11px;
  }

  .analysis__summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  .analysis__stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 6px 4px;
    background: var(--bg-2);
    border-radius: 6px;
  }

  .analysis__stat--highlight {
    background: color-mix(in oklch, var(--fill-pop-bg) 8%, var(--bg-2));
  }

  .analysis__stat-value {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-1);
    font-variant-numeric: tabular-nums;
  }

  .analysis__stat--highlight .analysis__stat-value {
    color: var(--fill-pop-bg);
  }

  .analysis__stat-label {
    font-size: 9px;
    font-weight: 500;
    color: var(--text-2);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .analysis__section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .analysis__section-title {
    font-size: 9px;
    font-weight: 600;
    color: var(--text-2);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding-bottom: 2px;
  }

  .analysis__range {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: var(--text-2);
    padding: 2px 0;
  }

  .analysis__range-mid {
    color: var(--text-1);
    font-weight: 500;
  }

  .analysis__bars {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .analysis__bar-row {
    display: grid;
    grid-template-columns: 56px 1fr 72px;
    align-items: center;
    gap: 6px;
    height: 16px;
  }

  .analysis__bar-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: right;
  }

  .analysis__bar-label--folder {
    font-weight: 500;
    font-size: 9px;
  }

  .analysis__bar-track {
    height: 10px;
    background: var(--bg-2);
    border-radius: 3px;
    overflow: hidden;
  }

  .analysis__bar-fill {
    height: 100%;
    background: var(--fill-pop-bg);
    border-radius: 3px;
    transition: width 0.3s ease;
    min-width: 2px;
  }

  .analysis__bar-fill--accent {
    background: var(--fill-accent);
  }

  .analysis__bar-fill--ratio {
    background: color-mix(in oklch, var(--fill-pop-bg) 60%, var(--fill-accent));
  }

  .analysis__bar-value {
    font-size: 9px;
    color: var(--text-2);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .analysis__kv {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .analysis__kv-item {
    display: flex;
    justify-content: space-between;
    padding: 2px 0;
  }

  .analysis__kv-label {
    font-size: 10px;
    color: var(--text-2);
  }

  .analysis__kv-value {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-1);
    font-variant-numeric: tabular-nums;
  }

  .analysis__compare {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .analysis__compare-bar {
    display: flex;
    height: 18px;
    border-radius: 4px;
    overflow: hidden;
    background: var(--bg-2);
  }

  .analysis__compare-src {
    background: color-mix(in oklch, var(--text-2) 30%, transparent);
    display: flex;
    align-items: center;
    padding: 0 6px;
    border-radius: 4px;
  }

  .analysis__compare-dst {
    background: color-mix(in oklch, var(--fill-pop-bg) 35%, transparent);
    display: flex;
    align-items: center;
    padding: 0 6px;
    border-radius: 4px;
    transition: flex 0.3s ease;
  }

  .analysis__compare-label {
    font-size: 9px;
    font-weight: 500;
    color: var(--text-1);
    white-space: nowrap;
  }
</style>
