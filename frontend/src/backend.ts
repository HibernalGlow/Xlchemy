import { Dialogs, Events } from '@wailsio/runtime';
import { AppService } from '$lib/utils/bindings';

export interface BackendSettingsPayload {
  output: any;
  modify: any;
  app: any;
}

function imageFilePattern() {
  return '*.jpg;*.jpeg;*.png;*.webp;*.avif;*.jxl;*.gif;*.bmp;*.ico;*.tiff;*.tif;*.apng;*.jp2';
}

export const backend = {
  async getConstants() {
    return JSON.parse(await AppService.GetConstants());
  },

  async getSettings() {
    return JSON.parse(await AppService.GetSettings());
  },

  saveSettings(payload: BackendSettingsPayload) {
    return AppService.SaveSettings(JSON.stringify(payload));
  },

  async selectImageFiles(): Promise<string[]> {
    const selected = await Dialogs.OpenFile({
      CanChooseFiles: true,
      AllowsMultipleSelection: true,
      Title: 'Select image files',
      Filters: [{ DisplayName: 'Images', Pattern: imageFilePattern() }],
    });

    if (!selected || (Array.isArray(selected) && selected.length === 0)) return [];
    return Array.isArray(selected) ? selected : [selected];
  },

  async selectFolder(): Promise<string | null> {
    const selected = await Dialogs.OpenFile({
      CanChooseDirectories: true,
      CanChooseFiles: false,
      Title: 'Select folder',
    });

    return selected ? String(selected) : null;
  },

  async addFiles(paths: string[]) {
    return JSON.parse(await AppService.AddFiles(paths));
  },

  async scanDirectory(path: string) {
    return JSON.parse(await AppService.ScanDirectory(path));
  },

  startConversion(items: any[], output: any, modify: any, app: any, threadCount: number) {
    return AppService.StartConversion(
      JSON.stringify(items),
      JSON.stringify(output),
      JSON.stringify(modify),
      JSON.stringify(app),
      threadCount,
    );
  },

  cancelConversion() {
    return AppService.CancelConversion();
  },

  onProgress(handler: (data: any) => void) {
    return Events.On('conversion:progress', (data: any) => handler(data.data));
  },

  onException(handler: (data: any) => void) {
    return Events.On('conversion:exception', (data: any) => handler(data.data));
  },

  onFinished(handler: () => void) {
    return Events.On('conversion:finished', handler);
  },

  onCanceled(handler: () => void) {
    return Events.On('conversion:canceled', handler);
  },

  onStarted(handler: () => void) {
    return Events.On('conversion:started', handler);
  },

  onFilesDropped(handler: (files: string[]) => void | Promise<void>) {
    return Events.On('files-dropped', (event: any) => {
      const files = event?.data?.files || [];
      if (files.length > 0) handler(files);
    });
  },
};
