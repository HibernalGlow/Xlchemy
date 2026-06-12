<script lang="ts">
  import { Ellipsis, GripVertical } from '@lucide/svelte';
  import { cn } from '$lib/utils/cn';
  import { _ } from 'svelte-i18n';

  interface Props {
    title: string;
    collapsed: boolean;
    onToggleCollapse: () => void;
    onDragStart?: (e: DragEvent) => void;
    onDragEnd?: () => void;
    actions?: import('svelte').Snippet;
    onRename?: () => void;
    onDelete?: () => void;
    onHide?: () => void;
    onPopout?: () => void;
    poppedOut?: boolean;
  }

  let { title, collapsed, onToggleCollapse, onDragStart, onDragEnd, actions, onRename, onDelete, onHide, onPopout, poppedOut = false }: Props = $props();
  let menuOpen = $state(false);
</script>

<div class="lane-drag-handle">
  <button
    type="button"
    class={cn('lane-drag-handle__collapse', collapsed && 'lane-drag-handle__collapse--folded')}
    onclick={onToggleCollapse}
    title={collapsed ? `${$_('common.expand')} ${title}` : `${$_('common.collapse')} ${title}`}
  >
    <svg class="lane-drag-handle__icon" viewBox="0 0 15 10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.75 0.75H2.75C1.64543 0.75 0.75 1.64543 0.75 2.75V6.75C0.75 7.85457 1.64543 8.75 2.75 8.75H11.75C12.8546 8.75 13.75 7.85457 13.75 6.75V2.75C13.75 1.64543 12.8546 0.75 11.75 0.75Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      <rect class="lane-drag-handle__lane-rect" x="0.75" y="0.75" width="5" height="8" rx="2" stroke="currentColor" stroke-width="1.5"/>
    </svg>
  </button>

  <div class="lane-drag-handle__center">
    <span class="lane-drag-handle__title">{title}</span>
  </div>

  <div class="lane-drag-handle__actions">
    <div role="button" aria-label={`${$_('common.drag')} ${title}`} tabindex="0" class="lane-drag-handle__grip" draggable="true" ondragstart={onDragStart} ondragend={onDragEnd} data-drag-handle>
      <GripVertical class="w-[10px] h-[14px]" />
    </div>
    {#if actions}
      {@render actions()}
    {/if}
    <div class="lane-menu-anchor">
      <button type="button" class="lane-drag-handle__menu" title={$_('common.more_actions')} onclick={() => (menuOpen = !menuOpen)}>
        <Ellipsis class="w-3.5 h-3.5" />
      </button>
      {#if menuOpen}
        <div class="lane-card-menu lane-card-menu--lane">
          <button type="button" onclick={() => { menuOpen = false; onPopout?.(); }}>{poppedOut ? $_('lane_actions.close_pop_out') : $_('lane_actions.pop_out')}</button>
          <button type="button" onclick={() => { menuOpen = false; onRename?.(); }}>{$_('lane_actions.rename')}</button>
          <button type="button" onclick={() => { menuOpen = false; onToggleCollapse(); }}>{collapsed ? $_('lane_actions.expand_lane') : $_('lane_actions.collapse_lane')}</button>
          {#if onHide}
            <button type="button" onclick={() => { menuOpen = false; onHide?.(); }}>{$_('lane_actions.hide_lane')}</button>
          {/if}
          {#if onDelete}
            <button type="button" class="danger" onclick={() => { menuOpen = false; onDelete?.(); }}>{$_('lane_actions.delete_lane')}</button>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>
