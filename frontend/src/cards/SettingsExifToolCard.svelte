<script lang="ts">
  import Textarea from '$lib/components/ui/Textarea.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { i18n } from '$lib/i18n/t.svelte';
  import type { LaneId } from '$lib/cards/definitions';

  interface Props { laneId: LaneId }
  let { laneId }: Props = $props();
  const t = i18n.t;
</script>

<LaneCard id="settings-exiftool" laneId={laneId} movable header={t('ExifTool')}>
  <div class="flex flex-col gap-2">
    {#each [
      ['ExifTool - Wipe', t('Wipe command:')],
      ['ExifTool - Preserve', t('Preserve command:')],
      ['ExifTool - Unsafe Wipe', t('Unsafe Wipe command:')],
      ['ExifTool - Custom', t('Custom command:')],
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
