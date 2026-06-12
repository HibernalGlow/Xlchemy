<script lang="ts">
  import { Search, Filter, Trash2, ChevronDown } from '@lucide/svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { appState } from '$lib/state/app.svelte';
  import type { LaneId } from '$lib/cards/definitions';
  import { _ } from 'svelte-i18n';

  interface Props {
    laneId: LaneId;
  }

  let { laneId }: Props = $props();

  let searchQuery = $state('');
  let levelFilter = $state<Set<string>>(new Set(['info', 'warn', 'error', 'success']));
  let autoScroll = $state(true);
  let logContainer = $state<HTMLDivElement | null>(null);

  type LogLevel = 'info' | 'warn' | 'error' | 'success';

  const levelColors: Record<LogLevel, string> = {
    info: 'text-[var(--info,#5b9bd5)]',
    warn: 'text-[var(--warning,#d4a854)]',
    error: 'text-[var(--destructive,#e06060)]',
    success: 'text-[var(--success,#6bc06b)]',
  };

  const levelBadges: Record<LogLevel, string> = {
    info: 'INF',
    warn: 'WRN',
    error: 'ERR',
    success: 'OK ',
  };

  const filteredEntries = $derived(() => {
    const entries = appState.logEntries;
    const q = searchQuery.toLowerCase().trim();
    return entries.filter((entry) => {
      if (!levelFilter.has(entry.level)) return false;
      if (q && !entry.message.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  function toggleLevel(level: string) {
    const next = new Set(levelFilter);
    if (next.has(level)) next.delete(level);
    else next.add(level);
    levelFilter = next;
  }

  function clearLogs() {
    appState.logEntries = [];
  }

  $effect(() => {
    if (autoScroll && logContainer) {
      const entries = filteredEntries();
      // Trigger scroll when entries change
      entries.length;
      requestAnimationFrame(() => {
        if (logContainer) {
          logContainer.scrollTop = logContainer.scrollHeight;
        }
      });
    }
  });
</script>

<LaneCard id="conversion-log" laneId={laneId} movable header={$_('log.title')}>
  <div class="flex flex-col gap-2">
    <!-- Toolbar -->
    <div class="flex items-center gap-1 flex-wrap">
      <!-- Search -->
      <div class="relative flex-1 min-w-[100px]">
        <Search class="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-text-2" />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder={$_('log.search_placeholder')}
          class="w-full pl-6 pr-2 py-1 text-[11px] rounded-md border border-border-2 bg-bg-2 text-text-1 placeholder:text-text-2 outline-none focus:border-fill-pop-bg"
        />
      </div>

      <!-- Level filters -->
      <div class="flex gap-0.5">
        {#each ['info', 'warn', 'error', 'success'] as level}
          <button
            type="button"
            class="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded border transition-colors cursor-pointer
              {levelFilter.has(level) ? 'border-current opacity-100' : 'border-border-2 opacity-40'}
              {levelColors[level as LogLevel]}"
            onclick={() => toggleLevel(level as string)}
          >
            {levelBadges[level as LogLevel]}
          </button>
        {/each}
      </div>

      <!-- Clear -->
      <Button kind="ghost" variant="neutral" size="icon" class="h-6 w-6" title={$_('log.clear')} onclick={clearLogs}>
        <Trash2 class="h-3 w-3" />
      </Button>
    </div>

    <!-- Log entries -->
    <div
      bind:this={logContainer}
      class="rounded-gb border border-border-2 bg-bg-2/80 overflow-auto font-mono text-[10px] leading-relaxed"
      style="max-height: 200px; min-height: 80px;"
    >
      {#if filteredEntries().length === 0}
        <div class="flex items-center justify-center h-[80px] text-text-2">
          {appState.logEntries.length === 0 ? $_('log.no_entries') : $_('log.no_matches')}
        </div>
      {:else}
        <div class="py-1">
          {#each filteredEntries() as entry, i (i)}
            <div class="flex items-start gap-1.5 px-2 py-0.5 hover:bg-bg-3/50 transition-colors">
              <span class="shrink-0 text-text-2 tabular-nums">{entry.time}</span>
              <span class="shrink-0 font-bold {levelColors[entry.level as LogLevel]}">{levelBadges[entry.level as LogLevel]}</span>
              <span class="text-text-1 break-all min-w-0">{entry.message}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Status bar -->
    <div class="flex items-center justify-between text-[10px] text-text-2">
      <span>{filteredEntries().length} / {appState.logEntries.length} {$_('common.entries')}</span>
      <label class="flex items-center gap-1 cursor-pointer">
        <input type="checkbox" bind:checked={autoScroll} class="h-3 w-3 accent-fill-pop-bg" />
        {$_('log.auto_scroll')}
      </label>
    </div>
  </div>
</LaneCard>
