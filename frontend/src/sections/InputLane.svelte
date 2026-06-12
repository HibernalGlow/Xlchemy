<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import { FilePlus, FolderPlus, Trash2 } from '@lucide/svelte';
  import { appState } from '$lib/state/app.svelte';
  import { _ } from 'svelte-i18n';

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

<div class="flex flex-col gap-2 h-full">
  <LaneCard id="input-files" header={`${$_('nav.input')} (${appState.fileItems.length})`} grow>
    <div class="flex flex-col gap-3 h-full">
      <div class="flex gap-1.5 flex-wrap">
        <Button kind="outline" variant="neutral" size="sm" onclick={() => appState.handleAddFiles()}><FilePlus class="w-3 h-3" />{$_('input.add_files')}</Button>
        <Button kind="outline" variant="neutral" size="sm" onclick={() => appState.handleAddFolder()}><FolderPlus class="w-3 h-3" />{$_('input.add_folder')}</Button>
        <Button kind="ghost" variant="neutral" size="sm" onclick={() => appState.clearFiles()} disabled={appState.fileItems.length === 0}><Trash2 class="w-3 h-3" />{$_('input.clear')}</Button>
      </div>

      <div class="flex-1 overflow-auto rounded-gb border border-border-2 bg-bg-2">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-border-2">
              <th class="text-left p-1.5 font-medium text-text-2 w-2/5">{$_('input.name')}</th>
              <th class="text-left p-1.5 font-medium text-text-2 w-[15%]">{$_('input.ext')}</th>
              <th class="text-left p-1.5 font-medium text-text-2">{$_('input.location')}</th>
            </tr>
          </thead>
          <tbody>
            {#if appState.sortedItems.length === 0}
              <tr>
                <td colspan="3" class="p-4 text-center text-text-2 text-xs">{$_('layout_misc.no_files')}</td>
              </tr>
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

  <LaneCard id="input-filter" header={$_('input.filter')}>
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

      <Select
        value={appState.appSettings.processing_order || 'Original'}
        options={orderOptions()}
        onChange={(value) => appState.updateApp('processing_order', value)}
      />
    </div>
  </LaneCard>
</div>
