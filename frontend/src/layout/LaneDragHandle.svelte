<script lang="ts">
  import { Ellipsis, GripVertical } from '@lucide/svelte';
  import { cn } from '$lib/utils/cn';

  interface Props {
    title: string;
    collapsed: boolean;
    onToggleCollapse: () => void;
    onDragStart?: (e: DragEvent) => void;
    onDragEnd?: () => void;
    actions?: import('svelte').Snippet;
  }

  let { title, collapsed, onToggleCollapse, onDragStart, onDragEnd, actions }: Props = $props();
</script>

<div class="lane-drag-handle">
  <button
    type="button"
    class={cn('lane-drag-handle__collapse', collapsed && 'lane-drag-handle__collapse--folded')}
    onclick={onToggleCollapse}
    title={collapsed ? `Expand ${title}` : `Collapse ${title}`}
  >
    <svg class="lane-drag-handle__icon" viewBox="0 0 15 10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.75 0.75H2.75C1.64543 0.75 0.75 1.64543 0.75 2.75V6.75C0.75 7.85457 1.64543 8.75 2.75 8.75H11.75C12.8546 8.75 13.75 7.85457 13.75 6.75V2.75C13.75 1.64543 12.8546 0.75 11.75 0.75Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <rect class="lane-drag-handle__lane-rect" x="0.75" y="0.75" width="5" height="8" rx="2" stroke="currentColor" stroke-width="1.5"/>
    </svg>
  </button>

  <div role="button" aria-label={`Drag ${title}`} tabindex="0" class="lane-drag-handle__center" draggable="true" ondragstart={onDragStart} ondragend={onDragEnd}>
    <div class="lane-drag-handle__grip" data-drag-handle>
      <GripVertical class="w-[10px] h-[14px]" />
    </div>
    <span class="lane-drag-handle__title">{title}</span>
  </div>

  <div class="lane-drag-handle__actions">
    {#if actions}
      {@render actions()}
    {/if}
    <button type="button" class="lane-drag-handle__menu" title="More actions">
      <Ellipsis class="w-3.5 h-3.5" />
    </button>
  </div>
</div>
