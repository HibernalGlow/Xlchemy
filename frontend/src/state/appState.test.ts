import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppStateSnapshot, AppConstants, DomainEvent, ExecutionPlan, FileItem } from '$lib/domain';
import type { BackendExecutor } from '$lib/executor';

const storage = new Map<string, string>();
const styleMap = new Map<string, string>();

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, String(value));
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
  },
  configurable: true,
});

Object.defineProperty(globalThis, 'document', {
  value: {
    documentElement: {
      style: {
        setProperty: (key: string, value: string) => {
          styleMap.set(key, value);
        },
        removeProperty: (key: string) => {
          styleMap.delete(key);
        },
      },
      dataset: {},
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        toggle: vi.fn(),
      },
    },
  },
  configurable: true,
});

Object.defineProperty(globalThis, 'window', {
  value: {
    matchMedia: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  },
  configurable: true,
});

class MockExecutor implements BackendExecutor {
  readonly name = 'mock';
  savedSnapshots: AppStateSnapshot[] = [];

  async getConstants(): Promise<AppConstants> {
    return {
      version: 'test',
      allowedInput: ['png', 'jpg'],
      allowedResampling: [],
      allowedInputFilters: [],
      jpegAliases: ['jpg', 'jpeg'],
      cpuCount: 8,
      updateCheckerEnabled: false,
    };
  }

  async pickFiles(): Promise<string[]> {
    return [];
  }

  async pickDirectory(): Promise<string | null> {
    return null;
  }

  async statFiles(_paths: string[]): Promise<FileItem[]> {
    return [];
  }

  async scanDirectory(_dirPath: string): Promise<FileItem[]> {
    return [];
  }

  async runConversionPlan(_plan: ExecutionPlan): Promise<void> {}

  async cancelRun(_runId: string): Promise<void> {}

  async loadAppState(): Promise<Partial<AppStateSnapshot>> {
    return {
      domain: {
        output: { format: 'AVIF', quality: 72 },
        modify: { misc: { keep_metadata: 'ExifTool - Preserve' } },
        app: { theme: 'Miku', lane_max_width: 52 },
      } as any,
    };
  }

  async saveAppState(snapshot: AppStateSnapshot): Promise<void> {
    this.savedSnapshots.push(snapshot);
  }

  subscribeEvents(_handler: (event: DomainEvent) => void) {
    return () => {};
  }
}

vi.mock('$lib/executor', async () => {
  const executor = new MockExecutor();
  return {
    getExecutor: () => executor,
  };
});

describe('AppState import/save', async () => {
  let AppStateCtor: typeof import('./app.svelte').AppState;
  let MockedExecutorCtor: typeof MockExecutor;

  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    ({ AppState: AppStateCtor } = await import('./app.svelte'));
    MockedExecutorCtor = MockExecutor;
  });

  it('does not save before init completes and preserves loaded settings', async () => {
    const state = new AppStateCtor();
    const executor = (state as any).executor as MockExecutor;

    expect(state.isInitialized).toBe(false);
    expect(executor.savedSnapshots).toHaveLength(0);

    await state.init();

    expect(state.isInitialized).toBe(true);
    expect(state.outputSettings.format).toBe('AVIF');
    expect(state.outputSettings.quality).toBe(72);
    expect(executor.savedSnapshots).toHaveLength(0);
  });

  it('imports exported snapshot format and saves immediately', async () => {
    const state = new AppStateCtor();
    const executor = (state as any).executor as MockExecutor;
    await state.init();

    state.importSettingsJson = JSON.stringify({
      domain: {
        output: { format: 'JPEG', quality: 88, lossless: false },
        modify: {
          downscaling: { enabled: true, mode: 'Percent', percent: 60 },
          misc: { keep_metadata: 'Encoder - Wipe', keep_timestamps: true },
        },
        app: { theme: 'Ocean', lane_max_width: 60, processing_order: 'Name' },
      },
      layout: {
        laneOrder: ['input', 'settings'],
        laneLabels: { input: 'Input', settings: 'Settings' },
        laneWidths: { input: 30, settings: 32 },
        cardLayout: { input: ['input-files'], settings: ['settings-general'] },
        singleLaneMode: true,
        activeLaneId: 'settings',
        progressCardConfig: {
          showCounter: true,
          showSummary: true,
          showEta: false,
          showFormat: true,
          showEncoder: false,
          showRawLines: false,
          showCurrentFile: true,
          showSizeChange: true,
        },
      },
    });

    await state.handleImportSettings();

    expect(state.outputSettings.format).toBe('JPEG');
    expect(state.outputSettings.quality).toBe(88);
    expect(state.modifySettings.downscaling.enabled).toBe(true);
    expect(state.appSettings.theme).toBe('Ocean');
    expect(state.singleLaneMode).toBe(true);
    expect(state.activeLaneId).toBe('settings');
    expect(executor.savedSnapshots).toHaveLength(1);
    expect(executor.savedSnapshots[0].domain.output.format).toBe('JPEG');
  });
});
