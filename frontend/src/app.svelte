<script lang="ts">
  import { onMount } from 'svelte';
  import CardLaneRenderer from '$lib/cards/CardLaneRenderer.svelte';
  import ExceptionsDialog from '$lib/dialogs/ExceptionsDialog.svelte';
  import ImportSettingsDialog from '$lib/dialogs/ImportSettingsDialog.svelte';
  import BottomBar from '$lib/layout/BottomBar.svelte';
  import ChromeSidebar from '$lib/layout/ChromeSidebar.svelte';
  import CustomScrollbar from '$lib/layout/CustomScrollbar.svelte';
  import FloatingLaneSwitcher from '$lib/layout/FloatingLaneSwitcher.svelte';
  import HeaderBar from '$lib/layout/HeaderBar.svelte';
  import Lane from '$lib/layout/Lane.svelte';
  import LaneContainer from '$lib/layout/LaneContainer.svelte';
  import { i18n } from '$lib/i18n/t.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { canvasState } from '$lib/state/canvas.svelte';
  import { initConversionEvents } from '$lib/state/conversion.svelte';
  import { backend } from '$lib/backend';
  import type { LaneId } from '$lib/cards/definitions';

  const t = i18n.t;

  type LaneItem = { id: LaneId; title: string };

  function lanes(): LaneItem[] {
    return [
      { id: 'input', title: t('Input') },
      { id: 'output', title: t('Output') },
      { id: 'modify', title: t('Modify') },
      { id: 'settings', title: t('Settings') },
      { id: 'about', title: t('About') },
    ];
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
    return appState.singleLaneMode
      ? sortedLanes().filter((lane) => lane.id === appState.activeLaneId)
      : sortedLanes();
  }

  onMount(() => {
    appState.init();
    const cleanupConversion = initConversionEvents();
    canvasState.setupEffects();
    const cleanupTheme = appState.watchTheme();
    return () => {
      cleanupConversion?.();
      cleanupTheme?.();
    };
  });

  $effect(() => {
    const out = appState.outputSettings;
    const mod = appState.modifySettings;
    const app = appState.appSettings;
    if (Object.keys(out).length > 0 || Object.keys(mod).length > 0 || Object.keys(app).length > 0) {
      backend.saveSettings({ output: out, modify: mod, app });
    }
  });
</script>

<div role="application" class="app-shell text-text-1 select-none" data-file-drop-target ondragover={preventDefault} ondrop={appState.handleDrop}>
  <HeaderBar
    version={appState.constants.version}
    fileCount={appState.fileItems.length}
    currentTheme={appState.appSettings.theme || 'Miku'}
    isConverting={appState.isConverting}
    onConvert={() => appState.startConversion()}
    onCancel={() => appState.cancelConversion()}
    singleLaneMode={appState.singleLaneMode}
    onToggleSingleLaneMode={() => appState.setSingleLaneMode(!appState.singleLaneMode)}
  />

  <div class="chrome-body">
    <ChromeSidebar
      laneTabs={sortedLanes().map((lane) => ({ id: lane.id, title: lane.title, active: canvasState.visibleLanes.includes(lane.id) }))}
      onLaneSelect={(laneId) => canvasState.scrollToLane(laneId as LaneId)}
    />

    <div class="chrome-content">
      <div class="chrome-workspace canvas-bg">
        <LaneContainer onReorderLanes={handleReorderLanes} onMoveCard={(cardId, fromLaneId, toLaneId) => appState.moveCard(cardId as any, fromLaneId as any, toLaneId as any)}>
          {#each visibleLanes() as lane (lane.id)}
            <Lane
              id={lane.id}
              title={lane.title}
              collapsed={appState.collapsedLanes.has(lane.id)}
              onToggleCollapse={() => appState.toggleLaneCollapsed(lane.id)}
              width={appState.singleLaneMode ? 28 : appState.laneWidth}
              dragOverId={canvasState.dragOverId}
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

        <BottomBar
          isConverting={appState.isConverting}
          progress={appState.progress}
          fileCount={appState.fileItems.length}
          exceptionCount={appState.exceptions.length}
          onConvert={() => appState.startConversion()}
          onCancel={() => appState.cancelConversion()}
          onShowExceptions={() => (appState.showExceptions = true)}
          disabled={appState.isConverting}
        />
      </div>
    </div>
  </div>

  <ExceptionsDialog bind:open={appState.showExceptions} />
  <ImportSettingsDialog bind:open={appState.showImportDialog} />
</div>
