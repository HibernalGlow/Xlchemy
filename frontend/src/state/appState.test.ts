import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppStateSnapshot, AppConstants, DomainEvent, ExecutionPlan, FileItem } from '$lib/domain';
import type { BackendExecutor } from '$lib/executor';

const storage = new Map<string, string>();
const styleMap = new Map<string, string>();
const attributeMap = new Map<string, string>();

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
    body: {
      appendChild: vi.fn(),
    },
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
      setAttribute: (key: string, value: string) => {
        attributeMap.set(key, value);
      },
      getAttribute: (key: string) => attributeMap.get(key) ?? null,
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
      layout: {
        laneOrder: ['input', 'settings'],
        laneLabels: { input: 'Input', settings: 'Settings' },
        laneWidths: { settings: 36 },
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
        collapsedLanes: ['settings'],
        hiddenLanes: [],
        hiddenCards: ['about-info'],
      },
      background: {
        mode: 'image',
        imageUrl: 'file:///mock/bg.png',
        opacity: 55,
        blur: 6,
      },
      theme: {
        name: 'Miku',
        mode: 'dark',
        customThemes: [{
          name: 'Custom A',
          description: 'test',
          colors: {
            light: { primary: 'oklch(0.5 0.1 200)' },
            dark: { primary: 'oklch(0.4 0.1 200)' },
          },
        }],
      },
      lang: 'zh',
    };
  }

  async saveAppState(snapshot: AppStateSnapshot): Promise<void> {
    this.savedSnapshots.push(snapshot);
  }

  subscribeEvents(_handler: (event: DomainEvent) => void) {
    return () => {};
  }
}

const mockExecutor = new MockExecutor();

vi.mock('$lib/executor', async () => {
  return {
    getExecutor: () => mockExecutor,
    getExecutorName: () => mockExecutor.name,
  };
});

describe('AppState import/save', async () => {
  let AppStateCtor: typeof import('./app.svelte').AppState;
  let MockedExecutorCtor: typeof MockExecutor;

  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    mockExecutor.savedSnapshots = [];
    ({ AppState: AppStateCtor } = await import('./app.svelte'));
    MockedExecutorCtor = MockExecutor;
  });

  it('does not save before init completes and preserves loaded settings', async () => {
    const state = new AppStateCtor();

    expect(state.isInitialized).toBe(false);
    expect(mockExecutor.savedSnapshots).toHaveLength(0);

    await state.init();

    expect(state.isInitialized).toBe(true);
    expect(state.outputSettings.format).toBe('AVIF');
    expect(state.outputSettings.quality).toBe(72);
    expect(state.singleLaneMode).toBe(true);
    expect(state.activeLaneId).toBe('settings');
    expect(state.collapsedLanes.has('settings')).toBe(true);
    expect(state.backgroundSettings.mode).toBe('image');
    expect(state.backgroundSettings.imageUrl).toBe('file:///mock/bg.png');
    expect(state.currentLang).toBe('zh');
    expect(mockExecutor.savedSnapshots).toHaveLength(0);
  });

  it('imports exported snapshot format and saves immediately', async () => {
    const state = new AppStateCtor();
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
    expect(mockExecutor.savedSnapshots).toHaveLength(1);
    expect(mockExecutor.savedSnapshots[0].domain.output.format).toBe('JPEG');
  });

  it('queues save for layout and background changes after init', async () => {
    const state = new AppStateCtor();
    await state.init();

    state.toggleLaneCollapsed('input');
    state.updateBackground({ opacity: 70 });

    await new Promise((resolve) => setTimeout(resolve, 220));

    expect(mockExecutor.savedSnapshots.length).toBeGreaterThanOrEqual(1);
    const lastSnapshot = mockExecutor.savedSnapshots.at(-1)!;
    expect(lastSnapshot.layout.collapsedLanes).toContain('input');
    expect(lastSnapshot.background.opacity).toBe(70);
  });
});
