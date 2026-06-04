import type { BackendExecutor, Unsubscribe } from './types';
import type {
  FileItem,
  ExecutionPlan,
  AppStateSnapshot,
  AppConstants,
  DomainEvent,
} from '$lib/domain';

/**
 * TauriExecutor - Shell adapter for future Tauri backend.
 * This is a placeholder to verify the BackendExecutor interface boundary.
 * All methods throw "not implemented" to signal missing integration.
 */
export class TauriExecutor implements BackendExecutor {
  readonly name = 'tauri';

  async getConstants(): Promise<AppConstants> {
    throw new Error('TauriExecutor.getConstants() not implemented');
  }

  async pickFiles(): Promise<string[]> {
    throw new Error('TauriExecutor.pickFiles() not implemented');
  }

  async pickDirectory(): Promise<string | null> {
    throw new Error('TauriExecutor.pickDirectory() not implemented');
  }

  async statFiles(paths: string[]): Promise<FileItem[]> {
    throw new Error('TauriExecutor.statFiles() not implemented');
  }

  async scanDirectory(dirPath: string): Promise<FileItem[]> {
    throw new Error('TauriExecutor.scanDirectory() not implemented');
  }

  async runConversionPlan(plan: ExecutionPlan): Promise<void> {
    throw new Error('TauriExecutor.runConversionPlan() not implemented');
  }

  async cancelRun(runId: string): Promise<void> {
    throw new Error('TauriExecutor.cancelRun() not implemented');
  }

  async loadAppState(): Promise<Partial<AppStateSnapshot>> {
    throw new Error('TauriExecutor.loadAppState() not implemented');
  }

  async saveAppState(snapshot: AppStateSnapshot): Promise<void> {
    throw new Error('TauriExecutor.saveAppState() not implemented');
  }

  subscribeEvents(_handler: (event: DomainEvent) => void): Unsubscribe {
    // No-op until Tauri event bridge is implemented
    return () => {};
  }
}
