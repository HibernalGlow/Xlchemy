<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import { X, GripVertical, ChevronRight } from '@lucide/svelte';
  import { clearDrag, setCardDrag } from '$lib/state/dragState';

  interface Props {
    id: string;
    header: string;
    children?: import('svelte').Snippet;
    defaultCollapsed?: boolean;
    showBorder?: boolean;
    grow?: boolean;
    noshrink?: boolean;
    actions?: import('svelte').Snippet;
    class?: string;
    detail?: import('svelte').Snippet;
    expandable?: boolean;
    laneId?: string;
    movable?: boolean;
  }

  let {
    id,
    header,
    children,
    defaultCollapsed = false,
    showBorder = true,
    grow = false,
    noshrink = false,
    actions,
    class: className = '',
    detail,
    expandable = false,
    laneId,
    movable = false,
  }: Props = $props();

  function loadCollapsed(id: string): boolean {
    try {
      return localStorage.getItem(`xlchemy-card-${id}`) === 'true';
    } catch {
      return false;
    }
  }

  function saveCollapsed(id: string, value: boolean) {
    try {
      localStorage.setItem(`xlchemy-card-${id}`, String(value));
    } catch {}
  }

  let collapsed = $state(false);
  let expanded = $state(false);
  let isDragging = $state(false);
  let didInit = false;

  $effect(() => {
    if (didInit) return;
    collapsed = loadCollapsed(id) || defaultCollapsed;
    didInit = true;
  });

  function handleToggle() {
    collapsed = !collapsed;
    saveCollapsed(id, collapsed);
  }

  function handleExpandToggle() {
    expanded = !expanded;
  }

  function handleCardDragStart(e: DragEvent) {
    if (!movable || !laneId) {
      e.preventDefault();
      return;
    }
    const target = e.target as HTMLElement;
    const grip = target.closest?.('.card-grip');
    if (!grip) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    setCardDrag(id, laneId);
    e.dataTransfer?.setData('text/x-card-id', id);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    isDragging = true;
  }

  function handleCardDragEnd() {
    isDragging = false;
    clearDrag();
  }

  const showDetail = $derived(expandable && !!detail && expanded && !collapsed);
</script>

<div
  role="group"
  aria-label={header}
  class={cn(
    'drawer',
    grow && 'drawer--grow',
    noshrink && 'drawer--noshrink',
    collapsed && 'drawer--collapsed',
    showBorder && !collapsed && 'drawer--border',
    showDetail && 'drawer--expanded',
    isDragging && 'drawer--dragging',
    className,
  )}
  data-card-id={movable ? id : undefined}
  draggable={movable}
  ondragstart={movable ? handleCardDragStart : undefined}
  ondragend={movable ? handleCardDragEnd : undefined}
>
  <div class="drawer-header">
    <div class="drawer-header__title">
      <button type="button" class={cn('drawer-chevron', !collapsed && 'drawer-chevron--expanded')} onclick={handleToggle}>
        <ChevronRight class="w-3.5 h-3.5" />
      </button>
      <span class="drawer-header__text">{header}</span>
      {#if movable}
        <span class="card-grip" title="Drag to another lane">
          <GripVertical class="w-3 h-3.5" />
        </span>
      {/if}
    </div>

    {#if actions}
      <div class="drawer-header__actions">{@render actions()}</div>
    {/if}

    {#if expandable && !collapsed}
      <button
        type="button"
        class="drawer-chevron"
        onclick={handleExpandToggle}
        title={expanded ? 'Collapse detail' : 'Expand detail'}
        style={`margin-left:auto;color:${expanded ? 'var(--fill-pop-bg)' : 'inherit'};transform:${expanded ? 'rotate(90deg)' : 'rotate(-90deg)'}`}
      >
        <ChevronRight class="w-3.5 h-3.5" />
      </button>
    {/if}
  </div>

  {#if !collapsed}
    <div class="drawer-scroll">
      <div class="drawer__content">
        {@render children?.()}
      </div>
    </div>
  {/if}

  {#if detail && showDetail}
    <div class="drawer-detail">
      <button type="button" class="drawer-detail__close" onclick={() => (expanded = false)} title="Close detail">
        <X class="w-3.5 h-3.5" />
      </button>
      <div class="drawer-detail__inner">
        {@render detail()}
      </div>
    </div>
  {/if}
</div>
