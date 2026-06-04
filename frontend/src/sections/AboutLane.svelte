<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { _ } from 'svelte-i18n';
</script>

<div class="flex flex-col gap-2">
  <LaneCard id="about-info" header={$_('nav.about')}>
    <div class="flex flex-col items-center gap-3 py-4">
      <div class="w-14 h-14 rounded-2xl bg-fill-pop flex items-center justify-center text-bg-2 font-bold text-2xl shadow-lg">X</div>
      <h2 class="text-xl font-light text-text-1">{$_('about.title')}</h2>
      <Badge variant="secondary">v{appState.constants.version || '1.2.6'}</Badge>
      <p class="text-[11px] text-text-2">{$_('about.subtitle')}</p>
      <p class="text-[10px] text-text-2">Built with Wails 3 + Svelte + Go + Rust</p>
      <div class="flex gap-2 mt-2">
        <Button kind="outline" variant="neutral" size="sm" onclick={() => window.open('https://codepoems.eu', '_blank')}>{$_('about.website')}</Button>
        <Button kind="outline" variant="neutral" size="sm" onclick={() => window.open('https://github.com/nicjacek/xlchemy', '_blank')}>{$_('about.source')}</Button>
      </div>
    </div>
  </LaneCard>
</div>
