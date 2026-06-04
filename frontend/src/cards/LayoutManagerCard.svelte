<script lang="ts">
  import { Eye, EyeOff, ArrowUp, ArrowDown, GripVertical } from '@lucide/svelte';
  import LaneCard from '$lib/layout/LaneCard.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { i18n } from '$lib/i18n/t.svelte';
  import { ALL_CARD_IDS, DEFAULT_CARD_LAYOUT, type CardId, type LaneId } from '$lib/cards/definitions';
  import type { LaneId as LaneIdType } from '$lib/cards/definitions';

  interface Props { laneId: LaneId }
  let { laneId }: Props = $props();
  const t = i18n.t;

  const CARD_LABELS: Record<string, string> = {
    'input-files': 'Input Files',
    'input-filter': 'Input Filter',
    'progress-status': 'Progress',
    'output-format': 'Output Format',
    'output-conversion': 'Output Conversion',
    'output-save': 'Output Save',
    'modify-downscaling': 'Downscaling',
    'modify-misc': 'Misc',
    'settings-appearance': 'Appearance',
    'settings-general': 'General',
    'settings-conversion': 'Conversion',
    'settings-exiftool': 'ExifTool',
    'settings-advanced': 'Advanced',
    'settings-frontend': 'Frontend',
    'layout-manager': 'Layout Manager',
    'about-info': 'About',
  };

  function allLanes(): { id: string; title: string }[] {
    return appState.laneOrder.map((id) => ({ id, title: appState.laneTitle(id) }));
  }

  function cardsInLane(laneId: string): CardId[] {
    return appState.cardLayout[laneId] || [];
  }

  function cardLane(cardId: string): string {
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

  function moveCardToLane(cardId: string, targetLaneId: string) {
    appState.moveCardToLane(cardId, targetLaneId);
  }

  function moveCardUp(cardId: string) {
    appState.reorderCardInLane(cardId, 'up');
  }

  function moveCardDown(cardId: string) {
    appState.reorderCardInLane(cardId, 'down');
  }
</script>

<LaneCard id="layout-manager" laneId={laneId} movable header={t('Layout Manager')}>
  <div class="flex flex-col gap-3 text-[11px]">
    <!-- Lanes Section -->
    <div class="flex flex-col gap-1.5">
      <div class="text-[10px] uppercase tracking-wider text-text-2 font-semibold">{t('Lanes')}</div>
      {#each allLanes() as lane}
        <div class="flex items-center justify-between gap-2 px-1.5 py-1 rounded bg-surface-2/50">
          <span class="text-text-1 font-medium">{lane.title}</span>
          <button
            type="button"
            class="p-1 rounded hover:bg-surface-3 transition-colors"
            title={isLaneHidden(lane.id) ? t('Show lane') : t('Hide lane')}
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
          {t('Show all hidden lanes')} ({appState.hiddenLanes.size})
        </button>
      {/if}
    </div>

    <!-- Cards Section -->
    <div class="flex flex-col gap-1.5">
      <div class="text-[10px] uppercase tracking-wider text-text-2 font-semibold">{t('Cards')}</div>
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
              title={t('Move up')}
              onclick={() => moveCardUp(cardId)}
            >
              <ArrowUp class="w-3 h-3 text-text-2" />
            </button>
            <button
              type="button"
              class="p-0.5 rounded hover:bg-surface-3 transition-colors"
              title={t('Move down')}
              onclick={() => moveCardDown(cardId)}
            >
              <ArrowDown class="w-3 h-3 text-text-2" />
            </button>
          </div>

          <!-- Visibility toggle -->
          <button
            type="button"
            class="p-1 rounded hover:bg-surface-3 transition-colors"
            title={hidden ? t('Show card') : t('Hide card')}
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
