import type {
  BackendExecutor,
  Unsubscribe,
} from './types';
import type {
  FileItem,
  ExecutionPlan,
  AppStateSnapshot,
  AppConstants,
  DomainEvent,
} from '$lib/domain';

const PKG = 'main.AppService';

type WailsRuntime = typeof import('@wailsio/runtime');

async function loadRuntime(): Promise<WailsRuntime> {
  return await import('@wailsio/runtime');
}

async function callGo(method: string, ...args: any[]): Promise<any> {
  const runtime = await loadRuntime();
  return runtime.Call.ByName(`${PKG}.${method}`, ...args);
}

function imageFilePattern(): string {
  return '*.jpg;*.jpeg;*.png;*.webp;*.avif;*.jxl;*.gif;*.bmp;*.ico;*.tiff;*.tif;*.apng;*.jp2';
}

export class WailsExecutor implements BackendExecutor {
  readonly name = 'wails';

  async getConstants(): Promise<AppConstants> {
    const raw = await callGo('GetConstants');
    return JSON.parse(raw);
  }

  async pickFiles(): Promise<string[]> {
    const runtime = await loadRuntime();
    const selected = await runtime.Dialogs.OpenFile({
      CanChooseFiles: true,
      AllowsMultipleSelection: true,
      Title: 'Select image files',
      Filters: [{ DisplayName: 'Images', Pattern: imageFilePattern() }],
    });
    if (!selected) return [];
    return Array.isArray(selected) ? selected : [selected];
  }

  async pickDirectory(): Promise<string | null> {
    const runtime = await loadRuntime();
    const selected = await runtime.Dialogs.OpenFile({
      CanChooseDirectories: true,
      CanChooseFiles: false,
      Title: 'Select folder',
    });
    return selected ? String(selected) : null;
  }

  async statFiles(paths: string[]): Promise<FileItem[]> {
    const raw = await callGo('AddFiles', paths);
    return JSON.parse(raw);
  }

  async scanDirectory(dirPath: string): Promise<FileItem[]> {
    const raw = await callGo('ScanDirectory', dirPath);
    return JSON.parse(raw);
  }

  async runConversionPlan(plan: ExecutionPlan): Promise<void> {
    const planJSON = JSON.stringify(plan);
    // Derive thread count from first encode task or default to 4
    const threadCount = deriveThreadCount(plan.tasks);
    return callGo('RunConversionPlan', planJSON, threadCount);
  }

  async cancelRun(_runId: string): Promise<void> {
    return callGo('CancelConversion');
  }

  async loadAppState(): Promise<Partial<AppStateSnapshot>> {
    const raw = await callGo('GetSettings');
    return JSON.parse(raw);
  }

  async saveAppState(snapshot: AppStateSnapshot): Promise<void> {
    return callGo('SaveSettings', JSON.stringify(snapshot));
  }

  async listPresets(): Promise<string[]> {
    return callGo('ListPresets');
  }

  async savePreset(name: string, snapshot: AppStateSnapshot): Promise<void> {
    const preset = {
      output: snapshot.domain.output,
      modify: snapshot.domain.modify,
      app: snapshot.domain.app,
    };
    return callGo('SavePreset', name, JSON.stringify(preset));
  }

  async loadPreset(name: string): Promise<Partial<AppStateSnapshot>> {
    const raw = await callGo('LoadPreset', name);
    const parsed = JSON.parse(raw);
    return {
      domain: {
        output: parsed.output || {},
        modify: parsed.modify || {},
        app: parsed.app || {},
      },
    };
  }

  async deletePreset(name: string): Promise<void> {
    return callGo('DeletePreset', name);
  }

  async showFileInFolder(path: string): Promise<void> {
    return callGo('ShowFileInFolder', path);
  }

  subscribeEvents(handler: (event: DomainEvent) => void): Unsubscribe {
    const unsubs: (() => void)[] = [];
    let active = true;

    void loadRuntime().then((runtime) => {
      if (!active) return;

      unsubs.push(
        runtime.Events.On('conversion:started', () => {
          handler({ type: 'run_started', runId: 'current', totalTasks: 0 });
        })
      );

      unsubs.push(
        runtime.Events.On('conversion:progress', (wailsEvent: any) => {
          const data = wailsEvent?.data || wailsEvent;
          handler({
            type: 'task_progress',
            runId: 'current',
            taskId: '',
            completed: data.completed || 0,
            total: data.total || 0,
            line1: data.line1 || '',
            line2: data.line2 || '',
          });
        })
      );

      unsubs.push(
        runtime.Events.On('conversion:exception', (wailsEvent: any) => {
          const data = wailsEvent?.data || wailsEvent;
          handler({
            type: 'task_failed',
            runId: 'current',
            taskId: '',
            inputPath: data.path || '',
            errorId: data.id || 'C0',
            errorMsg: data.msg || 'Unknown error',
          });
        })
      );

      unsubs.push(
        runtime.Events.On('conversion:finished', () => {
          handler({ type: 'run_finished', runId: 'current', completedCount: 0, failedCount: 0 });
        })
      );

      unsubs.push(
        runtime.Events.On('conversion:canceled', () => {
          handler({ type: 'run_canceled', runId: 'current' });
        })
      );

      unsubs.push(
        runtime.Events.On('files-dropped', (wailsEvent: any) => {
          const data = wailsEvent?.data || wailsEvent;
          const files = Array.isArray(data?.files)
            ? data.files
            : Array.isArray(data?.paths)
              ? data.paths
              : Array.isArray(data)
                ? data
                : [];
          if (files.length > 0) {
            handler({ type: 'files_dropped', paths: files });
          }
        })
      );
    }).catch((error) => {
      console.error('Failed to load Wails runtime:', error);
    });

    return () => {
      active = false;
      unsubs.forEach((fn) => fn());
    };
  }
}

function deriveThreadCount(tasks: ExecutionPlan['tasks']): number {
  for (const task of tasks) {
    if (task.stepType === 'encode') {
      for (let i = 0; i < task.args.length; i++) {
        if (task.args[i] === '--num_threads' || task.args[i] === '-j' || task.args[i] === '--threads') {
          const val = parseInt(task.args[i + 1], 10);
          if (!isNaN(val) && val > 0) return val;
        }
      }
    }
  }
  return 4;
}
