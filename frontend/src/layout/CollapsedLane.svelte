<script lang="ts">
  import { GripVertical } from '@lucide/svelte';
  import { cn } from '$lib/utils/cn';

  interface Props {
    laneId?: string;
    title: string;
    icon?: import('svelte').Snippet;
    onExpand: () => void;
    draggable?: boolean;
    onDragStart?: (e: DragEvent) => void;
    onDragEnd?: () => void;
    isDragging?: boolean;
  }

  let {
    laneId = '',
    title,
    icon,
    onExpand,
    draggable = false,
    onDragStart,
    onDragEnd,
    isDragging = false,
  }: Props = $props();
</script>

<div
  role="group"
  aria-label={title}
  class={cn('folded-lane', isDragging && 'folded-lane--dragging')}
  data-lane-id={laneId}
  {draggable}
  ondragstart={onDragStart}
  ondragend={onDragEnd}
>
  <button type="button" class="folded-lane__toggle" onclick={onExpand} title={`展开 ${title}`}>
    <svg class="folded-lane__collapse-icon" viewBox="0 0 15 10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.75 0.75H2.75C1.64543 0.75 0.75 1.64543 0.75 2.75V6.75C0.75 7.85457 1.64543 8.75 2.75 8.75H11.75C12.8546 8.75 13.75 7.85457 13.75 6.75V2.75C13.75 1.64543 12.8546 0.75 11.75 0.75Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <rect class="folded-lane__collapse-rect" x="0.75" y="0.75" width="5" height="8" rx="2" stroke="currentColor" stroke-width="1.5" fill="currentColor"/>
    </svg>
  </button>

  <div class="folded-lane__grip">
    <GripVertical class="w-[10px] h-[14px]" />
  </div>

  <div class="folded-lane__text">
    {#if icon}
      <span class="folded-lane__icon">{@render icon()}</span>
    {/if}
    <span class="folded-lane__title">{title}</span>
  </div>
</div>
