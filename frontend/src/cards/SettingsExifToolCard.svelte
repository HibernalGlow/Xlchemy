<script lang="ts">
  import Textarea from '$lib/components/ui/Textarea.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { _ } from 'svelte-i18n';
  import type { LaneId } from '$lib/cards/definitions';

  interface Props { laneId: LaneId }
  let { laneId }: Props = $props();
</script>

<LaneCard id="settings-exiftool" laneId={laneId} movable header={$_('settings.exiftool')}>
  <div class="flex flex-col gap-2">
    {#each [
      ['ExifTool - Wipe', $_('settings.wipe_command')],
      ['ExifTool - Preserve', $_('settings.preserve_command')],
      ['ExifTool - Unsafe Wipe', $_('settings.unsafe_wipe_command')],
      ['ExifTool - Custom', $_('settings.custom_command')],
    ] as [string, string][] as item}
      {@const key = item[0]}
      {@const label = item[1]}
      <div class="flex flex-col gap-1">
        <span class="text-[11px] text-text-2">{label}</span>
        <Textarea
          value={appState.appSettings.exiftool_args?.[key] || ''}
          onchange={(e) => appState.updateApp('exiftool_args', { ...(appState.appSettings.exiftool_args || {}), [key]: (e.currentTarget as HTMLTextAreaElement).value })}
          class="min-h-[40px] text-xs font-mono"
        />
      </div>
    {/each}
  </div>
</LaneCard>
