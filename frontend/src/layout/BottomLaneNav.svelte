<script lang="ts">
  import { FileInput, FileOutput, History, Info, Settings, SlidersHorizontal } from '@lucide/svelte';

  interface LaneTab {
    id: string;
    title: string;
    active: boolean;
  }

  interface Props {
    laneTabs: LaneTab[];
    singleLaneMode?: boolean;
    onSelect: (laneId: string) => void;
    onToggleSingleLaneMode?: () => void;
  }

  let { laneTabs, singleLaneMode = false, onSelect, onToggleSingleLaneMode }: Props = $props();

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
    {#each laneTabs as lane}
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
      title={singleLaneMode ? '切换到多列' : '切换到单列'}
      onclick={() => onToggleSingleLaneMode?.()}
      aria-label={singleLaneMode ? '切换到多列' : '切换到单列'}
    >
      {singleLaneMode ? '单列' : '多列'}
    </button>
  </div>
</div>
