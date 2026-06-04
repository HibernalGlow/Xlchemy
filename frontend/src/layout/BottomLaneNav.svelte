<script lang="ts">
  interface LaneTab {
    id: string;
    title: string;
    active: boolean;
  }

  interface Props {
    laneTabs: LaneTab[];
    onSelect: (laneId: string) => void;
  }

  let { laneTabs, onSelect }: Props = $props();
</script>

<div class="bottom-lane-nav">
  {#each laneTabs as lane}
    <button
      type="button"
      class:active={lane.active}
      class="bottom-lane-nav__button"
      title={lane.title}
      onclick={() => onSelect(lane.id)}
    >
      {lane.title}
    </button>
  {/each}
</div>
