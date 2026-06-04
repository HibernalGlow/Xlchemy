import type { BackendExecutor, Unsubscribe } from './types';
import type {
  FileItem,
  ExecutionPlan,
  AppStateSnapshot,
  AppConstants,
  DomainEvent,
} from '$lib/domain';

/**
 * ElectronExecutor - Shell adapter for future Electron backend.
 * This is a placeholder to verify the BackendExecutor interface boundary.
 * All methods throw "not implemented" to signal missing integration.
 */
export class ElectronExecutor implements BackendExecutor {
  readonly name = 'electron';

  async getConstants(): Promise<AppConstants> {
    throw new Error('ElectronExecutor.getConstants() not implemented');
  }

  async pickFiles(): Promise<string[]> {
    throw new Error('ElectronExecutor.pickFiles() not implemented');
  }

  async pickDirectory(): Promise<string | null> {
    throw new Error('ElectronExecutor.pickDirectory() not implemented');
  }

  async statFiles(paths: string[]): Promise<FileItem[]> {
    throw new Error('ElectronExecutor.statFiles() not implemented');
  }

  async scanDirectory(dirPath: string): Promise<FileItem[]> {
    throw new Error('ElectronExecutor.scanDirectory() not implemented');
  }

  async runConversionPlan(plan: ExecutionPlan): Promise<void> {
    throw new Error('ElectronExecutor.runConversionPlan() not implemented');
  }

  async cancelRun(runId: string): Promise<void> {
    throw new Error('ElectronExecutor.cancelRun() not implemented');
  }

  async loadAppState(): Promise<Partial<AppStateSnapshot>> {
    throw new Error('ElectronExecutor.loadAppState() not implemented');
  }

  async saveAppState(snapshot: AppStateSnapshot): Promise<void> {
    throw new Error('ElectronExecutor.saveAppState() not implemented');
  }

  subscribeEvents(_handler: (event: DomainEvent) => void): Unsubscribe {
    // No-op until IPC bridge is implemented
    return () => {};
  }
}
