<script lang="ts">
  import NumberInput from '$lib/components/ui/NumberInput.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { i18n } from '$lib/i18n/t.svelte';
  import type { LaneId } from '$lib/cards/definitions';

  interface Props { laneId: LaneId }
  let { laneId }: Props = $props();
  const t = i18n.t;
</script>

<LaneCard id="settings-frontend" laneId={laneId} movable header={t('Frontend')}>
  <div class="flex flex-col gap-2">
    <NumberInput label={t('Lane max width:')} value={appState.appSettings.lane_max_width || 44} onChange={(v) => appState.updateApp('lane_max_width', v)} min={24} max={80} />
  </div>
</LaneCard>
