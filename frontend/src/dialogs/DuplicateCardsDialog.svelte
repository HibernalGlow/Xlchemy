<script lang="ts">
  import Dialog from '$lib/components/ui/Dialog.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { AlertTriangle, Check } from '@lucide/svelte';
  import { appState } from '$lib/state/app.svelte';
  import { _ } from 'svelte-i18n';
  import type { DuplicateCardInfo } from '$lib/cards/definitions';

  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }

  let { open = $bindable(false), onOpenChange }: Props = $props();

  // Track which lane the user wants to keep each card in.
  // Key = cardId, Value = chosen laneId. Default = first lane in the list.
  let choices = $state<Record<string, string>>({});

  $effect(() => {
    // Reset choices whenever duplicateCards changes
    const dupes = appState.duplicateCards;
    const next: Record<string, string> = {};
    for (const dupe of dupes) {
      next[dupe.cardId] = dupe.lanes[0];
    }
    choices = next;
  });

  function cardName(id: string): string {
    const key = `card_names.${id}`;
    const translated = $_(key);
    if (translated !== key) return translated;
    return id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function laneName(id: string): string {
    return appState.laneTitle(id) || id;
  }

  function handleFix() {
    const map = new Map(Object.entries(choices));
    appState.resolveDuplicateCards(map);
    open = false;
  }

  function handleDismiss() {
    appState.duplicateCards = [];
    appState.showDuplicateDialog = false;
    open = false;
  }
</script>

<Dialog bind:open dismissible={false} onOpenChange={(v) => { open = v; onOpenChange?.(v); }}>
  <div class="flex flex-col gap-3 p-4">
    <div class="flex items-center gap-2">
      <AlertTriangle class="h-4 w-4 text-yellow-400 flex-shrink-0" />
      <h2 class="text-sm font-semibold text-text-1">{$_('duplicates.title')}</h2>
    </div>
    <p class="text-xs text-text-2">{$_('duplicates.description')}</p>

    <div class="flex flex-col gap-2.5 overflow-auto max-h-[280px] pr-1">
      {#each appState.duplicateCards as dupe (dupe.cardId)}
        <div class="flex flex-col gap-1.5 rounded-md border border-border-2 p-2.5">
          <span class="text-xs font-semibold text-text-1">{cardName(dupe.cardId)}</span>
          <div class="flex flex-wrap gap-1.5">
            {#each dupe.lanes as laneId}
              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-[4px] px-2 py-1 text-[11px] font-medium transition-colors border
                  {choices[dupe.cardId] === laneId
                    ? 'border-fill-pop-bg bg-fill-pop-soft text-fill-pop-bg'
                    : 'border-border-2 bg-transparent text-text-2 hover:border-ntrl-50 hover:text-text-1'}"
                onclick={() => { choices = { ...choices, [dupe.cardId]: laneId }; }}
              >
                {#if choices[dupe.cardId] === laneId}
                  <Check class="h-3 w-3" />
                {/if}
                {laneName(laneId)}
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <div class="flex justify-end gap-2">
      <Button kind="outline" variant="neutral" onclick={handleDismiss}>{$_('duplicates.dismiss')}</Button>
      <Button kind="solid" variant="pop" onclick={handleFix} disabled={appState.duplicateCards.length === 0}>
        <Check class="w-3 h-3" />
        {$_('duplicates.fix')}
      </Button>
    </div>
  </div>
</Dialog>
