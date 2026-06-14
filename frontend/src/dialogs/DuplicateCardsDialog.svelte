<script lang="ts">
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { AlertTriangle, Trash2 } from '@lucide/svelte';
  import { appState } from '$lib/state/app.svelte';
  import { _ } from 'svelte-i18n';

  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }

  let { open = $bindable(false), onOpenChange }: Props = $props();

  function cardName(id: string): string {
    // Try i18n lookup, fall back to prettified ID
    const key = `card_names.${id}`;
    const translated = $_(key);
    if (translated !== key) return translated;
    return id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function laneName(id: string): string {
    return appState.laneTitle(id) || id;
  }

  function handleFix() {
    appState.resolveDuplicateCards();
    open = false;
  }

  function handleDismiss() {
    appState.duplicateCards = [];
    appState.showDuplicateDialog = false;
    open = false;
  }
</script>

<Dialog bind:open onOpenChange={(v) => { open = v; onOpenChange?.(v); }}>
  <div class="flex flex-col gap-3 p-4">
    <div class="flex items-center gap-2">
      <AlertTriangle class="h-4 w-4 text-yellow-400 flex-shrink-0" />
      <h2 class="text-sm font-semibold text-text-1">{$_('duplicates.title')}</h2>
    </div>
    <p class="text-xs text-text-2">{$_('duplicates.description')}</p>

    <div class="overflow-auto max-h-[240px] rounded-md border border-border-2">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-ntrl-30">
            <th class="text-left p-2 text-xs font-semibold">{$_('duplicates.card')}</th>
            <th class="text-left p-2 text-xs font-semibold">{$_('duplicates.lanes')}</th>
          </tr>
        </thead>
        <tbody>
          {#each appState.duplicateCards as dupe}
            <tr class="border-b border-border-2/50">
              <td class="p-2 text-xs font-medium text-text-1">{cardName(dupe.cardId)}</td>
              <td class="p-2 text-xs text-text-2">{dupe.lanes.map(laneName).join(', ')}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="flex justify-end gap-2">
      <Button kind="outline" variant="neutral" onclick={handleDismiss}>{$_('duplicates.dismiss')}</Button>
      <Button kind="solid" variant="pop" onclick={handleFix}>
        <Trash2 class="w-3 h-3" />
        {$_('duplicates.fix')}
      </Button>
    </div>
  </div>
</Dialog>
