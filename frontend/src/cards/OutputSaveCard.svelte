<script lang="ts">
  import Checkbox from '$lib/components/ui/Checkbox.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { i18n } from '$lib/i18n/t.svelte';
  import type { LaneId } from '$lib/cards/definitions';

  interface Props { laneId: LaneId }
  let { laneId }: Props = $props();
  const t = i18n.t;
</script>

<LaneCard id="output-save" laneId={laneId} movable header={t('Save To')}>
  <div class="flex flex-col gap-3">
    <div class="flex gap-2 flex-wrap">
      <button type="button" class={`px-2 py-1 rounded-gb text-xs border ${!appState.outputSettings.custom_output_dir ? 'border-fill-pop bg-fill-pop/10 text-fill-pop' : 'border-border-2 text-text-2'}`} onclick={() => appState.updateOutput('custom_output_dir', false)}>{t('Next to source')}</button>
      <button type="button" class={`px-2 py-1 rounded-gb text-xs border ${appState.outputSettings.custom_output_dir ? 'border-fill-pop bg-fill-pop/10 text-fill-pop' : 'border-border-2 text-text-2'}`} onclick={() => appState.updateOutput('custom_output_dir', true)}>{t('Custom folder')}</button>
    </div>
    {#if appState.outputSettings.custom_output_dir}<Input value={appState.outputSettings.custom_output_dir_path || ''} placeholder={t('Output path...')} oninput={(e) => appState.updateOutput('custom_output_dir_path', (e.currentTarget as HTMLInputElement).value)} />{/if}
    <label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.outputSettings.keep_dir_struct} onCheckedChange={(v) => appState.updateOutput('keep_dir_struct', v)} />{t('Keep folder structure')}</label>
    <label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.outputSettings.delete_original} onCheckedChange={(v) => appState.updateOutput('delete_original', v)} />{t('Delete original')}</label>
    {#if appState.outputSettings.delete_original}<Select value={appState.outputSettings.delete_original_mode || 'To Trash'} options={[{ value: 'To Trash', label: t('To Trash') }, { value: 'Permanently', label: t('Permanently') }]} onChange={(v) => appState.updateOutput('delete_original_mode', v)} />{/if}
  </div>
</LaneCard>
