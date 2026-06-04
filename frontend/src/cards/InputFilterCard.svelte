<script lang="ts">
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { i18n } from '$lib/i18n/t.svelte';
  import type { LaneId } from '$lib/cards/definitions';

  interface Props { laneId: LaneId }
  let { laneId }: Props = $props();
  const t = i18n.t;

  function orderOptions() {
    return [
      { value: 'Original', label: t('Original') },
      { value: 'Path Ascending', label: t('Path Ascending') },
      { value: 'Path Descending', label: t('Path Descending') },
      { value: 'Size Ascending', label: t('Size Ascending') },
      { value: 'Size Descending', label: t('Size Descending') },
      { value: 'Random', label: t('Random') },
      { value: 'Sequential', label: t('Sequential') },
    ];
  }
</script>

<LaneCard id="input-filter" laneId={laneId} movable header={t('Filter')}>
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
