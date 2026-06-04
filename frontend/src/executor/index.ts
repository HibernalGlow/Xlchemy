import type { BackendExecutor } from './types';
import { WailsExecutor } from './wailsExecutor';
import { ElectronExecutor } from './electronExecutor';
import { TauriExecutor } from './tauriExecutor';

let currentExecutor: BackendExecutor | null = null;

export function getExecutor(): BackendExecutor {
  if (!currentExecutor) {
    currentExecutor = new WailsExecutor();
  }
  return currentExecutor;
}

export function setExecutor(executor: BackendExecutor): void {
  currentExecutor = executor;
}

export function createExecutor(name: string): BackendExecutor {
  switch (name) {
    case 'wails':
      return new WailsExecutor();
    case 'electron':
      return new ElectronExecutor();
    case 'tauri':
      return new TauriExecutor();
    default:
      throw new Error(`Unknown executor: ${name}`);
  }
}

export * from './types';
