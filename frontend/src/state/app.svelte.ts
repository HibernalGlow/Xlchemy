import { getCurrentLanguage, setLanguage } from '$lib/i18n';
import { getExecutor, getExecutorName } from '$lib/executor';
import {
  cloneCardLayout,
  DEFAULT_CARD_LAYOUT,
  DEFAULT_PROGRESS_CARD_CONFIG,
  mergeCardLayoutWithDefaults,
  findDuplicateCards,
  type CardId,
  type CardLayout,
  type LaneId,
  type ProgressCardConfig,
  type DuplicateCardInfo,
} from '$lib/cards/definitions';
import { applyThemeColors, getCustomThemes, getThemeMode, loadThemeName, setCustomThemes, setThemeMode, watchSystemTheme } from '$lib/utils/themes';
import {
  type BackgroundSettings,
  applyBackgroundCSS,
} from '$lib/utils/backgroundSettings';
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
  DEFAULT_LANE_WIDTH,
  DEFAULT_LANE_WIDTH_RATIOS,
  DEFAULT_APP_CONSTANTS,
  mergeConstants,
} from '$lib/domain';
import {
  sortItems,
  mergeFileItems,
  buildExecutionPlan,
} from '$lib/orchestrator';
import { loadLegacyClientState, resolveImportPayload } from './persistence';

const DEFAULT_EXCLUDED_FORMATS = ['avif', 'jxl', 'webp', 'gif'];
const DEFAULT_SNAPSHOT = createDefaultSnapshot();
const LEGACY_CLIENT_STATE = loadLegacyClientState();

function fileUrlToPath(url: string): string | null {
  if (!url.startsWith('file://')) return null;

  try {
    const parsed = new URL(url);
    let pathname = decodeURIComponent(parsed.pathname);

    if (/^\/[a-zA-Z]:/.test(pathname)) {
      pathname = pathname.slice(1);
    }

    return pathname.replace(/\//g, '\\');
  } catch {
    return null;
  }
}

function extractDropPaths(e: DragEvent): string[] {
  const paths = new Set<string>();
  const files = e.dataTransfer?.files;

  if (files) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i] as File & {
        path?: string;
        pywebviewFullPath?: string;
      };
      if (file.path) paths.add(file.path);
      if (file.pywebviewFullPath) paths.add(file.pywebviewFullPath);
    }
  }

  const uriList = e.dataTransfer?.getData('text/uri-list') || '';
  for (const line of uriList.split(/\r?\n/)) {
    const entry = line.trim();
    if (!entry || entry.startsWith('#')) continue;
    const path = fileUrlToPath(entry);
    if (path) paths.add(path);
  }

  return [...paths];
}

function sanitizeLaneId(value: string): LaneId {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || `lane-${Date.now()}`;
}

export class AppState {
  // Layout state
  laneOrder = $state<string[]>([...DEFAULT_SNAPSHOT.layout.laneOrder]);
  collapsedLanes = $state<Set<string>>(new Set(DEFAULT_SNAPSHOT.layout.collapsedLanes));
  laneWidths = $state<Record<string, number>>({ ...DEFAULT_SNAPSHOT.layout.laneWidths });
  laneWidthRatios = $state<Record<string, number>>({ ...DEFAULT_SNAPSHOT.layout.laneWidthRatios });
  laneLabels = $state<Record<string, string>>({ ...DEFAULT_SNAPSHOT.layout.laneLabels });
  cardLayout = $state<CardLayout>(cloneCardLayout(DEFAULT_CARD_LAYOUT));
  singleLaneMode = $state<boolean>(DEFAULT_SNAPSHOT.layout.singleLaneMode);
  activeLaneId = $state<LaneId>(DEFAULT_SNAPSHOT.layout.activeLaneId as LaneId);
  progressCardConfig = $state<ProgressCardConfig>({ ...DEFAULT_PROGRESS_CARD_CONFIG });
  hiddenLanes = $state<Set<string>>(new Set(DEFAULT_SNAPSHOT.layout.hiddenLanes));
  hiddenCards = $state<Set<string>>(new Set(DEFAULT_SNAPSHOT.layout.hiddenCards));
  duplicateCards = $state<DuplicateCardInfo[]>([]);
  showDuplicateDialog = $state<boolean>(false);

  // Domain state
  fileItems = $state<FileItem[]>([]);
  outputSettings = $state<OutputSettings>(normalizeOutputSettings({}));
  modifySettings = $state<ModifySettings>(normalizeModifySettings({}));
  appSettings = $state<AppSettings>(normalizeAppSettings({}));

  // Runtime state
  constants = $state<AppConstants>({ ...DEFAULT_APP_CONSTANTS });
  cpuCount = $state<number>(4);

  isConverting = $state<boolean>(false);
  progress = $state({ completed: 0, total: 0, line1: '', line2: '' });
  exceptions = $state<{ id: string; msg: string; path: string }[]>([]);
  showExceptions = $state<boolean>(false);

  // Snapshot of file paths at conversion start (for clear-completed)
  conversionFilePaths = $state<Set<string>>(new Set());

  // Conversion timing for ETA
  conversionStartTime = $state<number>(0);
  conversionElapsed = $state<number>(0);

  // Log entries
  logEntries = $state<{ time: string; level: 'info' | 'warn' | 'error' | 'success'; message: string }[]>([]);

  addLog(level: 'info' | 'warn' | 'error' | 'success', message: string) {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.logEntries = [...this.logEntries.slice(-499), { time, level, message }];
    // Persist to backend log file (fire-and-forget)
    getExecutor().writeLog?.(level, message).catch(() => {});
  }

  excludedFormats = $state<Set<string>>(new Set(DEFAULT_EXCLUDED_FORMATS));

  showImportDialog = $state<boolean>(false);
  importSettingsJson = $state<string>('');
  currentLang = $state<string>(DEFAULT_SNAPSHOT.lang);
  backgroundSettings = $state<BackgroundSettings>({ ...DEFAULT_SNAPSHOT.background });
  isInitialized = $state<boolean>(false);

  private saveTimer: ReturnType<typeof setTimeout> | null = null;

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
    this.queueSettingsSave();
  }

  laneTitle(laneId: LaneId): string {
    return this.laneLabels[laneId] || DEFAULT_SNAPSHOT.layout.laneLabels[laneId] || laneId;
  }

  createLane(name = 'New Lane') {
    let base = sanitizeLaneId(name);
    let id = base;
    let i = 2;
    while (this.laneOrder.includes(id)) id = `${base}-${i++}`;
    this.laneOrder = [...this.laneOrder, id];
    this.laneLabels = { ...this.laneLabels, [id]: name.trim() || 'New Lane' };
    this.cardLayout = { ...this.cardLayout, [id]: [] };
    this.laneWidths = { ...this.laneWidths, [id]: DEFAULT_SNAPSHOT.layout.laneWidths[id] || DEFAULT_LANE_WIDTH };
    this.laneWidthRatios = { ...this.laneWidthRatios, [id]: DEFAULT_LANE_WIDTH_RATIOS[id] || 1 };
    this.activeLaneId = id;
    this.queueSettingsSave();
  }

  renameLane(laneId: LaneId, name: string) {
    const nextName = name.trim();
    if (!nextName) return;
    this.laneLabels = { ...this.laneLabels, [laneId]: nextName };
    this.queueSettingsSave();
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
    const { [laneId]: _removedRatio, ...nextRatios } = this.laneWidthRatios;
    this.cardLayout = nextLayout;
    this.laneLabels = nextLabels;
    this.laneWidths = nextWidths;
    this.laneWidthRatios = nextRatios;
    this.laneOrder = this.laneOrder.filter((id) => id !== laneId);
    if (this.activeLaneId === laneId) this.activeLaneId = 'input';
    this.queueSettingsSave();
  }

  exportLayoutSettings() {
    return {
      laneOrder: this.laneOrder,
      laneLabels: this.laneLabels,
      laneWidths: this.laneWidths,
      laneWidthRatios: this.laneWidthRatios,
      cardLayout: this.cardLayout,
      singleLaneMode: this.singleLaneMode,
      activeLaneId: this.activeLaneId,
      progressCardConfig: this.progressCardConfig,
      collapsedLanes: Array.from(this.collapsedLanes),
      hiddenLanes: Array.from(this.hiddenLanes),
      hiddenCards: Array.from(this.hiddenCards),
    };
  }

  importLayoutSettings(layout: any) {
    if (!layout || typeof layout !== 'object') return;
    if (Array.isArray(layout.laneOrder)) {
      // Merge: keep user's order, but append any new default lanes that are missing
      const saved = layout.laneOrder as string[];
      const defaultOrder = DEFAULT_SNAPSHOT.layout.laneOrder;
      const merged = [...saved];
      for (const laneId of defaultOrder) {
        if (!merged.includes(laneId)) merged.push(laneId);
      }
      this.laneOrder = merged;
    }
    if (layout.laneLabels && typeof layout.laneLabels === 'object') {
      this.laneLabels = { ...DEFAULT_SNAPSHOT.layout.laneLabels, ...layout.laneLabels };
    }
    if (layout.laneWidths && typeof layout.laneWidths === 'object') this.laneWidths = layout.laneWidths;
    if (layout.laneWidthRatios && typeof layout.laneWidthRatios === 'object') {
      this.laneWidthRatios = { ...DEFAULT_LANE_WIDTH_RATIOS, ...layout.laneWidthRatios };
    }
    if (layout.cardLayout && typeof layout.cardLayout === 'object') {
      this.cardLayout = mergeCardLayoutWithDefaults(layout.cardLayout);
    }
    if (typeof layout.singleLaneMode === 'boolean') this.singleLaneMode = layout.singleLaneMode;
    if (layout.activeLaneId) this.activeLaneId = layout.activeLaneId;
    if (layout.progressCardConfig && typeof layout.progressCardConfig === 'object') {
      this.progressCardConfig = { ...this.progressCardConfig, ...layout.progressCardConfig };
    }
    if (Array.isArray(layout.hiddenLanes)) {
      this.hiddenLanes = new Set(layout.hiddenLanes);
    }
    if (Array.isArray(layout.hiddenCards)) {
      this.hiddenCards = new Set(layout.hiddenCards);
    }
    if (Array.isArray(layout.collapsedLanes)) {
      this.collapsedLanes = new Set(layout.collapsedLanes);
    }
  }

  /** Scan cardLayout for cards appearing in more than one lane. */
  detectDuplicateCards() {
    const dupes = findDuplicateCards(this.cardLayout);
    this.duplicateCards = dupes;
    this.showDuplicateDialog = dupes.length > 0;
  }

  /** Remove duplicates, keeping each card only in the chosen lane. */
  resolveDuplicateCards(choices: Map<string, string>) {
    const next = cloneCardLayout(this.cardLayout);
    for (const [cardId, keepLane] of choices) {
      for (const [laneId, cards] of Object.entries(next)) {
        if (laneId === keepLane) continue;
        next[laneId] = cards.filter((id) => id !== cardId);
      }
    }
    this.cardLayout = next;
    this.duplicateCards = [];
    this.showDuplicateDialog = false;
    this.queueSettingsSave();
  }

  toggleLaneCollapsed(id: string) {
    const next = new Set(this.collapsedLanes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.collapsedLanes = next;
    this.queueSettingsSave();
  }

  toggleLaneHidden(id: string) {
    const next = new Set(this.hiddenLanes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.hiddenLanes = next;
    this.queueSettingsSave();
  }

  showAllLanes() {
    this.hiddenLanes = new Set<string>();
    this.queueSettingsSave();
  }

  toggleCardHidden(cardId: string) {
    const next = new Set(this.hiddenCards);
    if (next.has(cardId)) next.delete(cardId);
    else next.add(cardId);
    this.hiddenCards = next;
    this.queueSettingsSave();
  }

  moveCardToLane(cardId: CardId, targetLaneId: string) {
    const next: CardLayout = cloneCardLayout(this.cardLayout);
    // Remove from all lanes
    for (const laneId of Object.keys(next)) {
      next[laneId] = next[laneId].filter((id) => id !== cardId);
    }
    // Add to target lane
    if (!next[targetLaneId]) next[targetLaneId] = [];
    next[targetLaneId].push(cardId);
    this.cardLayout = next;
    this.queueSettingsSave();
  }

  reorderCardInLane(cardId: CardId, direction: 'up' | 'down') {
    const next: CardLayout = cloneCardLayout(this.cardLayout);
    for (const laneId of Object.keys(next)) {
      const idx = next[laneId].indexOf(cardId);
      if (idx >= 0) {
        const newIdx = direction === 'up' ? Math.max(0, idx - 1) : Math.min(next[laneId].length - 1, idx + 1);
        if (newIdx !== idx) {
          const list = [...next[laneId]];
          const [item] = list.splice(idx, 1);
          list.splice(newIdx, 0, item);
          next[laneId] = list;
        }
        break;
      }
    }
    this.cardLayout = next;
    this.queueSettingsSave();
  }

  laneWidth(laneId: LaneId): number {
    return this.laneWidths[laneId] || DEFAULT_SNAPSHOT.layout.laneWidths[laneId] || DEFAULT_LANE_WIDTH;
  }

  setLaneWidth(laneId: LaneId, width: number) {
    const next = { ...this.laneWidths, [laneId]: width };
    this.laneWidths = next;
    this.queueSettingsSave();
  }

  laneWidthRatio(laneId: LaneId): number {
    return this.laneWidthRatios[laneId] ?? DEFAULT_LANE_WIDTH_RATIOS[laneId] ?? 1;
  }

  setLaneWidthRatio(laneId: LaneId, ratio: number) {
    const clamped = Math.max(0.25, Math.min(4, ratio));
    const next = { ...this.laneWidthRatios, [laneId]: clamped };
    this.laneWidthRatios = next;
    this.queueSettingsSave();
  }

  setSingleLaneMode(enabled: boolean) {
    this.singleLaneMode = enabled;
    this.queueSettingsSave();
  }

  setActiveLaneId(laneId: LaneId) {
    this.activeLaneId = laneId;
    this.queueSettingsSave();
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
    this.queueSettingsSave();
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
    this.queueSettingsSave();
  }

  updateProgressCardConfig(key: keyof ProgressCardConfig, value: boolean) {
    this.progressCardConfig = { ...this.progressCardConfig, [key]: value };
    this.queueSettingsSave();
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
    this.queueSettingsSave();
  }

  async handleAddFiles() {
    try {
      const selected = await getExecutor().pickFiles();
      if (selected.length === 0) return;
      const result = await getExecutor().statFiles(selected);
      this.addFileItems(result);
    } catch (e) {
      console.error('AddFiles error:', e);
    }
  }

  async handleAddFolder() {
    try {
      const selected = await getExecutor().pickDirectory();
      if (!selected) return;
      const result = await getExecutor().scanDirectory(selected);
      this.addFileItems(result);
    } catch (e) {
      console.error('AddFolder error:', e);
    }
  }

  async handleDrop(e: DragEvent) {
    e.preventDefault();
    // Wails file drops are handled via framework events (subscribeFileDrops).
    // This handler remains as a fallback for HTML5 drag-and-drop in non-Wails environments.
    const paths = extractDropPaths(e);
    if (paths.length > 0) {
      const result = await getExecutor().statFiles(paths);
      this.addFileItems(result);
    }
  }

  clearFiles() {
    this.fileItems = [];
  }

  clearCompleted() {
    if (this.conversionFilePaths.size === 0) return;
    this.fileItems = this.fileItems.filter((item) => !this.conversionFilePaths.has(item.absPath));
    this.conversionFilePaths = new Set();
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

    const normalizedOutput = {
      ...this.outputSettings,
      threads: this.outputSettings.threads || this.cpuCount || 4,
    };

    const { plan, validation } = buildExecutionPlan(
      this.sortedItems,
      normalizedOutput,
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
      await getExecutor().runConversionPlan(plan);
    } catch (e) {
      console.error('Conversion error:', e);
      this.isConverting = false;
    }
  }

  async cancelConversion() {
    await getExecutor().cancelRun('current');
  }

  async showFileInFolder(path: string) {
    try {
      const executor = getExecutor();
      if (executor.showFileInFolder) {
        await executor.showFileInFolder(path);
      }
    } catch (e) {
      console.error('ShowFileInFolder error:', e);
    }
  }

  clearExceptions() {
    this.exceptions = [];
    this.showExceptions = false;
  }

  updateOutput(key: string, value: any) {
    this.outputSettings = { ...this.outputSettings, [key]: value };
    this.queueSettingsSave();
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
    this.queueSettingsSave();
  }

  updateApp(key: string, value: any) {
    this.appSettings = { ...this.appSettings, [key]: value };
    this.queueSettingsSave();
  }

  changeTheme(name: string) {
    this.appSettings = { ...this.appSettings, theme: name };
    applyThemeColors(getThemeMode(), name);
    this.queueSettingsSave();
  }

  changeThemeMode(mode: 'light' | 'dark' | 'system') {
    setThemeMode(mode);
    applyThemeColors(mode, this.appSettings.theme || loadThemeName());
    this.queueSettingsSave();
  }

  updateBackground(partial: Partial<BackgroundSettings>) {
    this.backgroundSettings = { ...this.backgroundSettings, ...partial };
    applyBackgroundCSS(this.backgroundSettings);
    this.queueSettingsSave();
  }

  changeLanguage(lang: string) {
    setLanguage(lang);
    this.currentLang = lang;
    this.queueSettingsSave();
  }

  async saveCurrentSettings() {
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (!this.isInitialized) return;
    await getExecutor().saveAppState(this.buildSnapshot());
  }

  async handleImportSettings() {
    try {
      const parsed = JSON.parse(this.importSettingsJson);
      const data = resolveImportPayload(parsed);
      if (data.output) this.outputSettings = normalizeOutputSettings(data.output);
      if (data.modify) this.modifySettings = normalizeModifySettings(data.modify);
      if (data.app) this.appSettings = normalizeAppSettings(data.app);
      if (data.layout) this.importLayoutSettings(data.layout);
      if (data.background && typeof data.background === 'object') {
        this.backgroundSettings = { ...DEFAULT_SNAPSHOT.background, ...data.background as Record<string, unknown> };
        applyBackgroundCSS(this.backgroundSettings);
      }
      if (data.theme && typeof data.theme === 'object') {
        const theme = data.theme as { name?: string; mode?: 'light' | 'dark' | 'system' };
        const themeName = theme.name || this.appSettings.theme || DEFAULT_SNAPSHOT.theme.name;
        const themeMode = theme.mode || getThemeMode();
        this.appSettings = { ...this.appSettings, theme: themeName };
        setThemeMode(themeMode);
        applyThemeColors(themeMode, themeName);
      }
      if (typeof data.lang === 'string' && data.lang) {
        this.changeLanguage(data.lang);
      }
      this.importSettingsJson = '';
      this.showImportDialog = false;
      await this.saveCurrentSettings();
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
        customThemes: getCustomThemes(),
      },
      background: this.backgroundSettings,
      lang: this.currentLang,
      executor: getExecutorName(),
    };
  }

  async init() {
    try {
      const c = await getExecutor().getConstants();
      this.constants = mergeConstants(c);
      this.cpuCount = this.constants.cpuCount || 4;

      const saved = await getExecutor().loadAppState();
      let shouldMigrateLegacyState = false;

      if (saved.domain?.output) {
        this.outputSettings = normalizeOutputSettings(saved.domain.output);
      }
      if (saved.domain?.modify) {
        this.modifySettings = normalizeModifySettings(saved.domain.modify);
      }
      if (saved.domain?.app) {
        this.appSettings = normalizeAppSettings(saved.domain.app);
      }

      if (saved.layout && typeof saved.layout === 'object') {
        this.importLayoutSettings(saved.layout);
        // Always re-save after merge to persist any newly added default lanes/cards
        shouldMigrateLegacyState = true;
      } else if (LEGACY_CLIENT_STATE.hasLayoutState) {
        this.importLayoutSettings(LEGACY_CLIENT_STATE.layout);
        shouldMigrateLegacyState = true;
      }

      if (saved.background && typeof saved.background === 'object') {
        this.backgroundSettings = { ...DEFAULT_SNAPSHOT.background, ...saved.background };
      } else if (LEGACY_CLIENT_STATE.hasBackgroundState) {
        this.backgroundSettings = { ...DEFAULT_SNAPSHOT.background, ...LEGACY_CLIENT_STATE.background };
        shouldMigrateLegacyState = true;
      }
      applyBackgroundCSS(this.backgroundSettings);

      const savedLang = typeof saved.lang === 'string' && saved.lang ? saved.lang : '';
      if (savedLang) {
        this.currentLang = savedLang;
        setLanguage(savedLang);
      } else {
        this.currentLang = LEGACY_CLIENT_STATE.hasLangState ? LEGACY_CLIENT_STATE.lang : getCurrentLanguage();
        if (LEGACY_CLIENT_STATE.hasLangState) {
          shouldMigrateLegacyState = true;
        }
      }

      const savedTheme = saved.theme && typeof saved.theme === 'object' ? saved.theme : undefined;
      if (Array.isArray(savedTheme?.customThemes)) {
        setCustomThemes(savedTheme.customThemes);
      } else if (LEGACY_CLIENT_STATE.hasThemeState) {
        setCustomThemes(LEGACY_CLIENT_STATE.theme.customThemes);
      }
      const themeName = savedTheme?.name || this.appSettings.theme || LEGACY_CLIENT_STATE.theme.name || loadThemeName();
      const themeMode = savedTheme?.mode || LEGACY_CLIENT_STATE.theme.mode || getThemeMode();
      if (!savedTheme && LEGACY_CLIENT_STATE.hasThemeState) {
        shouldMigrateLegacyState = true;
      }
      this.appSettings = { ...this.appSettings, theme: themeName };
      setThemeMode(themeMode);
      applyThemeColors(themeMode, themeName);

      if (Array.isArray(this.appSettings.excluded_formats)) {
        this.excludedFormats = new Set(
          this.appSettings.excluded_formats.map((v: any) => String(v).toLowerCase())
        );
      } else {
        this.excludedFormats = new Set(DEFAULT_EXCLUDED_FORMATS);
        this.appSettings = { ...this.appSettings, excluded_formats: Array.from(this.excludedFormats) };
      }
      this.isInitialized = true;
      this.detectDuplicateCards();
      if (shouldMigrateLegacyState) {
        await this.saveCurrentSettings();
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
    return getExecutor().subscribeEvents((event: DomainEvent) => {
      if (event.type === 'files_dropped') {
        this.handleDroppedPaths(event.paths);
      }
    });
  }

  private async handleDroppedPaths(paths: string[]) {
    if (!paths || paths.length === 0) return;
    try {
      const result = await getExecutor().statFiles(paths);
      this.addFileItems(result);
    } catch (e) {
      console.error('Handle dropped files error:', e);
    }
  }

  private queueSettingsSave() {
    if (!this.isInitialized) return;
    if (this.saveTimer !== null) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      this.saveCurrentSettings().catch((e) => console.error('saveAppState error:', e));
    }, 150);
  }
}

export const appState = new AppState();
