<script lang="ts">
  import Checkbox from '$lib/components/ui/Checkbox.svelte';
  import NumberInput from '$lib/components/ui/NumberInput.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { i18n } from '$lib/i18n/t.svelte';
  import type { LaneId } from '$lib/cards/definitions';

  interface Props { laneId: LaneId }
  let { laneId }: Props = $props();
  const t = i18n.t;
</script>

<LaneCard id="settings-general" laneId={laneId} movable header={t('General')}>
  <div class="flex flex-col gap-2">
    <label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.appSettings.disable_downscaling_startup} onCheckedChange={(v) => appState.updateApp('disable_downscaling_startup', v)} />{t('Disable downscaling on startup')}</label>
    <label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.appSettings.disable_delete_startup} onCheckedChange={(v) => appState.updateApp('disable_delete_startup', v)} />{t('Disable delete original on startup')}</label>
    <label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.appSettings.sorting_disabled} onCheckedChange={(v) => appState.updateApp('sorting_disabled', v)} />{t('Disable sorting')}</label>
    <label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.appSettings.enable_quality_precision_snapping} onCheckedChange={(v) => appState.updateApp('enable_quality_precision_snapping', v)} />{t('Quality precision snapping')}</label>
    <label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.appSettings.play_sound_on_finish} onCheckedChange={(v) => appState.updateApp('play_sound_on_finish', v)} />{t('Play sound on finish')}</label>
  </div>
</LaneCard>
