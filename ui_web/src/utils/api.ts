import type { AppSettingsPayload, ExceptionItem, InputSettings, ModifySettings, OutputSettings, GeneralSettings } from '~/types';

declare global {
  interface Window {
    pywebview: {
      api: PyWebViewAPI;
    };
    __xlchemy_emit: (event: string, data: unknown) => void;
    __xlchemy_listeners: Map<string, Set<(data: unknown) => void>>;
  }
}

export interface PyWebViewAPI {
  getVersion(): Promise<string>;
  getSettings(): Promise<AppSettingsPayload>;
  saveSettings(payload: { input: InputSettings; output: OutputSettings; modify: ModifySettings; settings: GeneralSettings }): Promise<void>;
  addFiles(paths: string[], excludedFormats?: string[]): Promise<number>;
  removeFiles(indices: number[]): Promise<void>;
  clearFiles(): Promise<void>;
  getFiles(): Promise<Array<{ path: string; anchor_path: string; name: string; size: number; format: string }>>;
  startConversion(outputSettings: OutputSettings, modifySettings: ModifySettings, settingsTabSettings: GeneralSettings, threadCount: number): Promise<void>;
  cancelConversion(): Promise<void>;
  checkRequirements(outputSettings: OutputSettings, modifySettings: ModifySettings, settingsTabSettings: GeneralSettings): Promise<{ allowed_to_proceed: boolean; display_error: boolean; error_title: string; error_description: string }>;
  openFileDialog(): Promise<string[] | null>;
  openFolderDialog(): Promise<string | null>;
  checkForUpdates(): Promise<{ ok: boolean; is_newer?: boolean; latest_version?: string; download_url?: string; message?: string; message_url?: string; error?: string }>;
  toggleLogging(): Promise<{ enabled: boolean }>;
  openLogsDir(): Promise<{ ok: boolean; message?: string }>;
  wipeLogsDir(): Promise<{ ok: boolean; message: string }>;
  saveExceptions(items: ExceptionItem[]): Promise<{ ok: boolean; message?: string }>;
  openPath(path: string): Promise<{ ok: boolean; message?: string }>;
}

export function getAPI(): PyWebViewAPI | null {
  if (typeof window !== 'undefined' && window.pywebview) {
    return window.pywebview.api;
  }
  return null;
}

export function isPyWebView(): boolean {
  return typeof window !== 'undefined' && !!window.pywebview;
}

export function initEventBridge() {
  if (typeof window === 'undefined') return;

  window.__xlchemy_listeners = new Map();

  window.__xlchemy_emit = (event: string, data: unknown) => {
    const listeners = window.__xlchemy_listeners.get(event);
    if (listeners) {
      listeners.forEach((cb) => cb(data));
    }
  };
}

export function onEvent(event: string, callback: (data: unknown) => void) {
  if (typeof window === 'undefined') return () => {};

  if (!window.__xlchemy_listeners) {
    window.__xlchemy_listeners = new Map();
  }

  if (!window.__xlchemy_listeners.has(event)) {
    window.__xlchemy_listeners.set(event, new Set());
  }

  window.__xlchemy_listeners.get(event)!.add(callback);

  return () => {
    window.__xlchemy_listeners.get(event)?.delete(callback);
  };
}
