<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { i18n } from '$lib/i18n/t.svelte';
  import type { LaneId } from '$lib/cards/definitions';

  interface Props { laneId: LaneId }
  let { laneId }: Props = $props();
  const t = i18n.t;
</script>

<LaneCard id="input-files" laneId={laneId} movable header={`${t('Input')} (${appState.fileItems.length})`} grow scrollable>
  <div class="flex flex-col gap-3 h-full">
    <div class="flex gap-1.5 flex-wrap">
      <Button kind="outline" variant="neutral" size="sm" onclick={() => appState.handleAddFiles()}>{t('Add Files')}</Button>
      <Button kind="outline" variant="neutral" size="sm" onclick={() => appState.handleAddFolder()}>{t('Add Folder')}</Button>
      <Button kind="ghost" variant="neutral" size="sm" onclick={() => appState.clearFiles()} disabled={appState.fileItems.length === 0}>{t('Clear')}</Button>
    </div>

    <div class="flex-1 overflow-auto rounded-gb border border-border-2 bg-bg-2">
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b border-border-2">
            <th class="text-left p-1.5 font-medium text-text-2 w-2/5">{t('Name')}</th>
            <th class="text-left p-1.5 font-medium text-text-2 w-[15%]">{t('Ext')}</th>
            <th class="text-left p-1.5 font-medium text-text-2">{t('Location')}</th>
          </tr>
        </thead>
        <tbody>
          {#if appState.sortedItems.length === 0}
            <tr><td colspan="3" class="p-4 text-center text-text-2 text-xs">No files added</td></tr>
          {:else}
            {#each appState.sortedItems as item, i (item.absPath ?? i)}
              <tr class="border-b border-border-2/50 hover:bg-bg-3 transition-colors">
                <td class="p-1.5 text-text-1">{item.name}</td>
                <td class="p-1.5 text-text-2">{item.ext}</td>
                <td class="p-1.5 text-text-2 truncate max-w-[160px]">{item.dir}</td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</LaneCard>
