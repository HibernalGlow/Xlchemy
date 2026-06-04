<script lang="ts">
  import Badge from '$lib/components/ui/Badge.svelte';
  import { cn } from '$lib/utils/cn';

  interface LaneTab {
    id: string;
    title: string;
    active: boolean;
  }

  interface Props {
    version?: string;
    laneTabs?: LaneTab[];
    onLaneSelect?: (laneId: string) => void;
  }

  let { version = '', laneTabs = [], onLaneSelect }: Props = $props();
</script>

<header class="flex items-center h-[44px] bg-[var(--bg-3)] border-b border-[var(--border-2)] px-[14px] shrink-0 gap-3">
  <div class="flex items-center gap-2 shrink-0">
    <div class="flex items-center justify-center w-7 h-7 rounded-lg bg-fill-pop text-bg-2 font-bold text-sm">X</div>
    <span class="text-sm font-semibold text-text-1">Xlchemy</span>
    {#if version}
      <Badge variant="secondary" class="text-[10px]">{version}</Badge>
    {/if}
  </div>

  <div class="flex-1 h-full" data-wails-drag-region></div>

  {#if laneTabs.length > 0}
    <nav class="flex items-center gap-1 shrink-0">
      {#each laneTabs as tab}
        <button
          type="button"
          class={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer',
            tab.active ? 'bg-fill-pop/15 text-fill-pop' : 'text-text-2 hover:text-text-1 hover:bg-[var(--bg-1)]/60',
          )}
          onclick={() => onLaneSelect?.(tab.id)}
          title={tab.title}
        >
          <span class="hidden sm:inline">{tab.title}</span>
          <span class="sm:hidden">{tab.title.slice(0, 1)}</span>
        </button>
      {/each}
    </nav>
  {/if}
</header>
