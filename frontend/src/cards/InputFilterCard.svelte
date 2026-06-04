<script lang="ts">
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { _ } from 'svelte-i18n';
  import type { LaneId } from '$lib/cards/definitions';

  interface Props { laneId: LaneId }
  let { laneId }: Props = $props();

  function orderOptions() {
    return [
      { value: 'Original', label: $_('settings.original') },
      { value: 'Path Ascending', label: $_('settings.path_ascending') },
      { value: 'Path Descending', label: $_('settings.path_descending') },
      { value: 'Size Ascending', label: $_('settings.size_ascending') },
      { value: 'Size Descending', label: $_('settings.size_descending') },
      { value: 'Random', label: $_('settings.random') },
      { value: 'Sequential', label: $_('settings.sequential') },
    ];
  }
</script>

<LaneCard id="input-filter" laneId={laneId} movable header={$_('input.filter')}>
  <div class="flex flex-col gap-3">
    <div class="flex gap-1 items-center flex-wrap">
      {#each appState.allowedInputList as ext}
        <button
          type="button"
          class={`px-1.5 py-0.5 text-[10px] rounded border transition-colors cursor-pointer font-medium ${appState.excludedFormats.has(ext) ? 'text-text-2 border-[var(--border-2)] bg-transparent' : 'bg-fill-pop text-[var(--bg-2)] border-fill-pop'}`}
          onclick={() => appState.toggleExcludedFormat(ext)}
        >
          .{ext.toUpperCase()}
        </button>
      {/each}
    </div>

    <Select value={appState.appSettings.processing_order || 'Original'} options={orderOptions()} onChange={(value) => appState.updateApp('processing_order', value)} />
  </div>
</LaneCard>
