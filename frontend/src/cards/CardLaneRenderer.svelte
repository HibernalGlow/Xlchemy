<script lang="ts">
  import { cardRegistry } from '$lib/cards/registry';
  import { appState } from '$lib/state/app.svelte';
  import type { CardId, LaneId } from '$lib/cards/definitions';

  interface Props {
    laneId: LaneId;
  }

  let { laneId }: Props = $props();

  function cardIds(): CardId[] {
    return appState.cardsForLane(laneId);
  }
</script>

<div class="flex flex-col gap-2 h-full">
  {#each cardIds() as cardId (cardId)}
    {#if appState.hiddenCards.has(cardId)}
      <!-- hidden -->
    {:else if cardRegistry[cardId]}
      {@const CardComponent = cardRegistry[cardId]}
      <CardComponent {laneId} />
    {/if}
  {/each}
</div>
