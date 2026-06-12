<script lang="ts">
  import Checkbox from '$lib/components/ui/Checkbox.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { FolderDot, FolderOpen } from '@lucide/svelte';
  import { appState } from '$lib/state/app.svelte';
  import { _ } from 'svelte-i18n';
  import type { LaneId } from '$lib/cards/definitions';

  interface Props { laneId: LaneId }
  let { laneId }: Props = $props();
</script>

<LaneCard id="output-save" laneId={laneId} movable header={$_('output.save_to')}>
  <div class="flex flex-col gap-3">
    <div class="flex gap-2 flex-wrap">
      <button type="button" class={`flex items-center gap-1 px-2 py-1 rounded-gb text-xs border ${!appState.outputSettings.custom_output_dir ? 'border-fill-pop bg-fill-pop/10 text-fill-pop' : 'border-border-2 text-text-2'}`} onclick={() => appState.updateOutput('custom_output_dir', false)}><FolderDot class="w-3 h-3" />{$_('output.next_to_source')}</button>
      <button type="button" class={`flex items-center gap-1 px-2 py-1 rounded-gb text-xs border ${appState.outputSettings.custom_output_dir ? 'border-fill-pop bg-fill-pop/10 text-fill-pop' : 'border-border-2 text-text-2'}`} onclick={() => appState.updateOutput('custom_output_dir', true)}><FolderOpen class="w-3 h-3" />{$_('output.custom_folder')}</button>
    </div>
    {#if appState.outputSettings.custom_output_dir}<Input value={appState.outputSettings.custom_output_dir_path || ''} placeholder={$_('output.output_path')} oninput={(e) => appState.updateOutput('custom_output_dir_path', (e.currentTarget as HTMLInputElement).value)} />{/if}
    <label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.outputSettings.keep_dir_struct} onCheckedChange={(v) => appState.updateOutput('keep_dir_struct', v)} />{$_('output.keep_folder_structure')}</label>
    <label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.outputSettings.delete_original} onCheckedChange={(v) => appState.updateOutput('delete_original', v)} />{$_('output.delete_original')}</label>
    {#if appState.outputSettings.delete_original}<Select value={appState.outputSettings.delete_original_mode || 'To Trash'} options={[{ value: 'To Trash', label: $_('output.to_trash') }, { value: 'Permanently', label: $_('output.permanently') }]} onChange={(v) => appState.updateOutput('delete_original_mode', v)} />{/if}
  </div>
</LaneCard>
