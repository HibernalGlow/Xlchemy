<script lang="ts">
  import NumberInput from '$lib/components/ui/NumberInput.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { i18n } from '$lib/i18n/t.svelte';
  import type { LaneId } from '$lib/cards/definitions';

  interface Props { laneId: LaneId }
  let { laneId }: Props = $props();
  const t = i18n.t;
  const replaceOptions = ['Replace', 'Skip', 'Rename'].map((value) => ({ value, label: t(value) }));
</script>

<LaneCard id="output-conversion" laneId={laneId} movable header={t('Conversion')}>
  <div class="flex flex-col gap-3">
    <NumberInput label={t('Threads:')} value={appState.outputSettings.threads || appState.cpuCount} onChange={(v) => appState.updateOutput('threads', v)} min={1} max={appState.cpuCount} />
    <Select value={appState.outputSettings.if_file_exists || 'Replace'} options={replaceOptions} onChange={(v) => appState.updateOutput('if_file_exists', v)} />
  </div>
</LaneCard>
