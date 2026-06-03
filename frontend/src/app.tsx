import {
  FileInput,
  FileOutput,
  Info,
  Settings,
  SlidersHorizontal,
} from 'lucide-react';
import { useMemo } from 'react';
import { AppStateProvider, useAppState } from '~/hooks/useAppState';
import { useT } from '~/hooks/useT';
import { CanvasChrome, type LaneConfig } from '~/components/canvas/CanvasChrome';
import { InputLane } from '~/lanes/InputLane';
import { OutputLane } from '~/lanes/OutputLane';
import { ModifyLane } from '~/lanes/ModifyLane';
import { SettingsLane } from '~/lanes/SettingsLane';
import { AboutLane } from '~/lanes/AboutLane';
import { ExceptionsDialog } from '~/dialogs/ExceptionsDialog';
import { ImportSettingsDialog } from '~/dialogs/ImportSettingsDialog';

export default function App() {
  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  );
}

function AppContent() {
  const state = useAppState();
  const t = useT();

  const lanes = useMemo<LaneConfig[]>(
    () => [
      { id: 'input', title: t('Input'), icon: <FileInput className="w-3.5 h-3.5" />, content: <InputLane /> },
      { id: 'output', title: t('Output'), icon: <FileOutput className="w-3.5 h-3.5" />, content: <OutputLane /> },
      { id: 'modify', title: t('Modify'), icon: <SlidersHorizontal className="w-3.5 h-3.5" />, content: <ModifyLane /> },
      { id: 'settings', title: t('Settings'), icon: <Settings className="w-3.5 h-3.5" />, content: <SettingsLane /> },
      { id: 'about', title: t('About'), icon: <Info className="w-3.5 h-3.5" />, content: <AboutLane /> },
    ],
    [t],
  );

  // Sort lanes according to persisted laneOrder
  const sortedLanes = useMemo(() => {
    const order = state.laneOrder;
    const map = new Map(lanes.map((l) => [l.id, l]));
    const sorted: LaneConfig[] = [];
    for (const id of order) {
      const cfg = map.get(id);
      if (cfg) { sorted.push(cfg); map.delete(id); }
    }
    // Append any remaining lanes not in the order
    for (const cfg of map.values()) sorted.push(cfg);
    return sorted;
  }, [lanes, state.laneOrder]);

  return (
    <div
      data-file-drop-target
      className="flex flex-col h-screen bg-[var(--bg-2)] text-text-1 select-none"
      onDragOver={(e) => e.preventDefault()}
      onDrop={state.handleDrop}
    >
      <CanvasChrome
        lanes={sortedLanes}
        collapsedLanes={state.collapsedLanes}
        onToggleCollapse={state.toggleLaneCollapsed}
        laneWidth={state.laneWidth}
        onLaneWidthChange={state.setLaneWidth}
        version={state.constants.version}
        isConverting={state.isConverting}
        progress={state.progress}
        fileCount={state.fileItems.length}
        exceptionCount={state.exceptions.length}
        onConvert={state.startConversion}
        onCancel={state.cancelConversion}
        onShowExceptions={() => state.setShowExceptions(true)}
      />

      <ExceptionsDialog
        open={state.showExceptions}
        onOpenChange={state.setShowExceptions}
        exceptions={state.exceptions}
        onClose={state.clearExceptions}
      />

      <ImportSettingsDialog
        open={state.showImportDialog}
        onOpenChange={state.setShowImportDialog}
        importJson={state.importSettingsJson}
        onImportJsonChange={state.setImportSettingsJson}
        onImport={state.handleImportSettings}
      />
    </div>
  );
}
