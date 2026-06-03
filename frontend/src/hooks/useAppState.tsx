import { Dialogs } from '@wailsio/runtime';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '~/hooks/useT';
import { useConversionEvents } from '~/hooks/useConversionEvents';
import { AppService } from '~/utils/bindings';
import { setLanguage, getCurrentLanguage } from '~/i18n';
import {
  applyThemeColors,
  getThemeMode,
  loadThemeName,
  watchSystemTheme,
} from '~/utils/themes';

const DEFAULT_EXCLUDED_FORMATS = ['avif', 'jxl', 'webp', 'gif'];

export const DEFAULT_LANE_ORDER = ['input', 'output', 'modify', 'settings', 'about'];
const DEFAULT_LANE_WIDTH = 22; // rem

function loadLaneOrder(): string[] {
  try {
    const v = localStorage.getItem('xlchemy-lane-order');
    if (v) { const arr = JSON.parse(v); if (Array.isArray(arr)) return arr; }
  } catch { /* ignore */ }
  return DEFAULT_LANE_ORDER;
}

function loadCollapsedLanes(): Set<string> {
  try {
    const v = localStorage.getItem('xlchemy-collapsed-lanes');
    if (v) { const arr = JSON.parse(v); if (Array.isArray(arr)) return new Set(arr); }
  } catch { /* ignore */ }
  return new Set<string>();
}

function loadLaneWidth(): number {
  try {
    const v = localStorage.getItem('xlchemy-lane-width');
    if (v) { const n = Number(v); if (n > 0) return n; }
  } catch { /* ignore */ }
  return DEFAULT_LANE_WIDTH;
}

export interface AppState {
  // Canvas / Lane
  laneOrder: string[];
  setLaneOrder: (order: string[]) => void;
  collapsedLanes: Set<string>;
  toggleLaneCollapsed: (id: string) => void;
  laneWidth: number;
  setLaneWidth: (w: number) => void;
  settingsTab: number;
  setSettingsTab: (tab: number) => void;

  // Data
  fileItems: any[];
  outputSettings: any;
  modifySettings: any;
  appSettings: any;
  constants: any;
  cpuCount: number;

  // Conversion
  isConverting: boolean;
  progress: { completed: number; total: number; line1: string; line2: string };
  exceptions: any[];
  showExceptions: boolean;
  setShowExceptions: (show: boolean) => void;
  clearExceptions: () => void;

  // File filtering
  excludedFormats: Set<string>;
  toggleExcludedFormat: (ext: string) => void;
  allowedInput: string[];

  // Sorting
  sortedItems: any[];
  orderOptions: { key: string; label: string }[];
  processingOrder: string;
  sortingDisabled: boolean;

  // Actions
  handleAddFiles: () => Promise<void>;
  handleAddFolder: () => Promise<void>;
  handleDrop: (e: React.DragEvent) => Promise<void>;
  clearFiles: () => void;
  startConversion: () => Promise<void>;
  cancelConversion: () => Promise<void>;

  // Settings
  updateOutput: (key: string, value: any) => void;
  updateModify: (path: string[], value: any) => void;
  updateApp: (key: string, value: any) => void;
  setAppSettings: React.Dispatch<React.SetStateAction<any>>;
  changeTheme: (name: string) => void;
  changeLanguage: (lang: string) => void;

  // Import/Export
  showImportDialog: boolean;
  setShowImportDialog: (show: boolean) => void;
  importSettingsJson: string;
  setImportSettingsJson: (json: string) => void;
  handleImportSettings: () => void;
  handleExportSettings: () => void;

  // Language
  currentLang: string;
}

const AppStateContext = createContext<AppState | null>(null);

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const t = useT();

  // --- State ---
  const [laneOrder, setLaneOrderRaw] = useState<string[]>(loadLaneOrder);
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(loadCollapsedLanes);
  const [laneWidth, setLaneWidthRaw] = useState<number>(loadLaneWidth);
  const [isConverting, setIsConverting] = useState(false);
  const [fileItems, setFileItems] = useState<any[]>([]);
  const [outputSettings, setOutputSettings] = useState<any>({});
  const [modifySettings, setModifySettings] = useState<any>({});
  const [appSettings, setAppSettings] = useState<any>({});
  const [progress, setProgress] = useState({ completed: 0, total: 0, line1: '', line2: '' });
  const [showExceptions, setShowExceptions] = useState(false);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [constants, setConstants] = useState<any>({});
  const [cpuCount, setCpuCount] = useState(4);
  const [excludedFormats, setExcludedFormats] = useState<Set<string>>(new Set(DEFAULT_EXCLUDED_FORMATS));
  const excludedFormatsRef = useRef<Set<string>>(new Set(DEFAULT_EXCLUDED_FORMATS));
  const isConvertingRef = useRef(false);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const [settingsTab, setSettingsTab] = useState(0);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importSettingsJson, setImportSettingsJson] = useState('');

  // --- Lane persistence ---
  const setLaneOrder = useCallback((order: string[]) => {
    setLaneOrderRaw(order);
    localStorage.setItem('xlchemy-lane-order', JSON.stringify(order));
  }, []);

  const toggleLaneCollapsed = useCallback((id: string) => {
    setCollapsedLanes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('xlchemy-collapsed-lanes', JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  const setLaneWidth = useCallback((w: number) => {
    setLaneWidthRaw(w);
    localStorage.setItem('xlchemy-lane-width', String(w));
  }, []);

  useEffect(() => {
    isConvertingRef.current = isConverting;
  }, [isConverting]);

  useEffect(() => {
    excludedFormatsRef.current = excludedFormats;
  }, [excludedFormats]);

  useEffect(() => {
    if (Object.keys(appSettings).length === 0) return;
    if (Array.isArray(appSettings.excluded_formats)) {
      setExcludedFormats(new Set(appSettings.excluded_formats.map((v: any) => String(v).toLowerCase())));
      return;
    }
    const next = new Set(DEFAULT_EXCLUDED_FORMATS);
    setExcludedFormats(next);
    setAppSettings((prev: any) => ({ ...prev, excluded_formats: Array.from(next) }));
  }, [appSettings.excluded_formats]);

  // --- Init ---
  useEffect(() => {
    (async () => {
      try {
        const constStr = await AppService.GetConstants();
        const c = JSON.parse(constStr);
        setConstants(c);
        setCpuCount(c.cpuCount || 4);

        const settingsStr = await AppService.GetSettings();
        const settings = JSON.parse(settingsStr);
        setOutputSettings(settings.output || {});
        // Fix: map Chinese metadata values to English
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
        setModifySettings(settings.modify || {});
        setAppSettings(settings.app || {});

        const themeName = settings.app?.theme || loadThemeName();
        const mode = getThemeMode();
        applyThemeColors(mode, themeName);
      } catch (e) {
        console.error('Init error:', e);
      }
    })();

    // Watch system theme changes
    const cleanup = watchSystemTheme(() => {
      const themeName = loadThemeName();
      const mode = getThemeMode();
      applyThemeColors(mode, themeName);
    });
    return cleanup;
  }, []);

  // --- Wails Events via useConversionEvents ---
  const conversionCallbacks = useMemo(() => ({
    onProgress: (data: any) => {
      setProgress(data);
    },
    onException: (data: any) => {
      setExceptions((prev) => [...prev, data]);
    },
    onFinished: () => {
      setIsConverting(false);
      setExceptions((prev) => {
        if (prev.length > 0) setShowExceptions(true);
        return prev;
      });
    },
    onCanceled: () => {
      setIsConverting(false);
    },
    onStarted: () => {
      setExceptions([]);
    },
    onFilesDropped: async (files: string[]) => {
      if (isConvertingRef.current) return;
      try {
        const result = await AppService.AddFiles(files);
        addFileItems(JSON.parse(result));
      } catch (e) {
        console.error('File drop error:', e);
      }
    },
  }), []);

  useConversionEvents(conversionCallbacks);

  const allowedInput = useMemo((): string[] => {
    const list = Array.isArray(constants.allowedInput) ? constants.allowedInput : [];
    return Array.from(new Set(list.map((v: any) => String(v).toLowerCase())));
  }, [constants]);

  const addFileItems = useCallback((incoming: any[]) => {
    if (!Array.isArray(incoming) || incoming.length === 0) return;
    setFileItems((prev) => {
      const seen = new Set(prev.map((item) => item.absPath));
      const next = [...prev];
      const excluded = excludedFormatsRef.current;
      for (const item of incoming) {
        const ext = String(item.ext || '').toLowerCase();
        const absPath = item.absPath;
        if (!absPath || excluded.has(ext) || seen.has(absPath)) continue;
        seen.add(absPath);
        next.push(item);
      }
      return next;
    });
  }, []);

  const toggleExcludedFormat = useCallback((ext: string) => {
    setExcludedFormats((prev) => {
      const next = new Set(prev);
      if (next.has(ext)) next.delete(ext);
      else next.add(ext);
      setAppSettings((prevSettings: any) => ({
        ...prevSettings,
        excluded_formats: Array.from(next),
      }));
      return next;
    });
  }, []);

  // --- Actions ---
  const handleAddFiles = useCallback(async () => {
    try {
      const selected = await Dialogs.OpenFile({
        CanChooseFiles: true,
        AllowsMultipleSelection: true,
        Title: 'Select image files',
        Filters: [{ DisplayName: 'Images', Pattern: '*.jpg;*.jpeg;*.png;*.webp;*.avif;*.jxl;*.gif;*.bmp;*.ico;*.tiff;*.tif' }],
      });
      if (!selected || (Array.isArray(selected) && selected.length === 0)) return;
      const paths: string[] = Array.isArray(selected) ? selected : [selected];
      const result = await AppService.AddFiles(paths);
      addFileItems(JSON.parse(result));
    } catch (e) {
      console.error('AddFiles error:', e);
    }
  }, [addFileItems]);

  const handleAddFolder = useCallback(async () => {
    try {
      const selected = await Dialogs.OpenFile({
        CanChooseDirectories: true,
        CanChooseFiles: false,
        Title: 'Select folder',
      });
      if (!selected) return;
      const result = await AppService.ScanDirectory(selected as string);
      addFileItems(JSON.parse(result));
    } catch (e) {
      console.error('AddFolder error:', e);
    }
  }, [addFileItems]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files) return;
    const paths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i] as any;
      if (file.path) paths.push(file.path);
    }
    if (paths.length > 0) {
      const result = await AppService.AddFiles(paths);
      addFileItems(JSON.parse(result));
    }
  }, [addFileItems]);

  const clearFiles = useCallback(() => setFileItems([]), []);

  // Auto-save settings when they change
  useEffect(() => {
    if (Object.keys(outputSettings).length > 0 || Object.keys(modifySettings).length > 0 || Object.keys(appSettings).length > 0) {
      AppService.SaveSettings(JSON.stringify({ output: outputSettings, modify: modifySettings, app: appSettings }));
    }
  }, [outputSettings, modifySettings, appSettings]);

  const startConversion = useCallback(async () => {
    if (fileItems.length === 0) return;
    setIsConverting(true);
    try {
      await AppService.StartConversion(
        JSON.stringify(fileItems),
        JSON.stringify(outputSettings),
        JSON.stringify(modifySettings),
        JSON.stringify(appSettings),
        outputSettings.threads || cpuCount,
      );
    } catch (e) {
      console.error('Conversion error:', e);
      setIsConverting(false);
    }
  }, [fileItems, outputSettings, modifySettings, appSettings, cpuCount]);

  const cancelConversion = useCallback(async () => {
    await AppService.CancelConversion();
  }, []);

  const clearExceptions = useCallback(() => {
    setExceptions([]);
    setShowExceptions(false);
  }, []);

  const changeTheme = useCallback(
    (name: string) => {
      setAppSettings((prev: any) => ({ ...prev, theme: name }));
      const mode = getThemeMode();
      applyThemeColors(mode, name);
      AppService.SaveSettings(
        JSON.stringify({ ...{ output: outputSettings, modify: modifySettings, app: { ...appSettings, theme: name } } }),
      );
    },
    [outputSettings, modifySettings, appSettings],
  );

  const changeLanguage = useCallback((lang: string) => {
    setLanguage(lang);
    setCurrentLang(lang);
  }, []);

  const orderOptions = useMemo(() => [
    { key: 'Original', label: t('Original') },
    { key: 'Path Ascending', label: t('Path Ascending') },
    { key: 'Path Descending', label: t('Path Descending') },
    { key: 'Size Ascending', label: t('Size Ascending') },
    { key: 'Size Descending', label: t('Size Descending') },
    { key: 'Random', label: t('Random') },
    { key: 'Sequential', label: t('Sequential') },
  ], [t]);

  const processingOrder = appSettings.processing_order || 'Original';
  const sortingDisabled = !!appSettings.sorting_disabled;

  const sortedItems = useMemo(() => {
    const items = [...fileItems];
    if (sortingDisabled) return items;

    const compareText = (a: string, b: string) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' });

    switch (processingOrder) {
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
      case 'Original':
      default:
        break;
    }
    return items;
  }, [fileItems, processingOrder, sortingDisabled]);

  // --- Helper: update nested settings ---
  const updateOutput = useCallback((key: string, value: any) =>
    setOutputSettings((prev: any) => ({ ...prev, [key]: value })), []);

  const updateModify = useCallback((path: string[], value: any) =>
    setModifySettings((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev));
      let obj = next;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
      obj[path[path.length - 1]] = value;
      return next;
    }), []);

  const updateApp = useCallback((key: string, value: any) =>
    setAppSettings((prev: any) => ({ ...prev, [key]: value })), []);

  // --- Import/Export ---
  const handleImportSettings = useCallback(() => {
    try {
      const data = JSON.parse(importSettingsJson);
      if (data.output) setOutputSettings(data.output);
      if (data.modify) setModifySettings(data.modify);
      if (data.app) setAppSettings(data.app);
      setImportSettingsJson('');
      setShowImportDialog(false);
    } catch (e) {
      console.error('Import failed:', e);
    }
  }, [importSettingsJson]);

  const handleExportSettings = useCallback(() => {
    const data = JSON.stringify({ output: outputSettings, modify: modifySettings, app: appSettings }, null, 2);
    navigator.clipboard.writeText(data);
  }, [outputSettings, modifySettings, appSettings]);

  const value = useMemo<AppState>(() => ({
    // Canvas / Lane
    laneOrder,
    setLaneOrder,
    collapsedLanes,
    toggleLaneCollapsed,
    laneWidth,
    setLaneWidth,
    settingsTab,
    setSettingsTab,

    // Data
    fileItems,
    outputSettings,
    modifySettings,
    appSettings,
    constants,
    cpuCount,

    // Conversion
    isConverting,
    progress,
    exceptions,
    showExceptions,
    setShowExceptions,
    clearExceptions,

    // File filtering
    excludedFormats,
    toggleExcludedFormat,
    allowedInput,

    // Sorting
    sortedItems,
    orderOptions,
    processingOrder,
    sortingDisabled,

    // Actions
    handleAddFiles,
    handleAddFolder,
    handleDrop,
    clearFiles,
    startConversion,
    cancelConversion,

    // Settings
    updateOutput,
    updateModify,
    updateApp,
    setAppSettings,
    changeTheme,
    changeLanguage,

    // Import/Export
    showImportDialog,
    setShowImportDialog,
    importSettingsJson,
    setImportSettingsJson,
    handleImportSettings,
    handleExportSettings,

    // Language
    currentLang,
  }), [
    laneOrder, collapsedLanes, laneWidth, settingsTab,
    fileItems, outputSettings, modifySettings, appSettings, constants, cpuCount,
    isConverting, progress, exceptions, showExceptions, clearExceptions,
    excludedFormats, allowedInput,
    sortedItems, orderOptions, processingOrder, sortingDisabled,
    handleAddFiles, handleAddFolder, handleDrop, clearFiles, startConversion, cancelConversion,
    updateOutput, updateModify, updateApp, setAppSettings, changeTheme, changeLanguage,
    showImportDialog, importSettingsJson, handleImportSettings, handleExportSettings,
    currentLang,
  ]);

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}
