import type { BackendExecutor, Unsubscribe } from './types';
import type {
  AppConstants,
  AppStateSnapshot,
  DomainEvent,
  ExecutionPlan,
  FileItem,
} from '$lib/domain';

declare global {
  interface Window {
    pywebview?: {
      api?: {
        get_constants?: () => Promise<AppConstants>;
        pick_files?: () => Promise<string[] | null>;
        pick_directory?: () => Promise<string | null>;
        stat_files?: (paths: string[]) => Promise<FileItem[]>;
        scan_directory?: (dirPath: string) => Promise<FileItem[]>;
        run_conversion_plan?: (plan: ExecutionPlan) => Promise<void>;
        cancel_run?: (runId: string) => Promise<void>;
        load_app_state?: () => Promise<Partial<AppStateSnapshot>>;
        save_app_state?: (snapshot: AppStateSnapshot) => Promise<void>;
        list_presets?: () => Promise<string[]>;
        save_preset?: (name: string, snapshot: AppStateSnapshot) => Promise<void>;
        load_preset?: (name: string) => Promise<Partial<AppStateSnapshot>>;
        delete_preset?: (name: string) => Promise<void>;
      };
    };
    __XLCHMY_DISPATCH_EVENT__?: (event: DomainEvent) => void;
  }
}

type PywebviewApi = NonNullable<NonNullable<typeof window.pywebview>['api']>;

function requireApi(): PywebviewApi {
  const api = window.pywebview?.api;
  if (!api) {
    throw new Error('Pywebview API is unavailable');
  }
  return api;
}

export class PywebviewExecutor implements BackendExecutor {
  readonly name = 'pywebview';
  private listeners = new Set<(event: DomainEvent) => void>();
  private bridgeInstalled = false;

  constructor() {
    this.installBridge();
  }

  async getConstants(): Promise<AppConstants> {
    return requireApi().get_constants!();
  }

  async pickFiles(): Promise<string[]> {
    return (await requireApi().pick_files!()) || [];
  }

  async pickDirectory(): Promise<string | null> {
    return (await requireApi().pick_directory!()) || null;
  }

  async statFiles(paths: string[]): Promise<FileItem[]> {
    return await requireApi().stat_files!(paths);
  }

  async scanDirectory(dirPath: string): Promise<FileItem[]> {
    return await requireApi().scan_directory!(dirPath);
  }

  async runConversionPlan(plan: ExecutionPlan): Promise<void> {
    await requireApi().run_conversion_plan!(plan);
  }

  async cancelRun(runId: string): Promise<void> {
    await requireApi().cancel_run!(runId);
  }

  async loadAppState(): Promise<Partial<AppStateSnapshot>> {
    return (await requireApi().load_app_state!()) || {};
  }

  async saveAppState(snapshot: AppStateSnapshot): Promise<void> {
    await requireApi().save_app_state!(snapshot);
  }

  async listPresets(): Promise<string[]> {
    return (await requireApi().list_presets?.()) || [];
  }

  async savePreset(name: string, snapshot: AppStateSnapshot): Promise<void> {
    await requireApi().save_preset?.(name, snapshot);
  }

  async loadPreset(name: string): Promise<Partial<AppStateSnapshot>> {
    return (await requireApi().load_preset?.(name)) || {};
  }

  async deletePreset(name: string): Promise<void> {
    await requireApi().delete_preset?.(name);
  }

  subscribeEvents(handler: (event: DomainEvent) => void): Unsubscribe {
    this.installBridge();
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  private installBridge() {
    if (this.bridgeInstalled) return;
    window.__XLCHMY_DISPATCH_EVENT__ = (event: DomainEvent) => {
      for (const listener of this.listeners) {
        listener(event);
      }
    };
    this.bridgeInstalled = true;
  }
}
