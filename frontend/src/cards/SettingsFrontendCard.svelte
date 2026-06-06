<script lang="ts">
  import NumberInput from '$lib/components/ui/NumberInput.svelte';
  import Checkbox from '$lib/components/ui/Checkbox.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { _ } from 'svelte-i18n';
  import type { LaneId } from '$lib/cards/definitions';

  interface Props { laneId: LaneId }
  let { laneId }: Props = $props();
</script>

<LaneCard id="settings-frontend" laneId={laneId} movable header={$_('settings.frontend')}>
  <div class="flex flex-col gap-2">
    <NumberInput label={$_('settings.lane_max_width')} value={appState.appSettings.lane_max_width || 44} onChange={(v) => appState.updateApp('lane_max_width', v)} min={24} max={80} />

    <div class="flex items-center gap-2 px-1 py-1">
      <Checkbox
        checked={appState.appSettings.lane_auto_fit}
        onCheckedChange={(checked) => appState.updateApp('lane_auto_fit', checked)}
      />
      <span class="text-xs text-text-1">{$_('settings.lane_auto_fit')}</span>
    </div>

    <div class="flex items-center gap-2 px-1 py-1">
      <Checkbox
        checked={appState.appSettings.auto_clear_completed}
        onCheckedChange={(checked) => appState.updateApp('auto_clear_completed', checked)}
      />
      <span class="text-xs text-text-1">{$_('settings.auto_clear_completed')}</span>
    </div>
  </div>
</LaneCard>
