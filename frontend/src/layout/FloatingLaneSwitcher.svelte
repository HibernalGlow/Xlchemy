<script lang="ts">
  interface LaneTab {
    id: string;
    title: string;
    active: boolean;
  }

  interface Props {
    laneTabs: LaneTab[];
    activeLaneId: string;
    onSelect: (laneId: string) => void;
  }

  let { laneTabs, activeLaneId, onSelect }: Props = $props();
</script>

<div class="floating-lane-switcher">
  {#each laneTabs as lane, index}
    <button
      type="button"
      class:active={activeLaneId === lane.id}
      class="floating-lane-switcher__button"
      title={lane.title}
      onclick={() => onSelect(lane.id)}
    >
      {index + 1}
    </button>
  {/each}
</div>
