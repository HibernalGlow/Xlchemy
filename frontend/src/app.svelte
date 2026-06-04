<script lang="ts">
  import { onMount } from 'svelte';
  import CardLaneRenderer from '$lib/cards/CardLaneRenderer.svelte';
  import ExceptionsDialog from '$lib/dialogs/ExceptionsDialog.svelte';
  import ImportSettingsDialog from '$lib/dialogs/ImportSettingsDialog.svelte';

  import ChromeSidebar from '$lib/layout/ChromeSidebar.svelte';
  import CustomScrollbar from '$lib/layout/CustomScrollbar.svelte';
  import BottomLaneNav from '$lib/layout/BottomLaneNav.svelte';
  import FloatingLaneSwitcher from '$lib/layout/FloatingLaneSwitcher.svelte';
  import HeaderBar from '$lib/layout/HeaderBar.svelte';
  import Lane from '$lib/layout/Lane.svelte';
  import LaneContainer from '$lib/layout/LaneContainer.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { canvasState } from '$lib/state/canvas.svelte';
  import { initConversionEvents } from '$lib/state/conversion.svelte';
  import { getExecutor } from '$lib/executor';
  import type { LaneId } from '$lib/cards/definitions';

  import { _ } from 'svelte-i18n';
  import { initI18n } from './i18n';

  type LaneItem = { id: LaneId; title: string };

  function lanes(): LaneItem[] {
    return appState.laneOrder.map((id) => ({ id, title: appState.laneTitle(id) }));
  }

  function sortedLanes() {
    const order = appState.laneOrder;
    const source = lanes();
    const map = new Map<LaneId, LaneItem>(source.map((lane) => [lane.id, lane]));
    const sorted: LaneItem[] = [];
    for (const id of order as LaneId[]) {
      const lane = map.get(id);
      if (lane) {
        sorted.push(lane);
        map.delete(id);
      }
    }
    for (const lane of map.values()) sorted.push(lane);
    return sorted;
  }

  function handleReorderLanes(fromId: string, toId: string) {
    const order = [...appState.laneOrder];
    for (const lane of lanes()) {
      if (!order.includes(lane.id)) order.push(lane.id);
    }
    const fromIndex = order.indexOf(fromId);
    const toIndex = order.indexOf(toId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    order.splice(fromIndex, 1);
    order.splice(toIndex, 0, fromId);
    appState.setLaneOrder(order);
  }

  function preventDefault(e: DragEvent) {
    e.preventDefault();
  }

  function visibleLanes() {
    const lanes = appState.singleLaneMode
      ? sortedLanes().filter((lane) => lane.id === appState.activeLaneId)
      : sortedLanes();
    return lanes.filter((lane) => !appState.hiddenLanes.has(lane.id));
  }

  onMount(() => {
    initI18n();
    appState.init();
    const cleanupConversion = initConversionEvents();
    const cleanupFileDrops = appState.subscribeFileDrops();
    canvasState.setupEffects();
    const cleanupTheme = appState.watchTheme();
    return () => {
      cleanupConversion?.();
      cleanupFileDrops?.();
      cleanupTheme?.();
    };
  });

  $effect(() => {
    if (!appState.isInitialized) return;
    const out = appState.outputSettings;
    const mod = appState.modifySettings;
    const app = appState.appSettings;
    if (Object.keys(out).length > 0 || Object.keys(mod).length > 0 || Object.keys(app).length > 0) {
      appState.saveCurrentSettings().catch((e: any) => console.error('saveAppState error:', e));
    }
  });
</script>

<div role="application" class="app-shell text-text-1 select-none" data-file-drop-target ondragover={preventDefault} ondrop={appState.handleDrop}>
  <HeaderBar
    version={appState.constants.version}
    currentTheme={appState.appSettings.theme || 'Miku'}
    backgroundSettings={appState.backgroundSettings}
    isConverting={appState.isConverting}
    onConvert={() => appState.startConversion()}
    onCancel={() => appState.cancelConversion()}
    singleLaneMode={appState.singleLaneMode}
    onToggleSingleLaneMode={() => appState.setSingleLaneMode(!appState.singleLaneMode)}
    onCreateLane={() => appState.createLane(prompt('Lane name') || 'New Lane')}
    onThemeChange={(name) => appState.changeTheme(name)}
    onThemeModeChange={(mode) => appState.changeThemeMode(mode)}
    onBackgroundChange={(partial) => appState.updateBackground(partial)}
  />

  <div class="chrome-body">
    <ChromeSidebar
      laneTabs={sortedLanes().map((lane) => ({ id: lane.id, title: lane.title, active: canvasState.visibleLanes.includes(lane.id) }))}
      onLaneSelect={(laneId) => canvasState.scrollToLane(laneId as LaneId)}
    />

    <div class="chrome-content">
      <div class="chrome-workspace canvas-bg canvas-bg--{appState.backgroundSettings.mode}">
        {#if appState.backgroundSettings.mode === 'image' && appState.backgroundSettings.imageUrl}
          <div
            class="canvas-bg-image"
            style:background-image="url({appState.backgroundSettings.imageUrl})"
            style:opacity={appState.backgroundSettings.opacity / 100}
            style:filter="blur({appState.backgroundSettings.blur}px)"
          ></div>
        {/if}
        <LaneContainer onReorderLanes={handleReorderLanes} onMoveCard={(cardId, fromLaneId, toLaneId, targetCardId) => appState.moveCard(cardId as any, fromLaneId as any, toLaneId as any, targetCardId as any)}>
          {#each visibleLanes() as lane (lane.id)}
            <Lane
              id={lane.id}
              title={lane.title}
              collapsed={appState.collapsedLanes.has(lane.id)}
              onToggleCollapse={() => appState.toggleLaneCollapsed(lane.id)}
              width={appState.singleLaneMode ? 28 : appState.laneWidth(lane.id)}
              maxWidth={appState.appSettings.lane_max_width || 44}
              onResizeEnd={(nextWidth) => appState.setLaneWidth(lane.id, nextWidth)}
              dragOverId={canvasState.dragOverId}
              onRename={() => appState.renameLane(lane.id, prompt('Lane name', appState.laneTitle(lane.id)) || appState.laneTitle(lane.id))}
              onDelete={['input', 'output', 'modify', 'settings', 'about'].includes(lane.id) ? undefined : () => appState.deleteLane(lane.id)}
              onHide={() => appState.toggleLaneHidden(lane.id)}
            >
              <CardLaneRenderer laneId={lane.id} />
            </Lane>
          {/each}
        </LaneContainer>

        {#if appState.singleLaneMode}
          <FloatingLaneSwitcher
            laneTabs={sortedLanes().map((lane) => ({ id: lane.id, title: lane.title, active: lane.id === appState.activeLaneId }))}
            activeLaneId={appState.activeLaneId}
            onSelect={(laneId) => appState.setActiveLaneId(laneId as LaneId)}
          />
        {/if}

        <CustomScrollbar viewport={canvasState.canvasEl} />

        <BottomLaneNav
          laneTabs={sortedLanes().map((lane) => ({ id: lane.id, title: lane.title, active: lane.id === appState.activeLaneId }))}
          onSelect={(laneId) => {
            appState.setActiveLaneId(laneId as LaneId);
            canvasState.scrollToLane(laneId as LaneId);
          }}
          onCreateLane={() => appState.createLane(prompt('Lane name') || 'New Lane')}
        />
      </div>
    </div>
  </div>

  <ExceptionsDialog bind:open={appState.showExceptions} />
  <ImportSettingsDialog bind:open={appState.showImportDialog} />
</div>
