import type {
  FileItem,
  ExecutionPlan,
  AppStateSnapshot,
  AppConstants,
  DomainEvent,
} from '$lib/domain';

export type Unsubscribe = () => void;

export interface BackendExecutor {
  // Identity
  readonly name: string;

  // System / constants
  getConstants(): Promise<AppConstants>;

  // File system capabilities
  pickFiles(): Promise<string[]>;
  pickDirectory(): Promise<string | null>;
  statFiles(paths: string[]): Promise<FileItem[]>;
  scanDirectory(dirPath: string): Promise<FileItem[]>;

  // Execution capabilities
  runConversionPlan(plan: ExecutionPlan): Promise<void>;
  cancelRun(runId: string): Promise<void>;

  // Persistence capabilities
  loadAppState(): Promise<Partial<AppStateSnapshot>>;
  saveAppState(snapshot: AppStateSnapshot): Promise<void>;

  // Preset capabilities (optional, can be frontend-only)
  listPresets?(): Promise<string[]>;
  savePreset?(name: string, snapshot: AppStateSnapshot): Promise<void>;
  loadPreset?(name: string): Promise<Partial<AppStateSnapshot>>;
  deletePreset?(name: string): Promise<void>;

  // Event subscription
  subscribeEvents(handler: (event: DomainEvent) => void): Unsubscribe;

  // Logging
  writeLog?(level: string, message: string): Promise<void>;

  // System integration
  showFileInFolder?(path: string): Promise<void>;
}
