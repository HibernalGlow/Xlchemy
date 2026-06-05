import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WailsExecutor } from '../wailsExecutor';
import type { ExecutionPlan, AppStateSnapshot } from '$lib/domain';

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

  it('should round-trip full app snapshot payloads', async () => {
    const snapshot: AppStateSnapshot = {
      domain: {
        output: {
          format: 'JPEG XL',
          quality: 90,
          lossless: false,
          max_compression: false,
          effort: 7,
          intelligent_effort: false,
          jxl_modular: false,
          jxl_verify: true,
          jxl_normalize_enable: false,
          jxl_normalize_when: 'On Fail',
          aom_av1_chroma_subsampling: 'Default',
          jpegli_chroma_subsampling: 'Default',
          jpg_chroma_subsampling: 'Default',
          if_file_exists: 'Replace',
          custom_output_dir: false,
          custom_output_dir_path: '',
          keep_dir_struct: false,
          delete_original: false,
          delete_original_mode: 'To Trash',
          smallest_format_pool: { png: true, webp: true, jxl: true },
          jxl_png_fallback: true,
        },
        modify: {
          downscaling: {
            enabled: false,
            mode: 'Resolution',
            percent: 50,
            width: 1920,
            height: 1080,
            file_size: 500,
            shortest_side: 1080,
            longest_side: 1920,
            megapixels: 2.1,
            resample: 'Default',
          },
          misc: {
            keep_metadata: 'Encoder - Wipe',
            keep_timestamps: false,
          },
        },
        app: {
          theme: 'Miku',
          lane_max_width: 52,
          custom_resampling: false,
          sorting_disabled: false,
          excluded_formats: ['avif'],
          disable_downscaling_startup: false,
          disable_delete_startup: false,
          enable_jxl_effort_10: false,
          disable_progressive_jpegli: false,
          enable_custom_args: false,
          cjxl_args: '',
          avifenc_args: '',
          cjpegli_args: '',
          im_args: '',
          enable_quality_precision_snapping: true,
          jpg_encoder: 'JPEGLI',
          jxl_auto_lossless_jpeg: true,
          ram_optimizer: 'Disabled',
          ram_optimizer_rules: '',
          jxl_lossy_modular: false,
          jxl_int_effort: false,
          play_sound_on_finish: true,
          play_sound_on_finish_vol: 0.5,
          keep_if_larger: false,
          copy_if_larger: false,
          exiftool_args: {},
          avif_encoder: 'AOM AV1',
          avif_bit_depth: 'Auto',
          avif_aom_iq_tune: false,
          processing_order: 'Original',
        },
      },
      layout: {
        laneOrder: ['input', 'settings'],
        laneLabels: { input: 'Input', settings: 'Settings' },
        laneWidths: { input: 24 },
        cardLayout: { input: ['input-files'], settings: ['settings-general'] },
        singleLaneMode: false,
        activeLaneId: 'input',
        progressCardConfig: {
          showCounter: true,
          showSummary: true,
          showEta: true,
          showFormat: true,
          showEncoder: true,
          showRawLines: true,
          showCurrentFile: true,
          showSizeChange: true,
        },
        collapsedLanes: ['settings'],
        hiddenLanes: [],
        hiddenCards: ['about-info'],
      },
      presets: [],
      theme: {
        name: 'Miku',
        mode: 'system',
        customThemes: [],
      },
      background: {
        mode: 'dot-grid',
        imageUrl: '',
        opacity: 40,
        blur: 0,
      },
      lang: 'zh',
      executor: 'wails',
    };

    const mockCall = vi.mocked(Call.ByName);
    mockCall.mockResolvedValueOnce(JSON.stringify(snapshot));

    await expect(executor.loadAppState()).resolves.toEqual(snapshot);

    mockCall.mockResolvedValueOnce(undefined);
    await executor.saveAppState(snapshot);

    expect(mockCall).toHaveBeenNthCalledWith(2, 'main.AppService.SaveSettings', JSON.stringify(snapshot));
  });
});
