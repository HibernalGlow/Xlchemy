<script lang="ts">
  import Checkbox from '$lib/components/ui/Checkbox.svelte';
  import NumberInput from '$lib/components/ui/NumberInput.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { _ } from 'svelte-i18n';
  import type { LaneId } from '$lib/cards/definitions';

  interface Props { laneId: LaneId }
  let { laneId }: Props = $props();
</script>

<LaneCard id="settings-general" laneId={laneId} movable header={$_('settings.general')}>
  <div class="flex flex-col gap-2">
    <label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.appSettings.disable_downscaling_startup} onCheckedChange={(v) => appState.updateApp('disable_downscaling_startup', v)} />{$_('settings.disable_downscaling_startup')}</label>
    <label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.appSettings.disable_delete_startup} onCheckedChange={(v) => appState.updateApp('disable_delete_startup', v)} />{$_('settings.disable_delete_startup')}</label>
    <label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.appSettings.sorting_disabled} onCheckedChange={(v) => appState.updateApp('sorting_disabled', v)} />{$_('settings.disable_sorting')}</label>
    <label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.appSettings.enable_quality_precision_snapping} onCheckedChange={(v) => appState.updateApp('enable_quality_precision_snapping', v)} />{$_('settings.quality_precision_snapping')}</label>
    <label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.appSettings.play_sound_on_finish} onCheckedChange={(v) => appState.updateApp('play_sound_on_finish', v)} />{$_('settings.play_sound')}</label>
  </div>
</LaneCard>
