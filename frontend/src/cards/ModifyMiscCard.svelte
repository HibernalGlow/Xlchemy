<script lang="ts">
  import Checkbox from '$lib/components/ui/Checkbox.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { _ } from 'svelte-i18n';
  import type { LaneId } from '$lib/cards/definitions';

  interface Props { laneId: LaneId }
  let { laneId }: Props = $props();
  const misc = $derived(appState.modifySettings.misc || {});
  const metadataOptions = [
    { value: 'Encoder - Wipe', label: $_('modify.encoder_wipe') },
    { value: 'Encoder - Preserve', label: $_('modify.encoder_preserve') },
    { value: 'ExifTool - Wipe', label: $_('modify.exiftool_wipe') },
    { value: 'ExifTool - Preserve', label: $_('modify.exiftool_preserve') },
    { value: 'ExifTool - Unsafe Wipe', label: $_('modify.exiftool_unsafe_wipe') },
    { value: 'ExifTool - Custom', label: $_('modify.exiftool_custom') },
  ];
</script>

<LaneCard id="modify-misc" laneId={laneId} movable header={$_('modify.misc')}>
  <div class="flex flex-col gap-3">
    <Select value={misc.keep_metadata || 'Encoder - Wipe'} options={metadataOptions} onChange={(v) => appState.updateModify(['misc', 'keep_metadata'], v)} />
    <label class="flex items-center gap-2 text-[11px] text-text-1"><Checkbox checked={!!misc.keep_timestamps} onCheckedChange={(v) => appState.updateModify(['misc', 'keep_timestamps'], v)} />{$_('modify.keep_timestamps')}</label>
  </div>
</LaneCard>
