<script lang="ts">
  interface LaneTab {
    id: string;
    title: string;
    active: boolean;
  }

  interface Props {
    laneTabs: LaneTab[];
    onSelect: (laneId: string) => void;
    onCreateLane?: () => void;
  }

  let { laneTabs, onSelect, onCreateLane }: Props = $props();
</script>

<div class="page-control-dock">
  <div class="page-control">
    {#each laneTabs as lane}
      <button
        type="button"
        class="page-control__dot"
        class:active={lane.active}
        title={lane.title}
        onclick={() => onSelect(lane.id)}
        aria-label={lane.title}
      ></button>
    {/each}
    <button
      type="button"
      class="page-control__plus"
      title="Add lane"
      onclick={() => onCreateLane?.()}
      aria-label="Add lane"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 1.5V8.5M1.5 5H8.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
</div>
