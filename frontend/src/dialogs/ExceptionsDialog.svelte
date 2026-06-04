<script lang="ts">
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import Button from '$lib/components/ui/Button.svelte';
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
    <h2 class="text-sm font-semibold text-text-1">{t('Exceptions')} ({appState.exceptions.length})</h2>
    <div class="overflow-auto max-h-[300px] rounded-md border border-border-2">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-ntrl-30">
            <th class="text-left p-2 font-semibold">{t('ID')}</th>
            <th class="text-left p-2 font-semibold">{t('Message')}</th>
          </tr>
        </thead>
        <tbody>
          {#each appState.exceptions as exc, i}
            <tr class="border-b border-border-2/50">
              <td class="p-2">{exc.id}</td>
              <td class="p-2 text-xs text-text-2">{exc.msg}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="flex justify-end">
      <Button kind="outline" variant="neutral" onclick={() => appState.clearExceptions()}>{t('Close')}</Button>
    </div>
  </div>
</Dialog>
