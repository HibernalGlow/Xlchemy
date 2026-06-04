<script lang="ts">
  import Checkbox from '$lib/components/ui/Checkbox.svelte';
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
    {#each [
      ['disable_downscaling_startup', t('Disable downscaling on startup')],
      ['disable_delete_startup', t('Disable delete original on startup')],
      ['sorting_disabled', t('Disable sorting')],
      ['enable_quality_precision_snapping', t('Quality precision snapping')],
      ['play_sound_on_finish', t('Play sound on finish')],
    ] as [key, label]}
      <label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!appState.appSettings[key]} onCheckedChange={(v) => appState.updateApp(key, v)} />{label}</label>
    {/each}
  </div>
</LaneCard>
