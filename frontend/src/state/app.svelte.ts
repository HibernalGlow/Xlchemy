import { getCurrentLanguage, setLanguage } from '$lib/i18n';
import { getExecutor } from '$lib/executor';
import type { BackendExecutor } from '$lib/executor';
import {
  cloneCardLayout,
  DEFAULT_CARD_LAYOUT,
  DEFAULT_PROGRESS_CARD_CONFIG,
  type CardId,
  type CardLayout,
  type LaneId,
  type ProgressCardConfig,
} from '$lib/cards/definitions';
import { applyThemeColors, getThemeMode, loadThemeName, setThemeMode, watchSystemTheme } from '$lib/utils/themes';
import {
  type FileItem,
  type OutputSettings,
  type ModifySettings,
  type AppSettings,
  type AppStateSnapshot,
  type AppConstants,
  type ToolchainSelection,
  type DomainEvent,
  normalizeOutputSettings,
  normalizeModifySettings,
  normalizeAppSettings,
  createDefaultSnapshot,
} from '$lib/domain';
import {
  sortItems,
  mergeFileItems,
  buildExecutionPlan,
} from '$lib/orchestrator';

const DEFAULT_EXCLUDED_FORMATS = ['avif', 'jxl', 'webp', 'gif'];

function sanitizeLaneId(value: string): LaneId {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || `lane-${Date.now()}`;
}

function loadLaneOrder(): string[] {
  try {
    const v = localStorage.getItem('xlchemy-lane-order');
    if (v) {
      const arr = JSON.parse(v);
      if (Array.isArray(arr)) return arr;
    }
  } catch {}
  return createDefaultSnapshot().layout.laneOrder;
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

function loadLaneWidths(): Record<string, number> {
  try {
    const raw = localStorage.getItem('xlchemy-lane-widths');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function loadLaneLabels(): Record<string, string> {
  try {
    const raw = localStorage.getItem('xlchemy-lane-labels');
    if (!raw) return { ...createDefaultSnapshot().layout.laneLabels };
    return { ...createDefaultSnapshot().layout.laneLabels, ...JSON.parse(raw) };
  } catch {
    return { ...createDefaultSnapshot().layout.laneLabels };
  }
}

function loadCardLayout(): CardLayout {
  try {
    const raw = localStorage.getItem('xlchemy-card-layout');
    if (!raw) return cloneCardLayout(DEFAULT_CARD_LAYOUT);
    const parsed = JSON.parse(raw);
    const next: CardLayout = cloneCardLayout(DEFAULT_CARD_LAYOUT);
    if (parsed && typeof parsed === 'object') {
      for (const [laneId, cards] of Object.entries(parsed)) {
        next[laneId] = Array.isArray(cards) ? (cards as CardId[]).filter(Boolean) : [];
      }
    }
    return next;
  } catch {
    return cloneCardLayout(DEFAULT_CARD_LAYOUT);
  }
}

function loadSingleLaneMode(): boolean {
  try {
    return localStorage.getItem('xlchemy-single-lane-mode') === 'true';
  } catch {
    return false;
  }
}

function loadActiveLaneId(): LaneId {
  try {
    const value = localStorage.getItem('xlchemy-active-lane-id') as LaneId | null;
    if (value && createDefaultSnapshot().layout.laneOrder.includes(value)) return value;
  } catch {}
  return 'input';
}

function loadProgressCardConfig(): ProgressCardConfig {
  try {
    const raw = localStorage.getItem('xlchemy-progress-card-config');
    if (!raw) return { ...DEFAULT_PROGRESS_CARD_CONFIG };
    return { ...DEFAULT_PROGRESS_CARD_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PROGRESS_CARD_CONFIG };
  }
}

function loadHiddenLanes(): Set<string> {
  try {
    const v = localStorage.getItem('xlchemy-hidden-lanes');
    if (v) {
      const arr = JSON.parse(v);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set<string>();
}

export class AppState {
  // Layout state
  laneOrder = $state<string[]>(loadLaneOrder());
  collapsedLanes = $state<Set<string>>(loadCollapsedLanes());
  laneWidths = $state<Record<string, number>>(loadLaneWidths());
  laneLabels = $state<Record<string, string>>(loadLaneLabels());
  cardLayout = $state<CardLayout>(loadCardLayout());
  singleLaneMode = $state<boolean>(loadSingleLaneMode());
  activeLaneId = $state<LaneId>(loadActiveLaneId());
  progressCardConfig = $state<ProgressCardConfig>(loadProgressCardConfig());
  hiddenLanes = $state<Set<string>>(loadHiddenLanes());

  // Domain state
  fileItems = $state<FileItem[]>([]);
  outputSettings = $state<OutputSettings>(normalizeOutputSettings({}));
  modifySettings = $state<ModifySettings>(normalizeModifySettings({}));
  appSettings = $state<AppSettings>(normalizeAppSettings({}));

  // Runtime state
  constants = $state<AppConstants>({
    version: '',
    allowedInput: [],
    allowedResampling: [],
    allowedInputFilters: [],
    jpegAliases: [],
    cpuCount: 4,
    updateCheckerEnabled: false,
  });
  cpuCount = $state<number>(4);

  isConverting = $state<boolean>(false);
  progress = $state({ completed: 0, total: 0, line1: '', line2: '' });
  exceptions = $state<{ id: string; msg: string; path: string }[]>([]);
  showExceptions = $state<boolean>(false);

  excludedFormats = $state<Set<string>>(new Set(DEFAULT_EXCLUDED_FORMATS));

  showImportDialog = $state<boolean>(false);
  importSettingsJson = $state<string>('');
  currentLang = $state<string>(getCurrentLanguage());

  private executor: BackendExecutor = getExecutor();

  // Computed
  get sortedItems(): FileItem[] {
    return sortItems(
      this.fileItems,
      this.appSettings.processing_order || 'Original',
      !!this.appSettings.sorting_disabled
    );
  }

  get allowedInputList(): string[] {
    const list = Array.isArray(this.constants.allowedInput)
      ? this.constants.allowedInput
      : [];
    return Array.from(new Set(list.map((v: any) => String(v).toLowerCase())));
  }

  // Layout actions
  setLaneOrder(order: string[]) {
    this.laneOrder = order;
    localStorage.setItem('xlchemy-lane-order', JSON.stringify(order));
  }

  laneTitle(laneId: LaneId): string {
    return this.laneLabels[laneId] || createDefaultSnapshot().layout.laneLabels[laneId] || laneId;
  }

  createLane(name = 'New Lane') {
    let base = sanitizeLaneId(name);
    let id = base;
    let i = 2;
    while (this.laneOrder.includes(id)) id = `${base}-${i++}`;
    this.laneOrder = [...this.laneOrder, id];
    this.laneLabels = { ...this.laneLabels, [id]: name.trim() || 'New Lane' };
    this.cardLayout = { ...this.cardLayout, [id]: [] };
    this.laneWidths = { ...this.laneWidths, [id]: createDefaultSnapshot().layout.laneWidths[id] || 18 };
    localStorage.setItem('xlchemy-lane-order', JSON.stringify(this.laneOrder));
    localStorage.setItem('xlchemy-lane-labels', JSON.stringify(this.laneLabels));
    localStorage.setItem('xlchemy-lane-widths', JSON.stringify(this.laneWidths));
    localStorage.setItem('xlchemy-card-layout', JSON.stringify(this.cardLayout));
    this.activeLaneId = id;
  }

  renameLane(laneId: LaneId, name: string) {
    const nextName = name.trim();
    if (!nextName) return;
    this.laneLabels = { ...this.laneLabels, [laneId]: nextName };
    localStorage.setItem('xlchemy-lane-labels', JSON.stringify(this.laneLabels));
  }

  deleteLane(laneId: LaneId) {
    const defaultOrder = createDefaultSnapshot().layout.laneOrder;
    if (defaultOrder.includes(laneId)) return;
    const cards = this.cardLayout[laneId] || [];
    const nextLayout: CardLayout = { ...this.cardLayout };
    delete nextLayout[laneId];
    nextLayout.input = [...(nextLayout.input || []), ...cards];
    const { [laneId]: _removed, ...nextLabels } = this.laneLabels;
    const { [laneId]: _removedWidth, ...nextWidths } = this.laneWidths;
    this.cardLayout = nextLayout;
    this.laneLabels = nextLabels;
    this.laneWidths = nextWidths;
    this.laneOrder = this.laneOrder.filter((id) => id !== laneId);
    if (this.activeLaneId === laneId) this.activeLaneId = 'input';
    localStorage.setItem('xlchemy-lane-order', JSON.stringify(this.laneOrder));
    localStorage.setItem('xlchemy-lane-labels', JSON.stringify(this.laneLabels));
    localStorage.setItem('xlchemy-lane-widths', JSON.stringify(this.laneWidths));
    localStorage.setItem('xlchemy-card-layout', JSON.stringify(this.cardLayout));
  }

  exportLayoutSettings() {
    return {
      laneOrder: this.laneOrder,
      laneLabels: this.laneLabels,
      laneWidths: this.laneWidths,
      cardLayout: this.cardLayout,
      singleLaneMode: this.singleLaneMode,
      activeLaneId: this.activeLaneId,
      progressCardConfig: this.progressCardConfig,
      hiddenLanes: Array.from(this.hiddenLanes),
    };
  }

  importLayoutSettings(layout: any) {
    if (!layout || typeof layout !== 'object') return;
    if (Array.isArray(layout.laneOrder)) this.laneOrder = layout.laneOrder;
    if (layout.laneLabels && typeof layout.laneLabels === 'object') {
      this.laneLabels = { ...createDefaultSnapshot().layout.laneLabels, ...layout.laneLabels };
    }
    if (layout.laneWidths && typeof layout.laneWidths === 'object') this.laneWidths = layout.laneWidths;
    if (layout.cardLayout && typeof layout.cardLayout === 'object') this.cardLayout = layout.cardLayout;
    if (typeof layout.singleLaneMode === 'boolean') this.singleLaneMode = layout.singleLaneMode;
    if (layout.activeLaneId) this.activeLaneId = layout.activeLaneId;
    if (layout.progressCardConfig && typeof layout.progressCardConfig === 'object') {
      this.progressCardConfig = { ...this.progressCardConfig, ...layout.progressCardConfig };
    }
    if (Array.isArray(layout.hiddenLanes)) {
      this.hiddenLanes = new Set(layout.hiddenLanes);
    }
    localStorage.setItem('xlchemy-lane-order', JSON.stringify(this.laneOrder));
    localStorage.setItem('xlchemy-lane-labels', JSON.stringify(this.laneLabels));
    localStorage.setItem('xlchemy-lane-widths', JSON.stringify(this.laneWidths));
    localStorage.setItem('xlchemy-card-layout', JSON.stringify(this.cardLayout));
    localStorage.setItem('xlchemy-single-lane-mode', String(this.singleLaneMode));
    localStorage.setItem('xlchemy-active-lane-id', this.activeLaneId);
    localStorage.setItem('xlchemy-progress-card-config', JSON.stringify(this.progressCardConfig));
    localStorage.setItem('xlchemy-hidden-lanes', JSON.stringify(Array.from(this.hiddenLanes)));
  }

  toggleLaneCollapsed(id: string) {
    const next = new Set(this.collapsedLanes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.collapsedLanes = next;
    localStorage.setItem('xlchemy-collapsed-lanes', JSON.stringify(Array.from(next)));
  }

  toggleLaneHidden(id: string) {
    const next = new Set(this.hiddenLanes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.hiddenLanes = next;
    localStorage.setItem('xlchemy-hidden-lanes', JSON.stringify(Array.from(next)));
  }

  showAllLanes() {
    this.hiddenLanes = new Set<string>();
    localStorage.setItem('xlchemy-hidden-lanes', JSON.stringify([]));
  }

  laneWidth(laneId: LaneId): number {
    return this.laneWidths[laneId] || createDefaultSnapshot().layout.laneWidths[laneId] || 18;
  }

  setLaneWidth(laneId: LaneId, width: number) {
    const next = { ...this.laneWidths, [laneId]: width };
    this.laneWidths = next;
    localStorage.setItem('xlchemy-lane-widths', JSON.stringify(next));
  }

  setSingleLaneMode(enabled: boolean) {
    this.singleLaneMode = enabled;
    localStorage.setItem('xlchemy-single-lane-mode', String(enabled));
  }

  setActiveLaneId(laneId: LaneId) {
    this.activeLaneId = laneId;
    localStorage.setItem('xlchemy-active-lane-id', laneId);
  }

  cardsForLane(laneId: LaneId): CardId[] {
    return this.cardLayout[laneId] || [];
  }

  moveCard(cardId: CardId, fromLaneId: LaneId, toLaneId: LaneId, targetCardId?: CardId | null) {
    const next = cloneCardLayout(this.cardLayout);
    next[fromLaneId] = next[fromLaneId].filter((id) => id !== cardId);
    const destination = next[toLaneId].filter((id) => id !== cardId);
    const insertAfter = targetCardId?.endsWith('::after') ?? false;
    const rawTargetId = (targetCardId?.replace(/::after$/, '') ?? null) as CardId | null;
    if (rawTargetId && destination.includes(rawTargetId)) {
      const targetIndex = destination.indexOf(rawTargetId);
      destination.splice(targetIndex + (insertAfter ? 1 : 0), 0, cardId);
    } else {
      destination.push(cardId);
    }
    next[toLaneId] = destination;
    this.cardLayout = next;
    localStorage.setItem('xlchemy-card-layout', JSON.stringify(next));
  }

  reorderCardWithinLane(laneId: LaneId, fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    const next = cloneCardLayout(this.cardLayout);
    const list = [...next[laneId]];
    const [item] = list.splice(fromIndex, 1);
    if (!item) return;
    list.splice(toIndex, 0, item);
    next[laneId] = list;
    this.cardLayout = next;
    localStorage.setItem('xlchemy-card-layout', JSON.stringify(next));
  }

  updateProgressCardConfig(key: keyof ProgressCardConfig, value: boolean) {
    this.progressCardConfig = { ...this.progressCardConfig, [key]: value };
    localStorage.setItem('xlchemy-progress-card-config', JSON.stringify(this.progressCardConfig));
  }

  // Progress display helpers
  progressCurrentFile() {
    const line = this.progress.line1 || '';
    const idx = line.indexOf(' : ');
    return idx >= 0 ? line.slice(0, idx) : '';
  }

  progressSizeChange() {
    const line = this.progress.line1 || '';
    const idx = line.indexOf(' : ');
    return idx >= 0 ? line.slice(idx + 3) : '';
  }

  progressSummary() {
    const lines = [] as string[];
    if (this.progressCardConfig.showCounter) {
      lines.push(`${this.progress.completed}/${this.progress.total}`);
    }
    if (this.progressCardConfig.showFormat && this.outputSettings.format) {
      lines.push(this.outputSettings.format);
    }
    if (this.progressCardConfig.showEncoder) {
      if (this.outputSettings.format === 'AVIF' && this.appSettings.avif_encoder) {
        lines.push(this.appSettings.avif_encoder);
      } else if (this.outputSettings.format === 'JPEG' && this.appSettings.jpg_encoder) {
        lines.push(this.appSettings.jpg_encoder);
      }
    }
    return lines.join(' · ');
  }

  // Domain actions
  addFileItems(incoming: any[]) {
    if (!Array.isArray(incoming) || incoming.length === 0) return;
    this.fileItems = mergeFileItems(
      this.fileItems,
      incoming,
      this.excludedFormats
    );
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
      const selected = await this.executor.pickFiles();
      if (selected.length === 0) return;
      const result = await this.executor.statFiles(selected);
      this.addFileItems(result);
    } catch (e) {
      console.error('AddFiles error:', e);
    }
  }

  async handleAddFolder() {
    try {
      const selected = await this.executor.pickDirectory();
      if (!selected) return;
      const result = await this.executor.scanDirectory(selected);
      this.addFileItems(result);
    } catch (e) {
      console.error('AddFolder error:', e);
    }
  }

  async handleDrop(e: DragEvent) {
    e.preventDefault();
    // Wails file drops are handled via framework events (subscribeFileDrops).
    // This handler remains as a fallback for HTML5 drag-and-drop in non-Wails environments.
    const files = e.dataTransfer?.files;
    if (!files) return;
    const paths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i] as any;
      if (file.path) paths.push(file.path);
    }
    if (paths.length > 0) {
      const result = await this.executor.statFiles(paths);
      this.addFileItems(result);
    }
  }

  clearFiles() {
    this.fileItems = [];
  }

  async startConversion() {
    if (this.fileItems.length === 0) return;

    const toolchain: ToolchainSelection = {
      cjxlPath: 'cjxl',
      djxlPath: 'djxl',
      avifencPath: 'avifenc',
      avifdecPath: 'avifdec',
      cjpegliPath: 'cjpegli',
      imagemagickPath: 'magick',
      exiftoolPath: 'exiftool',
      oxipngPath: 'oxipng',
    };

    const { plan, validation } = buildExecutionPlan(
      this.sortedItems,
      this.outputSettings,
      this.modifySettings,
      this.appSettings,
      toolchain
    );

    if (!validation.valid) {
      // TODO: show error dialog
      console.error('Validation failed:', validation.errorTitle, validation.errorDescription);
      return;
    }

    this.isConverting = true;
    this.exceptions = [];

    try {
      await this.executor.runConversionPlan(plan);
    } catch (e) {
      console.error('Conversion error:', e);
      this.isConverting = false;
    }
  }

  async cancelConversion() {
    await this.executor.cancelRun('current');
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
      if (data.output) this.outputSettings = normalizeOutputSettings(data.output);
      if (data.modify) this.modifySettings = normalizeModifySettings(data.modify);
      if (data.app) this.appSettings = normalizeAppSettings(data.app);
      if (data.layout) this.importLayoutSettings(data.layout);
      this.importSettingsJson = '';
      this.showImportDialog = false;
    } catch (e) {
      console.error('Import failed:', e);
    }
  }

  handleExportSettings() {
    const snapshot = this.buildSnapshot();
    const data = JSON.stringify(snapshot, null, 2);
    navigator.clipboard.writeText(data);
  }

  buildSnapshot(): AppStateSnapshot {
    return {
      domain: {
        output: this.outputSettings,
        modify: this.modifySettings,
        app: this.appSettings,
      },
      layout: this.exportLayoutSettings(),
      presets: [],
      theme: {
        name: this.appSettings.theme || loadThemeName(),
        mode: getThemeMode(),
        customThemes: [],
      },
      lang: this.currentLang,
      executor: this.executor.name,
    };
  }

  async init() {
    try {
      const c = await this.executor.getConstants();
      this.constants = c;
      this.cpuCount = c.cpuCount || 4;

      const saved = await this.executor.loadAppState();
      if (saved.domain?.output) {
        this.outputSettings = normalizeOutputSettings(saved.domain.output);
      }
      if (saved.domain?.modify) {
        this.modifySettings = normalizeModifySettings(saved.domain.modify);
      }
      if (saved.domain?.app) {
        this.appSettings = normalizeAppSettings(saved.domain.app);
      }

      this.currentLang = getCurrentLanguage();

      const themeName = this.appSettings.theme || loadThemeName();
      applyThemeColors(getThemeMode(), themeName);

      if (Array.isArray(this.appSettings.excluded_formats)) {
        this.excludedFormats = new Set(
          this.appSettings.excluded_formats.map((v: any) => String(v).toLowerCase())
        );
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

  subscribeFileDrops() {
    return this.executor.subscribeEvents((event: DomainEvent) => {
      if (event.type === 'files_dropped') {
        this.handleDroppedPaths(event.paths);
      }
    });
  }

  private async handleDroppedPaths(paths: string[]) {
    if (!paths || paths.length === 0) return;
    try {
      const result = await this.executor.statFiles(paths);
      this.addFileItems(result);
    } catch (e) {
      console.error('Handle dropped files error:', e);
    }
  }
}

export const appState = new AppState();
