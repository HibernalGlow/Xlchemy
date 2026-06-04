import { getCurrentLanguage, setLanguage } from '$lib/i18n';
import { backend } from '$lib/backend';
import { applyThemeColors, getThemeMode, loadThemeName, setThemeMode, watchSystemTheme } from '$lib/utils/themes';

const DEFAULT_EXCLUDED_FORMATS = ['avif', 'jxl', 'webp', 'gif'];
export const DEFAULT_LANE_ORDER = ['input', 'output', 'modify', 'settings', 'about'];
const DEFAULT_LANE_WIDTH = 18;

function loadLaneOrder(): string[] {
  try {
    const v = localStorage.getItem('xlchemy-lane-order');
    if (v) {
      const arr = JSON.parse(v);
      if (Array.isArray(arr)) return arr;
    }
  } catch {}
  return DEFAULT_LANE_ORDER;
}

function loadCollapsedLanes(): Set<string> {
  try {
    const v = localStorage.getItem('xlchemy-collapsed-lanes');
    if (v) {
      const arr = JSON.parse(v);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set<string>();
}

function loadLaneWidth(): number {
  try {
    const v = localStorage.getItem('xlchemy-lane-width');
    if (v) {
      const n = Number(v);
      if (n > 0) return n;
    }
  } catch {}
  return DEFAULT_LANE_WIDTH;
}

export class AppState {
  laneOrder = $state<string[]>(loadLaneOrder());
  collapsedLanes = $state<Set<string>>(loadCollapsedLanes());
  laneWidth = $state<number>(loadLaneWidth());

  fileItems = $state<any[]>([]);
  outputSettings = $state<any>({});
  modifySettings = $state<any>({});
  appSettings = $state<any>({});
  constants = $state<any>({});
  cpuCount = $state<number>(4);

  isConverting = $state<boolean>(false);
  progress = $state({ completed: 0, total: 0, line1: '', line2: '' });
  exceptions = $state<any[]>([]);
  showExceptions = $state<boolean>(false);

  excludedFormats = $state<Set<string>>(new Set(DEFAULT_EXCLUDED_FORMATS));

  showImportDialog = $state<boolean>(false);
  importSettingsJson = $state<string>('');
  currentLang = $state<string>(getCurrentLanguage());

  setLaneOrder(order: string[]) {
    this.laneOrder = order;
    localStorage.setItem('xlchemy-lane-order', JSON.stringify(order));
  }

  toggleLaneCollapsed(id: string) {
    const next = new Set(this.collapsedLanes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.collapsedLanes = next;
    localStorage.setItem('xlchemy-collapsed-lanes', JSON.stringify(Array.from(next)));
  }

  setLaneWidth(width: number) {
    this.laneWidth = width;
    localStorage.setItem('xlchemy-lane-width', String(width));
  }

  allowedInput(): string[] {
    const list = Array.isArray(this.constants.allowedInput) ? this.constants.allowedInput : [];
    return Array.from(new Set(list.map((v: any) => String(v).toLowerCase())));
  }

  processingOrder(): string {
    return this.appSettings.processing_order || 'Original';
  }

  sortingDisabled(): boolean {
    return !!this.appSettings.sorting_disabled;
  }

  sortedItems() {
    const items = [...this.fileItems];
    if (this.sortingDisabled()) return items;

    const compareText = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });

    switch (this.processingOrder()) {
      case 'Path Ascending':
        items.sort((a, b) => compareText(String(a.absPath || ''), String(b.absPath || '')));
        break;
      case 'Path Descending':
        items.sort((a, b) => compareText(String(b.absPath || ''), String(a.absPath || '')));
        break;
      case 'Size Ascending':
        items.sort((a, b) => Number(a.size || 0) - Number(b.size || 0));
        break;
      case 'Size Descending':
        items.sort((a, b) => Number(b.size || 0) - Number(a.size || 0));
        break;
      case 'Sequential':
        items.sort((a, b) => {
          const dirCmp = compareText(String(a.dir || ''), String(b.dir || ''));
          if (dirCmp !== 0) return dirCmp;
          return compareText(String(a.name || ''), String(b.name || ''));
        });
        break;
      case 'Random':
        for (let i = items.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [items[i], items[j]] = [items[j], items[i]];
        }
        break;
      default:
        break;
    }

    return items;
  }

  addFileItems(incoming: any[]) {
    if (!Array.isArray(incoming) || incoming.length === 0) return;
    const seen = new Set(this.fileItems.map((item) => item.absPath));
    const next = [...this.fileItems];
    for (const item of incoming) {
      const ext = String(item.ext || '').toLowerCase();
      const absPath = item.absPath;
      if (!absPath || this.excludedFormats.has(ext) || seen.has(absPath)) continue;
      seen.add(absPath);
      next.push(item);
    }
    this.fileItems = next;
  }

  toggleExcludedFormat(ext: string) {
    const next = new Set(this.excludedFormats);
    if (next.has(ext)) next.delete(ext);
    else next.add(ext);
    this.excludedFormats = next;
    this.appSettings = { ...this.appSettings, excluded_formats: Array.from(next) };
  }

  async handleAddFiles() {
    try {
      const selected = await backend.selectImageFiles();
      if (selected.length === 0) return;
      const result = await backend.addFiles(selected);
      this.addFileItems(JSON.parse(result));
    } catch (e) {
      console.error('AddFiles error:', e);
    }
  }

  async handleAddFolder() {
    try {
      const selected = await backend.selectFolder();
      if (!selected) return;
      const result = await backend.scanDirectory(selected);
      this.addFileItems(JSON.parse(result));
    } catch (e) {
      console.error('AddFolder error:', e);
    }
  }

  async handleDrop(e: DragEvent) {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files) return;
    const paths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i] as any;
      if (file.path) paths.push(file.path);
    }
    if (paths.length > 0) {
      const result = await backend.addFiles(paths);
      this.addFileItems(JSON.parse(result));
    }
  }

  clearFiles() {
    this.fileItems = [];
  }

  async startConversion() {
    if (this.fileItems.length === 0) return;
    this.isConverting = true;
    try {
      await backend.startConversion(
        this.fileItems,
        this.outputSettings,
        this.modifySettings,
        this.appSettings,
        this.outputSettings.threads || this.cpuCount,
      );
    } catch (e) {
      console.error('Conversion error:', e);
      this.isConverting = false;
    }
  }

  async cancelConversion() {
    await backend.cancelConversion();
  }

  clearExceptions() {
    this.exceptions = [];
    this.showExceptions = false;
  }

  updateOutput(key: string, value: any) {
    this.outputSettings = { ...this.outputSettings, [key]: value };
  }

  updateModify(path: string[], value: any) {
    const next = JSON.parse(JSON.stringify(this.modifySettings || {}));
    let obj = next;
    for (let i = 0; i < path.length - 1; i++) {
      if (!obj[path[i]] || typeof obj[path[i]] !== 'object') obj[path[i]] = {};
      obj = obj[path[i]];
    }
    obj[path[path.length - 1]] = value;
    this.modifySettings = next;
  }

  updateApp(key: string, value: any) {
    this.appSettings = { ...this.appSettings, [key]: value };
  }

  changeTheme(name: string) {
    this.appSettings = { ...this.appSettings, theme: name };
    applyThemeColors(getThemeMode(), name);
  }

  changeThemeMode(mode: 'light' | 'dark' | 'system') {
    setThemeMode(mode);
    applyThemeColors(mode, this.appSettings.theme || loadThemeName());
  }

  changeLanguage(lang: string) {
    setLanguage(lang);
    this.currentLang = lang;
  }

  handleImportSettings() {
    try {
      const data = JSON.parse(this.importSettingsJson);
      if (data.output) this.outputSettings = data.output;
      if (data.modify) this.modifySettings = data.modify;
      if (data.app) this.appSettings = data.app;
      this.importSettingsJson = '';
      this.showImportDialog = false;
    } catch (e) {
      console.error('Import failed:', e);
    }
  }

  handleExportSettings() {
    const data = JSON.stringify({ output: this.outputSettings, modify: this.modifySettings, app: this.appSettings }, null, 2);
    navigator.clipboard.writeText(data);
  }

  async init() {
    try {
      const c = await backend.getConstants();
      this.constants = c;
      this.cpuCount = c.cpuCount || 4;

      const settings = await backend.getSettings();
      this.outputSettings = settings.output || {};

      const metadataMap: Record<string, string> = {
        'Encoder - 清除': 'Encoder - Wipe',
        'Encoder - 保留': 'Encoder - Preserve',
        'ExifTool - 清除': 'ExifTool - Wipe',
        'ExifTool - 保留': 'ExifTool - Preserve',
        'ExifTool - 不安全清除': 'ExifTool - Unsafe Wipe',
        'ExifTool - 自定义': 'ExifTool - Custom',
      };
      if (settings.modify?.misc?.keep_metadata) {
        const mapped = metadataMap[settings.modify.misc.keep_metadata];
        if (mapped) settings.modify.misc.keep_metadata = mapped;
      }

      this.modifySettings = settings.modify || {};
      this.appSettings = settings.app || {};
      this.currentLang = getCurrentLanguage();

      const themeName = settings.app?.theme || loadThemeName();
      applyThemeColors(getThemeMode(), themeName);

      if (Array.isArray(this.appSettings.excluded_formats)) {
        this.excludedFormats = new Set(this.appSettings.excluded_formats.map((v: any) => String(v).toLowerCase()));
      } else {
        this.excludedFormats = new Set(DEFAULT_EXCLUDED_FORMATS);
        this.appSettings = { ...this.appSettings, excluded_formats: Array.from(this.excludedFormats) };
      }
    } catch (e) {
      console.error('Init error:', e);
    }
  }

  watchTheme() {
    return watchSystemTheme(() => {
      const themeName = this.appSettings.theme || loadThemeName();
      applyThemeColors(getThemeMode(), themeName);
    });
  }
}

export const appState = new AppState();
