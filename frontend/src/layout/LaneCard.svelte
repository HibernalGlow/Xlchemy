<script lang="ts">
  import { cn } from '$lib/utils/cn';
  import { X, GripVertical, ChevronRight, Ellipsis } from '@lucide/svelte';
  import { clearDrag, setCardDrag } from '$lib/state/dragState';
  import { canvasState } from '$lib/state/canvas.svelte';

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
    scrollable?: boolean;
  }

  const labels = {
    drag: '拖动到其他泳道',
    more: '更多操作',
    closePopout: '关闭浮出',
    popoutCard: '浮出显示',
    expandCard: '展开卡片',
    collapseCard: '折叠卡片',
    expandDetail: '展开详情',
    collapseDetail: '收起详情',
    closeDetail: '关闭详情',
  };

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
    scrollable = false,
  }: Props = $props();

  function loadCollapsed(cardId: string): boolean {
    try {
      return localStorage.getItem(`xlchemy-card-${cardId}`) === 'true';
    } catch {
      return false;
    }
  }

  function saveCollapsed(cardId: string, value: boolean) {
    try {
      localStorage.setItem(`xlchemy-card-${cardId}`, String(value));
    } catch {}
  }

  let collapsed = $state(false);
  let expanded = $state(false);
  let isDragging = $state(false);
  let didInit = false;
  let menuOpen = $state(false);
  let poppedOut = $state(false);
  let menuRoot = $state<HTMLDivElement | null>(null);

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

  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  function handlePopout() {
    poppedOut = !poppedOut;
    menuOpen = false;
  }

  function handleCardDragStart(e: DragEvent) {
    if (!movable || !laneId) {
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
  const isDropTarget = $derived(canvasState.dragTargetCardId === id);
  const dropAfter = $derived(isDropTarget && canvasState.dragInsertAfter);

  $effect(() => {
    if (!menuOpen) return;
    const handleDocumentClick = (e: MouseEvent) => {
      if (menuRoot && !menuRoot.contains(e.target as Node)) {
        menuOpen = false;
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  });
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
    isDropTarget && !dropAfter && 'drawer--drop-before',
    isDropTarget && dropAfter && 'drawer--drop-after',
    className,
  )}
  data-card-id={movable ? id : undefined}
>
  <div class="drawer-header">
    <div class="drawer-header__title">
      <button type="button" class={cn('drawer-chevron', !collapsed && 'drawer-chevron--expanded')} onclick={handleToggle}>
        <ChevronRight class="w-3.5 h-3.5" />
      </button>
      <span class="drawer-header__text">{header}</span>
    </div>

    <div bind:this={menuRoot} class="drawer-header__actions">
      {#if movable}
        <button
          type="button"
          class="card-grip"
          title={labels.drag}
          draggable="true"
          ondragstart={handleCardDragStart}
          ondragend={handleCardDragEnd}
        >
          <GripVertical class="w-3.5 h-3 rotate-90" />
        </button>
      {/if}

      {#if actions}
        {@render actions()}
      {/if}

      <div class="card-menu">
        <button type="button" class="lane-drag-handle__menu" title={labels.more} onclick={toggleMenu}>
          <Ellipsis class="w-3.5 h-3.5" />
        </button>

        {#if menuOpen}
          <div class="card-menu__panel">
            <button type="button" class="card-menu__item" onclick={handlePopout}>
              {poppedOut ? labels.closePopout : labels.popoutCard}
            </button>
            <button type="button" class="card-menu__item" onclick={() => { handleToggle(); menuOpen = false; }}>
              {collapsed ? labels.expandCard : labels.collapseCard}
            </button>
          </div>
        {/if}
      </div>
    </div>

    {#if expandable && !collapsed}
      <button
        type="button"
        class="drawer-chevron"
        onclick={handleExpandToggle}
        title={expanded ? labels.collapseDetail : labels.expandDetail}
        style={`margin-left:auto;color:${expanded ? 'var(--fill-pop-bg)' : 'inherit'};transform:${expanded ? 'rotate(90deg)' : 'rotate(-90deg)'}`}
      >
        <ChevronRight class="w-3.5 h-3.5" />
      </button>
    {/if}
  </div>

  {#if !collapsed}
    <div class={cn('drawer-scroll', !scrollable && 'drawer-scroll--auto')}>
      <div class="drawer__content">
        {@render children?.()}
      </div>
    </div>
  {/if}

  {#if detail && showDetail}
    <div class="drawer-detail">
      <button type="button" class="drawer-detail__close" onclick={() => (expanded = false)} title={labels.closeDetail}>
        <X class="w-3.5 h-3.5" />
      </button>
      <div class="drawer-detail__inner">
        {@render detail()}
      </div>
    </div>
  {/if}

  {#if poppedOut}
    <div class="card-popout">
      <button type="button" class="card-popout__backdrop" aria-label={labels.closePopout} onclick={() => (poppedOut = false)}></button>
      <div class="card-popout__panel">
        <div class="drawer-header">
          <div class="drawer-header__title">
            <span class="drawer-header__text">{header}</span>
          </div>
          <button type="button" class="drawer-detail__close" onclick={() => (poppedOut = false)} title={labels.closePopout}>
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
        <div class="card-popout__body">
          {#if detail}
            {@render detail()}
          {:else}
            {@render children?.()}
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>
