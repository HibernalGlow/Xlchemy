<script lang="ts">
  import AboutInfoCard from '$lib/cards/AboutInfoCard.svelte';
  import InputFilesCard from '$lib/cards/InputFilesCard.svelte';
  import InputFilterCard from '$lib/cards/InputFilterCard.svelte';
  import ModifyDownscalingCard from '$lib/cards/ModifyDownscalingCard.svelte';
  import ModifyMiscCard from '$lib/cards/ModifyMiscCard.svelte';
  import OutputConversionCard from '$lib/cards/OutputConversionCard.svelte';
  import OutputFormatCard from '$lib/cards/OutputFormatCard.svelte';
  import OutputSaveCard from '$lib/cards/OutputSaveCard.svelte';
  import ProgressCard from '$lib/cards/ProgressCard.svelte';
  import SettingsAdvancedCard from '$lib/cards/SettingsAdvancedCard.svelte';
  import SettingsAppearanceCard from '$lib/cards/SettingsAppearanceCard.svelte';
  import SettingsConversionCard from '$lib/cards/SettingsConversionCard.svelte';
  import SettingsExifToolCard from '$lib/cards/SettingsExifToolCard.svelte';
  import SettingsGeneralCard from '$lib/cards/SettingsGeneralCard.svelte';
  import SettingsFrontendCard from '$lib/cards/SettingsFrontendCard.svelte';
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
    {#if cardId === 'input-files'}
      <InputFilesCard {laneId} />
    {:else if cardId === 'input-filter'}
      <InputFilterCard {laneId} />
    {:else if cardId === 'progress-status'}
      <ProgressCard {laneId} />
    {:else if cardId === 'output-format'}
      <OutputFormatCard {laneId} />
    {:else if cardId === 'output-conversion'}
      <OutputConversionCard {laneId} />
    {:else if cardId === 'output-save'}
      <OutputSaveCard {laneId} />
    {:else if cardId === 'modify-downscaling'}
      <ModifyDownscalingCard {laneId} />
    {:else if cardId === 'modify-misc'}
      <ModifyMiscCard {laneId} />
    {:else if cardId === 'settings-appearance'}
      <SettingsAppearanceCard {laneId} />
    {:else if cardId === 'settings-general'}
      <SettingsGeneralCard {laneId} />
    {:else if cardId === 'settings-conversion'}
      <SettingsConversionCard {laneId} />
    {:else if cardId === 'settings-exiftool'}
      <SettingsExifToolCard {laneId} />
    {:else if cardId === 'settings-advanced'}
      <SettingsAdvancedCard {laneId} />
    {:else if cardId === 'settings-frontend'}
      <SettingsFrontendCard {laneId} />
    {:else if cardId === 'about-info'}
      <AboutInfoCard {laneId} />
    {/if}
  {/each}
</div>
