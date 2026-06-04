<script lang="ts">
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Textarea from '$lib/components/ui/Textarea.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { _ } from 'svelte-i18n';

  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }

  let { open = $bindable(false), onOpenChange }: Props = $props();
</script>

<Dialog bind:open onOpenChange={(v) => { open = v; onOpenChange?.(v); }}>
  <div class="flex flex-col gap-3 p-4">
    <h2 class="text-sm font-semibold text-text-1">{$_('theme.import')} {$_('nav.settings')}</h2>
    <Textarea bind:value={appState.importSettingsJson} placeholder="Paste settings JSON here..." class="min-h-[200px] font-mono" />
    <div class="flex justify-end gap-2">
      <Button kind="outline" variant="neutral" onclick={() => (open = false)}>{$_('dialog.cancel')}</Button>
      <Button kind="solid" variant="pop" onclick={() => appState.handleImportSettings()}>{$_('theme.import')}</Button>
    </div>
  </div>
</Dialog>
