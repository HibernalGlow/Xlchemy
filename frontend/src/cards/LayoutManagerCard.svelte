<script lang="ts">
  import { Eye, EyeOff, ArrowUp, ArrowDown, GripVertical } from '@lucide/svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { _ } from 'svelte-i18n';
  import { ALL_CARD_IDS, DEFAULT_CARD_LAYOUT, type CardId, type LaneId } from '$lib/cards/definitions';
  import type { LaneId as LaneIdType } from '$lib/cards/definitions';

  interface Props { laneId: LaneId }
  let { laneId }: Props = $props();

  const CARD_LABELS: Record<string, string> = {
    'input-files': $_('input.add_files'),
    'input-filter': $_('input.filter'),
    'progress-status': $_('dialog.converting'),
    'output-format': $_('output.format'),
    'output-conversion': $_('output.conversion'),
    'output-save': $_('output.save_to'),
    'modify-downscaling': $_('modify.downscaling'),
    'modify-misc': $_('modify.misc'),
    'settings-appearance': $_('settings.appearance'),
    'settings-general': $_('settings.general'),
    'settings-conversion': $_('settings.conversion'),
    'settings-exiftool': $_('settings.exiftool'),
    'settings-advanced': $_('settings.advanced'),
    'settings-frontend': $_('settings.frontend'),
    'layout-manager': $_('layout.layout_manager'),
    'about-info': $_('nav.about'),
  };

  function allLanes(): { id: string; title: string }[] {
    return appState.laneOrder.map((id) => ({ id, title: appState.laneTitle(id) }));
  }

  function cardsInLane(laneId: string): CardId[] {
    return appState.cardLayout[laneId] || [];
  }

  function cardLane(cardId: CardId): string {
    for (const laneId of Object.keys(appState.cardLayout)) {
      if (appState.cardLayout[laneId].includes(cardId)) return laneId;
    }
    return '';
  }

  function isCardHidden(cardId: string): boolean {
    return appState.hiddenCards.has(cardId);
  }

  function isLaneHidden(laneId: string): boolean {
    return appState.hiddenLanes.has(laneId);
  }

  function toggleCardVisibility(cardId: string) {
    appState.toggleCardHidden(cardId);
  }

  function toggleLaneVisibility(laneId: string) {
    appState.toggleLaneHidden(laneId);
  }

  function moveCardToLane(cardId: CardId, targetLaneId: string) {
    appState.moveCardToLane(cardId, targetLaneId);
  }

  function moveCardUp(cardId: CardId) {
    appState.reorderCardInLane(cardId, 'up');
  }

  function moveCardDown(cardId: CardId) {
    appState.reorderCardInLane(cardId, 'down');
  }
</script>

<LaneCard id="layout-manager" laneId={laneId} movable header={$_('layout.layout_manager')}>
  <div class="flex flex-col gap-3 text-[11px]">
    <!-- Lanes Section -->
    <div class="flex flex-col gap-1.5">
      <div class="text-[10px] uppercase tracking-wider text-text-2 font-semibold">{$_('layout.lanes')}</div>
      {#each allLanes() as lane}
        <div class="flex items-center justify-between gap-2 px-1.5 py-1 rounded bg-surface-2/50">
          <span class="text-text-1 font-medium">{lane.title}</span>
          <button
            type="button"
            class="p-1 rounded hover:bg-surface-3 transition-colors"
            title={isLaneHidden(lane.id) ? $_('layout.show_lane') : $_('layout.hide_lane')}
            onclick={() => toggleLaneVisibility(lane.id)}
          >
            {#if isLaneHidden(lane.id)}
              <EyeOff class="w-3.5 h-3.5 text-text-2" />
            {:else}
              <Eye class="w-3.5 h-3.5 text-text-1" />
            {/if}
          </button>
        </div>
      {/each}
      {#if appState.hiddenLanes.size > 0}
        <button
          type="button"
          class="text-[10px] text-center py-1 text-accent hover:underline"
          onclick={() => appState.showAllLanes()}
        >
          {$_('layout.show_all_hidden_lanes')} ({appState.hiddenLanes.size})
        </button>
      {/if}
    </div>

    <!-- Cards Section -->
    <div class="flex flex-col gap-1.5">
      <div class="text-[10px] uppercase tracking-wider text-text-2 font-semibold">{$_('layout.cards')}</div>
      {#each ALL_CARD_IDS as cardId}
        {@const currentLane = cardLane(cardId)}
        {@const hidden = isCardHidden(cardId)}
        <div class="flex items-center gap-1.5 px-1.5 py-1 rounded bg-surface-2/50" class:opacity-40={hidden}>
          <GripVertical class="w-3 h-3 text-text-3 shrink-0" />
          <span class="text-text-1 font-medium flex-1 min-w-0 truncate">{CARD_LABELS[cardId] || cardId}</span>

          <!-- Lane selector -->
          <select
            class="bg-surface-1 border border-border rounded px-1 py-0.5 text-[10px] text-text-1 outline-none focus:border-accent"
            value={currentLane}
            onchange={(e) => moveCardToLane(cardId, (e.target as HTMLSelectElement).value)}
          >
            {#each allLanes() as lane}
              <option value={lane.id}>{lane.title}</option>
            {/each}
          </select>

          <!-- Order buttons -->
          <div class="flex items-center gap-0.5">
            <button
              type="button"
              class="p-0.5 rounded hover:bg-surface-3 transition-colors"
              title={$_('layout.move_up')}
              onclick={() => moveCardUp(cardId)}
            >
              <ArrowUp class="w-3 h-3 text-text-2" />
            </button>
            <button
              type="button"
              class="p-0.5 rounded hover:bg-surface-3 transition-colors"
              title={$_('layout.move_down')}
              onclick={() => moveCardDown(cardId)}
            >
              <ArrowDown class="w-3 h-3 text-text-2" />
            </button>
          </div>

          <!-- Visibility toggle -->
          <button
            type="button"
            class="p-1 rounded hover:bg-surface-3 transition-colors"
            title={hidden ? $_('layout.show_card') : $_('layout.hide_card')}
            onclick={() => toggleCardVisibility(cardId)}
          >
            {#if hidden}
              <EyeOff class="w-3.5 h-3.5 text-text-2" />
            {:else}
              <Eye class="w-3.5 h-3.5 text-text-1" />
            {/if}
          </button>
        </div>
      {/each}
    </div>
  </div>
</LaneCard>
