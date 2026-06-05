// backend.ts - Transition layer
// Re-exports the executor API for backward compatibility.
// New code should import from $lib/executor directly.

import { createDefaultSnapshot, type AppStateSnapshot } from '$lib/domain';
import { getExecutor } from '$lib/executor';

const executor = getExecutor();
const defaultSnapshot = createDefaultSnapshot();

export const backend = {
  async getConstants() {
    return executor.getConstants();
  },

  async getSettings() {
    const snapshot = await executor.loadAppState();
    return {
      output: snapshot.domain?.output || defaultSnapshot.domain.output,
      modify: snapshot.domain?.modify || defaultSnapshot.domain.modify,
      app: snapshot.domain?.app || defaultSnapshot.domain.app,
    };
  },

  saveSettings(payload: { output: any; modify: any; app: any }) {
    const snapshot: AppStateSnapshot = {
      ...defaultSnapshot,
      domain: {
        output: payload.output || defaultSnapshot.domain.output,
        modify: payload.modify || defaultSnapshot.domain.modify,
        app: payload.app || defaultSnapshot.domain.app,
      },
      executor: executor.name,
    };
    return executor.saveAppState(snapshot);
  },

  async selectImageFiles(): Promise<string[]> {
    return executor.pickFiles();
  },

  async selectFolder(): Promise<string | null> {
    return executor.pickDirectory();
  },

  async addFiles(paths: string[]) {
    const items = await executor.statFiles(paths);
    return items;
  },

  async scanDirectory(path: string) {
    return executor.scanDirectory(path);
  },

  startConversion(items: any[], output: any, modify: any, app: any, threadCount: number) {
    // Transition: appState.startConversion now uses buildExecutionPlan + executor.runConversionPlan
    // This shim is kept for emergency fallback only
    console.warn('backend.startConversion is deprecated, use appState.startConversion');
    return Promise.resolve();
  },

  cancelConversion() {
    return executor.cancelRun('current');
  },

  onProgress(handler: (data: any) => void) {
    return executor.subscribeEvents((event) => {
      if (event.type === 'task_progress') {
        handler({
          completed: event.completed,
          total: event.total,
          line1: event.line1,
          line2: event.line2,
        });
      }
    });
  },

  onException(handler: (data: any) => void) {
    return executor.subscribeEvents((event) => {
      if (event.type === 'task_failed') {
        handler({
          id: event.errorId,
          msg: event.errorMsg,
          path: event.inputPath,
        });
      }
    });
  },

  onFinished(handler: () => void) {
    return executor.subscribeEvents((event) => {
      if (event.type === 'run_finished') handler();
    });
  },

  onCanceled(handler: () => void) {
    return executor.subscribeEvents((event) => {
      if (event.type === 'run_canceled') handler();
    });
  },

  onStarted(handler: () => void) {
    return executor.subscribeEvents((event) => {
      if (event.type === 'run_started') handler();
    });
  },

  onFilesDropped(handler: (files: string[]) => void | Promise<void>) {
    // File drop events still come through Wails window events
    // This is handled in app.svelte directly
    return () => {};
  },
};
