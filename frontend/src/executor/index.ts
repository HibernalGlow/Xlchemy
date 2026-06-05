import type { BackendExecutor } from './types';
import { WailsExecutor } from './wailsExecutor';
import { ElectronExecutor } from './electronExecutor';
import { TauriExecutor } from './tauriExecutor';
import { PywebviewExecutor } from './pywebviewExecutor';

let currentExecutor: BackendExecutor | null = null;

export function getExecutor(): BackendExecutor {
  if (!currentExecutor) {
    if (typeof window !== 'undefined' && window.pywebview?.api) {
      currentExecutor = new PywebviewExecutor();
    } else {
      currentExecutor = new WailsExecutor();
    }
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
    case 'pywebview':
      return new PywebviewExecutor();
    default:
      throw new Error(`Unknown executor: ${name}`);
  }
}

export * from './types';
