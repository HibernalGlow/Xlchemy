<script lang="ts">
  import { FileInput, FileOutput, History, Info, Settings, SlidersHorizontal } from '@lucide/svelte';
  import { cn } from '$lib/utils/cn';

  interface LaneTab {
    id: string;
    title: string;
    active: boolean;
  }

  interface Props {
    laneTabs?: LaneTab[];
    onLaneSelect?: (laneId: string) => void;
  }

  let { laneTabs = [], onLaneSelect }: Props = $props();

  function iconFor(id: string) {
    switch (id) {
      case 'input': return FileInput;
      case 'output': return FileOutput;
      case 'modify': return SlidersHorizontal;
      case 'settings': return Settings;
      case 'about': return Info;
      default: return History;
    }
  }

  const primaryIds = ['input', 'output', 'modify'];
  const secondaryIds = ['settings', 'about'];
</script>

<div class="chrome-sidebar">
  <div class="chrome-sidebar__top">
    {#each laneTabs.filter((tab) => primaryIds.includes(tab.id)) as tab}
      {@const Icon = iconFor(tab.id)}
      <div class="chrome-sidebar__slot">
        {#if tab.active}
          <div class="chrome-sidebar__active-indicator"></div>
        {/if}
        <button
          type="button"
          class={cn('chrome-sidebar__button', tab.active && 'chrome-sidebar__button--active')}
          title={tab.title}
          onclick={() => onLaneSelect?.(tab.id)}
        >
          <Icon class="h-4 w-4" />
        </button>
      </div>
    {/each}
  </div>

  <div class="chrome-sidebar__bottom">
    {#each laneTabs.filter((tab) => secondaryIds.includes(tab.id)) as tab}
      {@const Icon = iconFor(tab.id)}
      <div class="chrome-sidebar__slot">
        {#if tab.active}
          <div class="chrome-sidebar__active-indicator"></div>
        {/if}
        <button
          type="button"
          class={cn('chrome-sidebar__button', tab.active && 'chrome-sidebar__button--active')}
          title={tab.title}
          onclick={() => onLaneSelect?.(tab.id)}
        >
          <Icon class="h-4 w-4" />
        </button>
      </div>
    {/each}
  </div>
</div>
