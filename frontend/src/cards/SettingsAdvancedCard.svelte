<script lang="ts">
  import Button from '$lib/components/ui/Button.svelte';
  import Checkbox from '$lib/components/ui/Checkbox.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import Select from '$lib/components/ui/Select.svelte';
  import Textarea from '$lib/components/ui/Textarea.svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { _ } from 'svelte-i18n';
  import type { LaneId } from '$lib/cards/definitions';

  interface Props { laneId: LaneId }
  let { laneId }: Props = $props();
  const ramOptimizerOptions = ['Dynamic', 'Static', 'Disabled'].map((value) => ({ value, label: $_(`settings.${value.toLowerCase()}`) }));

</script>

<LaneCard id="settings-advanced" laneId={laneId} movable header={$_('settings.advanced')}>
  <div class="flex flex-col gap-3">
    <Select value={appState.appSettings.ram_optimizer || 'Disabled'} options={ramOptimizerOptions} onChange={(v) => appState.updateApp('ram_optimizer', v)} />

    {#if appState.appSettings.ram_optimizer === 'Static'}
      <Textarea value={appState.appSettings.ram_optimizer_rules || ''} onchange={(e) => appState.updateApp('ram_optimizer_rules', (e.currentTarget as HTMLTextAreaElement).value)} class="min-h-[40px] text-xs font-mono" />
    {/if}

    <label class="flex items-center gap-2 text-[11px] text-text-1">
      <Checkbox checked={!!appState.appSettings.enable_custom_args} onCheckedChange={(v) => appState.updateApp('enable_custom_args', v)} />
      {$_('settings.extra_encoder_args')}
    </label>

    {#if appState.appSettings.enable_custom_args}
      <div class="flex flex-col gap-2">
        <Input value={appState.appSettings.cjxl_args || ''} placeholder={$_('settings.cjxl_args')} oninput={(e) => appState.updateApp('cjxl_args', (e.currentTarget as HTMLInputElement).value)} class="h-7 text-xs font-mono" />
        <Input value={appState.appSettings.avifenc_args || ''} placeholder={$_('settings.avifenc_args')} oninput={(e) => appState.updateApp('avifenc_args', (e.currentTarget as HTMLInputElement).value)} class="h-7 text-xs font-mono" />
        <Input value={appState.appSettings.cjpegli_args || ''} placeholder={$_('settings.cjpegli_args')} oninput={(e) => appState.updateApp('cjpegli_args', (e.currentTarget as HTMLInputElement).value)} class="h-7 text-xs font-mono" />
        <Input value={appState.appSettings.im_args || ''} placeholder={$_('settings.imagemagick_args')} oninput={(e) => appState.updateApp('im_args', (e.currentTarget as HTMLInputElement).value)} class="h-7 text-xs font-mono" />
      </div>
    {/if}

    <div class="flex gap-2 flex-wrap pt-2 border-t border-border-2/50">
      <Button kind="outline" variant="neutral" size="sm" onclick={() => appState.handleExportSettings()}>{$_('theme.export')}</Button>
      <Button kind="outline" variant="neutral" size="sm" onclick={() => (appState.showImportDialog = true)}>{$_('theme.import')}</Button>
    </div>
  </div>
</LaneCard>
