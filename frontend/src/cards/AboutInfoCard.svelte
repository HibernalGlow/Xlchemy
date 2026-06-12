<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { Globe, Code } from '@lucide/svelte';
  import { appState } from '$lib/state/app.svelte';
  import { _ } from 'svelte-i18n';
  import type { LaneId } from '$lib/cards/definitions';

  interface Props { laneId: LaneId }
  let { laneId }: Props = $props();
</script>

<LaneCard id="about-info" laneId={laneId} movable header={$_('nav.about')}>
  <div class="flex flex-col items-center gap-3 py-4">
    <div class="w-14 h-14 rounded-2xl bg-fill-pop flex items-center justify-center text-bg-2 font-bold text-2xl shadow-lg">X</div>
    <h2 class="text-xl font-light text-text-1">{$_('about.title')}</h2>
    <Badge variant="secondary">v{appState.constants.version || '1.2.6'}</Badge>
    <p class="text-[11px] text-text-2">{$_('about.subtitle')}</p>
    <p class="text-[10px] text-text-2">{$_('about.built_with')}</p>
    <div class="flex gap-2 mt-2">
      <Button kind="outline" variant="neutral" size="sm" onclick={() => window.open('https://codepoems.eu', '_blank')}><Globe class="w-3 h-3" />{$_('about.website')}</Button>
      <Button kind="outline" variant="neutral" size="sm" onclick={() => window.open('https://github.com/nicjacek/xlchemy', '_blank')}><Code class="w-3 h-3" />{$_('about.source')}</Button>
    </div>
  </div>
</LaneCard>
