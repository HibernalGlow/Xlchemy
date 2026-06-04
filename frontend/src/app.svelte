<script lang="ts">
  import { onMount } from 'svelte';
  import ExceptionsDialog from '$lib/dialogs/ExceptionsDialog.svelte';
  import ImportSettingsDialog from '$lib/dialogs/ImportSettingsDialog.svelte';
  import BottomBar from '$lib/layout/BottomBar.svelte';
  import ChromeSidebar from '$lib/layout/ChromeSidebar.svelte';
  import CustomScrollbar from '$lib/layout/CustomScrollbar.svelte';
  import HeaderBar from '$lib/layout/HeaderBar.svelte';
  import Lane from '$lib/layout/Lane.svelte';
  import LaneContainer from '$lib/layout/LaneContainer.svelte';
  import AboutLane from '$lib/sections/AboutLane.svelte';
  import InputLane from '$lib/sections/InputLane.svelte';
  import ModifyLane from '$lib/sections/ModifyLane.svelte';
  import OutputLane from '$lib/sections/OutputLane.svelte';
  import SettingsLane from '$lib/sections/SettingsLane.svelte';
  import { i18n } from '$lib/i18n/t.svelte';
  import { appState } from '$lib/state/app.svelte';
  import { canvasState } from '$lib/state/canvas.svelte';
  import { initConversionEvents } from '$lib/state/conversion.svelte';
  import { backend } from '$lib/backend';

  const t = i18n.t;

  function lanes() {
    return [
      { id: 'input', title: t('Input'), component: InputLane },
      { id: 'output', title: t('Output'), component: OutputLane },
      { id: 'modify', title: t('Modify'), component: ModifyLane },
      { id: 'settings', title: t('Settings'), component: SettingsLane },
      { id: 'about', title: t('About'), component: AboutLane },
    ];
  }

  function sortedLanes() {
    const order = appState.laneOrder;
    const source = lanes();
    const map = new Map(source.map((lane) => [lane.id, lane]));
    const sorted: typeof source = [];
    for (const id of order) {
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
  <HeaderBar version={appState.constants.version} fileCount={appState.fileItems.length} currentTheme={appState.appSettings.theme || 'Miku'} />

  <div class="chrome-body">
    <ChromeSidebar
      laneTabs={sortedLanes().map((lane) => ({ id: lane.id, title: lane.title, active: canvasState.visibleLanes.includes(lane.id) }))}
      onLaneSelect={(laneId) => canvasState.scrollToLane(laneId)}
    />

    <div class="chrome-content">
      <div class="chrome-workspace canvas-bg">
        <LaneContainer onReorderLanes={handleReorderLanes}>
          {#each sortedLanes() as lane (lane.id)}
            {@const LaneComponent = lane.component}
            <Lane
              id={lane.id}
              title={lane.title}
              collapsed={appState.collapsedLanes.has(lane.id)}
              onToggleCollapse={() => appState.toggleLaneCollapsed(lane.id)}
              width={appState.laneWidth}
              dragOverId={canvasState.dragOverId}
            >
              <LaneComponent />
            </Lane>
          {/each}
        </LaneContainer>

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
