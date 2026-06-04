import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WailsExecutor } from '../wailsExecutor';
import type { ExecutionPlan, DomainEvent } from '$lib/domain';

// Mock @wailsio/runtime
vi.mock('@wailsio/runtime', () => ({
  Dialogs: {
    OpenFile: vi.fn(),
  },
  Events: {
    On: vi.fn(() => () => {}),
  },
  Call: {
    ByName: vi.fn(),
  },
}));

import { Call, Events } from '@wailsio/runtime';

describe('WailsExecutor', () => {
  let executor: WailsExecutor;

  beforeEach(() => {
    executor = new WailsExecutor();
    vi.clearAllMocks();
  });

  it('should call RunConversionPlan with JSON plan', async () => {
    const mockCall = vi.mocked(Call.ByName).mockResolvedValue(undefined);

    const plan: ExecutionPlan = {
      runId: 'test-run',
      items: [{
        absPath: '/test/image.jpg',
        name: 'image',
        ext: 'jpg',
        dir: '/test',
        size: 1024,
      }],
      tasks: [{
        id: 'enc-1',
        inputPath: '/test/image.jpg',
        outputPath: '/test/image.jxl',
        command: 'cjxl',
        args: ['-q', '80', '-e', '7', '--num_threads', '4', '/test/image.jpg', '/test/image.jxl'],
        stepType: 'encode',
      }],
      policies: {
        keepIfLarger: false,
        copyIfLarger: false,
        deleteOriginal: false,
        deleteOriginalMode: 'To Trash',
        keepTimestamps: false,
        ifFileExists: 'Replace',
      },
      toolchain: {
        cjxlPath: 'cjxl',
        djxlPath: 'djxl',
        avifencPath: 'avifenc',
        avifdecPath: 'avifdec',
        cjpegliPath: 'cjpegli',
        imagemagickPath: 'magick',
        exiftoolPath: 'exiftool',
        oxipngPath: 'oxipng',
      },
    };

    await executor.runConversionPlan(plan);

    expect(mockCall).toHaveBeenCalledWith(
      'main.AppService.RunConversionPlan',
      JSON.stringify(plan),
      4
    );
  });

  it('should derive thread count from encode task args', async () => {
    const mockCall = vi.mocked(Call.ByName).mockResolvedValue(undefined);

    const plan: ExecutionPlan = {
      runId: 'test-run',
      items: [],
      tasks: [{
        id: 'enc-1',
        inputPath: '/test/image.jpg',
        outputPath: '/test/image.jxl',
        command: 'cjxl',
        args: ['-q', '80', '--num_threads', '8', '/test/image.jpg', '/test/image.jxl'],
        stepType: 'encode',
      }],
      policies: {
        keepIfLarger: false,
        copyIfLarger: false,
        deleteOriginal: false,
        deleteOriginalMode: 'To Trash',
        keepTimestamps: false,
        ifFileExists: 'Replace',
      },
      toolchain: {
        cjxlPath: 'cjxl',
        djxlPath: 'djxl',
        avifencPath: 'avifenc',
        avifdecPath: 'avifdec',
        cjpegliPath: 'cjpegli',
        imagemagickPath: 'magick',
        exiftoolPath: 'exiftool',
        oxipngPath: 'oxipng',
      },
    };

    await executor.runConversionPlan(plan);

    expect(mockCall).toHaveBeenCalledWith(
      'main.AppService.RunConversionPlan',
      expect.any(String),
      8
    );
  });

  it('should translate Wails events to DomainEvents', () => {
    const handler = vi.fn();
    const mockOn = vi.mocked(Events.On);

    executor.subscribeEvents(handler);

    // Simulate progress event
    const progressCallback = mockOn.mock.calls.find(
      (call: any[]) => call[0] === 'conversion:progress'
    )?.[1];

    expect(progressCallback).toBeDefined();

    progressCallback!({ name: 'conversion:progress', data: { completed: 5, total: 10, line1: 'test', line2: 'eta' } });

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      type: 'task_progress',
      runId: 'current',
      completed: 5,
      total: 10,
      line1: 'test',
      line2: 'eta',
    }));
  });
});
