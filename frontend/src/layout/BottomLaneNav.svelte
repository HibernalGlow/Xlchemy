<script lang="ts">
  import { FileInput, FileOutput, History, Info, Settings, SlidersHorizontal, Eye, Columns2, Rows2 } from '@lucide/svelte';
  import { _ } from 'svelte-i18n';

  interface LaneTab {
    id: string;
    title: string;
    active: boolean;
    hidden?: boolean;
  }

  interface Props {
    laneTabs: LaneTab[];
    singleLaneMode?: boolean;
    onSelect: (laneId: string) => void;
    onToggleSingleLaneMode?: () => void;
    onToggleHidden?: (laneId: string) => void;
  }

  let { laneTabs, singleLaneMode = false, onSelect, onToggleSingleLaneMode, onToggleHidden }: Props = $props();

  let visibilityMenuOpen = $state(false);
  let visibilityRoot = $state<HTMLDivElement | null>(null);

  const visibleLanes = $derived(laneTabs.filter((l) => !l.hidden));

  $effect(() => {
    if (!visibilityMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (visibilityRoot && !visibilityRoot.contains(e.target as Node)) {
        visibilityMenuOpen = false;
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  });

  function iconFor(id: string) {
    switch (id) {
      case 'input':
        return FileInput;
      case 'output':
        return FileOutput;
      case 'modify':
        return SlidersHorizontal;
      case 'settings':
        return Settings;
      case 'about':
        return Info;
      default:
        return History;
    }
  }
</script>

<div class="page-control-dock">
  <div class="page-control">
    {#each visibleLanes as lane}
      {@const Icon = iconFor(lane.id)}
      <button
        type="button"
        class="page-control__lane"
        class:active={lane.active}
        title={lane.title}
        onclick={() => onSelect(lane.id)}
        aria-label={lane.title}
      >
        <Icon class="h-3.5 w-3.5" />
      </button>
    {/each}
    <div class="page-control__divider"></div>
    <button
      type="button"
      class="page-control__mode"
      class:active={singleLaneMode}
      title={singleLaneMode ? $_('layout_misc.multi_column') : $_('layout_misc.single_column')}
      onclick={() => onToggleSingleLaneMode?.()}
      aria-label={singleLaneMode ? $_('layout_misc.multi_column') : $_('layout_misc.single_column')}
    >
      {#if singleLaneMode}
        <Columns2 class="h-3.5 w-3.5" />
      {:else}
        <Rows2 class="h-3.5 w-3.5" />
      {/if}
    </button>
    <div bind:this={visibilityRoot} class="page-control__visibility">
      <button
        type="button"
        class="page-control__mode"
        class:active={visibilityMenuOpen}
        title={$_('lane_actions.hide_lane')}
        onclick={() => (visibilityMenuOpen = !visibilityMenuOpen)}
        aria-label={$_('lane_actions.hide_lane')}
      >
        <Eye class="h-3.5 w-3.5" />
      </button>
      {#if visibilityMenuOpen}
        <div class="page-control__visibility-menu">
          {#each laneTabs as lane}
            {@const ItemIcon = iconFor(lane.id)}
            <button
              type="button"
              class="page-control__visibility-item"
              class:checked={!lane.hidden}
              onclick={() => onToggleHidden?.(lane.id)}
            >
              <span class="page-control__visibility-check">{!lane.hidden ? '✓' : ''}</span>
              <ItemIcon class="h-3.5 w-3.5" />
              <span>{lane.title}</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
