<script lang="ts">
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Textarea from '$lib/components/ui/Textarea.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { i18n } from '$lib/i18n/t.svelte';

  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }

  let { open = $bindable(false), onOpenChange }: Props = $props();
  const t = i18n.t;
</script>

<Dialog bind:open onOpenChange={(v) => { open = v; onOpenChange?.(v); }}>
  <div class="flex flex-col gap-3 p-4">
    <h2 class="text-sm font-semibold text-text-1">{t('Import')} {t('Settings')}</h2>
    <Textarea bind:value={appState.importSettingsJson} placeholder="Paste settings JSON here..." class="min-h-[200px] font-mono" />
    <div class="flex justify-end gap-2">
      <Button kind="outline" variant="neutral" onclick={() => (open = false)}>{t('Cancel')}</Button>
      <Button kind="solid" variant="pop" onclick={() => appState.handleImportSettings()}>{t('Import')}</Button>
    </div>
  </div>
</Dialog>
