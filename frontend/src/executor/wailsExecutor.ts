import { Dialogs, Events, Call } from '@wailsio/runtime';
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

function callGo(method: string, ...args: any[]): Promise<any> {
  return Call.ByName(`${PKG}.${method}`, ...args);
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
    const selected = await Dialogs.OpenFile({
      CanChooseFiles: true,
      AllowsMultipleSelection: true,
      Title: 'Select image files',
      Filters: [{ DisplayName: 'Images', Pattern: imageFilePattern() }],
    });
    if (!selected) return [];
    return Array.isArray(selected) ? selected : [selected];
  }

  async pickDirectory(): Promise<string | null> {
    const selected = await Dialogs.OpenFile({
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
    const parsed = JSON.parse(raw);
    return {
      domain: {
        output: parsed.output || {},
        modify: parsed.modify || {},
        app: parsed.app || {},
      },
    };
  }

  async saveAppState(snapshot: AppStateSnapshot): Promise<void> {
    const payload = {
      output: snapshot.domain.output,
      modify: snapshot.domain.modify,
      app: snapshot.domain.app,
    };
    return callGo('SaveSettings', JSON.stringify(payload));
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

  subscribeEvents(handler: (event: DomainEvent) => void): Unsubscribe {
    const unsubs: (() => void)[] = [];

    unsubs.push(
      Events.On('conversion:started', () => {
        handler({ type: 'run_started', runId: 'current', totalTasks: 0 });
      })
    );

    unsubs.push(
      Events.On('conversion:progress', (wailsEvent: any) => {
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
      Events.On('conversion:exception', (wailsEvent: any) => {
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
      Events.On('conversion:finished', () => {
        handler({ type: 'run_finished', runId: 'current', completedCount: 0, failedCount: 0 });
      })
    );

    unsubs.push(
      Events.On('conversion:canceled', () => {
        handler({ type: 'run_canceled', runId: 'current' });
      })
    );

    return () => unsubs.forEach((fn) => fn());
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
