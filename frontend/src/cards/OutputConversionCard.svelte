<script lang="ts">
  import NumberInput from '$lib/components/ui/NumberInput.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { _ } from 'svelte-i18n';
  import type { LaneId } from '$lib/cards/definitions';

  interface Props { laneId: LaneId }
  let { laneId }: Props = $props();
  const replaceOptions = [
    { value: 'Replace', label: $_('output.replace') },
    { value: 'Skip', label: $_('output.skip') },
    { value: 'Rename', label: $_('output.rename') },
  ];
</script>

<LaneCard id="output-conversion" laneId={laneId} movable header={$_('output.conversion')}>
  <div class="flex flex-col gap-3">
    <NumberInput label={$_('output.threads')} value={appState.outputSettings.threads || appState.cpuCount} onChange={(v) => appState.updateOutput('threads', v)} min={1} max={appState.cpuCount} />
    <Select value={appState.outputSettings.if_file_exists || 'Replace'} options={replaceOptions} onChange={(v) => appState.updateOutput('if_file_exists', v)} />
  </div>
</LaneCard>
