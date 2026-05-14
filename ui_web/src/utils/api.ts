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
  getSettings(): Promise<Record<string, unknown>>;
  saveSettings(settings: Record<string, unknown>): Promise<void>;
  addFiles(paths: string[]): Promise<number>;
  removeFiles(indices: number[]): Promise<void>;
  clearFiles(): Promise<void>;
  getFiles(): Promise<Array<{ path: string; anchor_path: string; name: string; size: number; format: string }>>;
  startConversion(outputSettings: Record<string, unknown>, modifySettings: Record<string, unknown>, settingsTabSettings: Record<string, unknown>, threadCount: number): Promise<void>;
  cancelConversion(): Promise<void>;
  checkRequirements(outputSettings: Record<string, unknown>, modifySettings: Record<string, unknown>, settingsTabSettings: Record<string, unknown>): Promise<{ allowed_to_proceed: boolean; display_error: boolean; error_title: string; error_description: string }>;
  openFileDialog(): Promise<string[] | null>;
  openFolderDialog(): Promise<string | null>;
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
