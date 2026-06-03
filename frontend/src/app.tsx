import { Dialogs, Events } from '@wailsio/runtime';
import {
  FileInput,
  FileOutput,
  Info,
  Menu,
  Settings,
  SlidersHorizontal,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '~/components/shadcn/badge';
import { Button } from '~/components/shadcn/button';
import { Card } from '~/components/shadcn/card';
import { Checkbox } from '~/components/shadcn/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/shadcn/dialog';
import { Input } from '~/components/shadcn/input';
import { Textarea } from '~/components/shadcn/textarea';
import { Progress } from '~/components/shadcn/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/shadcn/select';
import { Slider } from '~/components/shadcn/slider';
import { useT } from '~/hooks/useT';
import { ThemePanel } from '~/views/theme-panel';
import { AppSidebar, type SidebarNavItem } from '~/views/app-sidebar';
import { AppService } from '~/utils/bindings';
import { cn } from '~/utils/cn';
import { setLanguage, getCurrentLanguage } from '~/i18n';
import {
  applyThemeColors,
  getThemeMode,
  loadThemeName,
  watchSystemTheme,
} from '~/utils/themes';

const formatOptions = [
  'JPEG XL', 'AVIF', 'JPEG', 'WebP', 'PNG',
  'Lossless JPEG Transcoding', 'JPEG Reconstruction', 'Smallest Lossless',
];

const DEFAULT_EXCLUDED_FORMATS = ['avif', 'jxl', 'webp', 'gif'];

export default function App() {
  const t = useT();

  // --- State ---
  const [activeTab, setActiveTab] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
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
  const [isMobile, setIsMobile] = useState(false);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const [settingsTab, setSettingsTab] = useState(0);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importSettingsJson, setImportSettingsJson] = useState('');

  const navItems: SidebarNavItem[] = useMemo(() => [
    { label: t('Input'), icon: FileInput },
    { label: t('Output'), icon: FileOutput },
    { label: t('Modify'), icon: SlidersHorizontal },
    { label: t('Settings'), icon: Settings },
    { label: t('About'), icon: Info },
  ], [t]);

  // --- Mobile detection ---
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handler(mql);
    mql.addEventListener('change', handler as (e: MediaQueryListEvent) => void);
    return () => mql.removeEventListener('change', handler as (e: MediaQueryListEvent) => void);
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

  // --- Wails Events ---
  useEffect(() => {
    Events.On('conversion:progress', (data: any) => {
      setProgress(data.data);
    });
    Events.On('conversion:exception', (data: any) => {
      setExceptions((prev) => [...prev, data.data]);
    });
    Events.On('conversion:finished', () => {
      setIsConverting(false);
      setExceptions((prev) => {
        if (prev.length > 0) setShowExceptions(true);
        return prev;
      });
    });
    Events.On('conversion:canceled', () => {
      setIsConverting(false);
    });
    Events.On('conversion:started', () => {
      setExceptions([]);
    });
  }, []);

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
      setActiveTab(0);
      addFileItems(JSON.parse(result));
    }
  }, [addFileItems]);

  const clearFiles = useCallback(() => setFileItems([]), []);

  useEffect(() => {
    const unsubscribe = Events.On('files-dropped', async (event: any) => {
      if (isConvertingRef.current) return;
      const files = event?.data?.files || [];
      if (files.length === 0) return;
      try {
        const result = await AppService.AddFiles(files);
        setActiveTab(0);
        addFileItems(JSON.parse(result));
      } catch (e) {
        console.error('File drop error:', e);
      }
    });
    return unsubscribe;
  }, [addFileItems]);

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
  const updateOutput = (key: string, value: any) =>
    setOutputSettings((prev: any) => ({ ...prev, [key]: value }));

  const updateModify = (path: string[], value: any) =>
    setModifySettings((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev));
      let obj = next;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
      obj[path[path.length - 1]] = value;
      return next;
    });

  const progressPercent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  return (
    <div
      className="flex flex-col h-screen bg-background text-foreground select-none"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Main area: Sidebar + Content */}
      <div className="flex flex-1 min-h-0">
        {/* Mobile top bar */}
        {isMobile && (
          <div className="fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 py-2 bg-background/95 backdrop-blur-sm border-b border-border md:hidden">
            <button
              className="p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold">{t('Xlchemy')}</span>
          </div>
        )}

        <AppSidebar
          items={navItems}
          activeIndex={activeTab}
          collapsed={sidebarCollapsed}
          onSelect={(i) => {
            setActiveTab(i);
            if (isMobile) setMobileOpen(false);
          }}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          disabled={isConverting}
        />

        {/* Main content area */}
        <main className="flex-1 overflow-auto min-w-0">
          <div className={isMobile ? 'pt-12' : ''}>
          {activeTab === 0 && (
            /* ===== Input ===== */
            <div className="flex flex-col flex-1 p-4 gap-3 h-full">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t('Input')}</h2>
                <div className="flex gap-2 items-center">
                  <Button variant="outline" size="sm" onClick={handleAddFiles}>
                    {t('Add Files')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearFiles}>
                    {t('Clear')}
                  </Button>
                </div>
              </div>

              {allowedInput.length > 0 && (
                <div className="flex gap-1 items-center flex-wrap">
                  <span className="text-xs text-muted-foreground">{t('Filter')}:</span>
                  {allowedInput.map((ext: string) => {
                    const excluded = excludedFormats.has(ext);
                    return (
                      <button
                        key={ext}
                        className={cn(
                          'px-2 py-0.5 text-xs rounded-md border transition-colors cursor-pointer',
                          excluded
                            ? 'text-muted-foreground border-border/50 bg-transparent'
                            : 'bg-primary text-primary-foreground border-primary',
                        )}
                        onClick={() => toggleExcludedFormat(ext)}
                      >
                        .{ext.toUpperCase()}
                      </button>
                    );
                  })}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {fileItems.length} {t('file(s)')}
                  </span>
                </div>
              )}

              <div className="flex gap-1 items-center flex-wrap">
                <span className="text-xs text-muted-foreground">{t('Processing order:')}</span>
                {orderOptions.map((opt) => (
                  <button
                    key={opt.key}
                    className={cn(
                      'px-2 py-0.5 text-xs rounded-md border transition-colors',
                      processingOrder === opt.key
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary border-transparent',
                      sortingDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                    )}
                    onClick={() => {
                      if (sortingDisabled) return;
                      setAppSettings((prev: any) => ({ ...prev, processing_order: opt.key }));
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <Card className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="text-left p-2 font-semibold w-2/5">{t('Name')}</th>
                      <th className="text-left p-2 font-semibold w-[15%]">{t('Ext')}</th>
                      <th className="text-left p-2 font-semibold">{t('Location')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedItems.map((item, i) => (
                      <tr
                        key={i}
                        className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                      >
                        <td className="p-2">{item.name}</td>
                        <td className="p-2 text-muted-foreground">{item.ext}</td>
                        <td className="p-2 text-muted-foreground text-xs truncate max-w-[200px]">
                          {item.dir}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              <div className="flex justify-end">
                <Button
                  onClick={startConversion}
                  disabled={isConverting || fileItems.length === 0}
                >
                  {t('Convert')}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 1 && (
            /* ===== Output ===== */
            <div className="flex flex-col gap-4 p-4 overflow-auto h-full">
              <h2 className="text-lg font-semibold">{t('Output')}</h2>

              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">{t('Format')}</h3>
                <div className="flex gap-3 items-center">
                  <label className="text-sm">{t('Format:')}</label>
                  <Select
                    value={outputSettings.format || ''}
                    onValueChange={(v) => updateOutput('format', v)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder={t('Select format')} />
                    </SelectTrigger>
                    <SelectContent>
                      {formatOptions.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {['JPEG XL', 'AVIF', 'WebP'].includes(outputSettings.format) && (
                  <div className="mt-2 flex items-center gap-2">
                    <Checkbox
                      id="lossless"
                      checked={!!outputSettings.lossless}
                      onCheckedChange={(v) => updateOutput('lossless', !!v)}
                    />
                    <label htmlFor="lossless" className="text-sm cursor-pointer">
                      {t('Lossless')}
                    </label>
                  </div>
                )}
                {!outputSettings.lossless &&
                  ['JPEG XL', 'AVIF', 'JPEG', 'WebP'].includes(outputSettings.format) && (
                    <div className="flex gap-3 items-center mt-3">
                      <label className="text-sm w-16">{t('Quality:')}</label>
                      <Slider
                        value={[outputSettings.quality || 80]}
                        onValueChange={([v]) => updateOutput('quality', v)}
                        min={1}
                        max={100}
                        className="flex-1"
                      />
                      <input
                        type="number"
                        className="w-14 h-8 rounded-md border border-input bg-background px-2 text-sm text-center"
                        value={outputSettings.quality || 80}
                        onChange={(e) => updateOutput('quality', Number(e.target.value))}
                        min={1}
                        max={100}
                      />
                    </div>
                  )}
                {['JPEG XL', 'AVIF', 'WebP'].includes(outputSettings.format) &&
                  !outputSettings.lossless && (
                    <div className="flex gap-3 items-center mt-3">
                      <label className="text-sm w-16">{t('Effort:')}</label>
                      <Slider
                        value={[outputSettings.effort || 5]}
                        onValueChange={([v]) => updateOutput('effort', v)}
                        min={1}
                        max={9}
                        className="flex-1"
                      />
                      <input
                        type="number"
                        className="w-14 h-8 rounded-md border border-input bg-background px-2 text-sm text-center"
                        value={outputSettings.effort || 5}
                        onChange={(e) => updateOutput('effort', Number(e.target.value))}
                        min={1}
                        max={9}
                      />
                    </div>
                  )}
              </Card>

              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">{t('Conversion Settings')}</h3>
                <div className="flex gap-3 items-center">
                  <label className="text-sm w-16">{t('Threads:')}</label>
                  <Slider
                    value={[outputSettings.threads || cpuCount]}
                    onValueChange={([v]) => updateOutput('threads', v)}
                    min={1}
                    max={cpuCount}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    className="w-14 h-8 rounded-md border border-input bg-background px-2 text-sm text-center"
                    value={outputSettings.threads || cpuCount}
                    onChange={(e) => updateOutput('threads', Number(e.target.value))}
                    min={1}
                    max={cpuCount}
                  />
                </div>
                <div className="flex gap-3 items-center mt-3">
                  <label className="text-sm">{t('If file exists:')}</label>
                  <Select
                    value={outputSettings.if_file_exists || 'Replace'}
                    onValueChange={(v) => updateOutput('if_file_exists', v)}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[t('Replace'), t('Skip'), t('Rename')].map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">{t('Save To')}</h3>
                <div className="flex gap-4 items-center">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="output_dir"
                      checked={!outputSettings.custom_output_dir}
                      onChange={() => updateOutput('custom_output_dir', false)}
                      className="accent-primary"
                    />
                    {t('Next to source')}
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="output_dir"
                      checked={!!outputSettings.custom_output_dir}
                      onChange={() => updateOutput('custom_output_dir', true)}
                      className="accent-primary"
                    />
                    {t('Custom folder')}
                  </label>
                </div>
                {outputSettings.custom_output_dir && (
                  <input
                    type="text"
                    className="mt-2 w-full h-8 rounded-md border border-input bg-background px-3 text-sm"
                    value={outputSettings.custom_output_dir_path || ''}
                    onChange={(e) => updateOutput('custom_output_dir_path', e.target.value)}
                    placeholder={t('Output path...')}
                  />
                )}
                <div className="flex gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="keep_dir_struct"
                      checked={!!outputSettings.keep_dir_struct}
                      onCheckedChange={(v) => updateOutput('keep_dir_struct', !!v)}
                    />
                    <label htmlFor="keep_dir_struct" className="text-sm cursor-pointer">
                      {t('Keep folder structure')}
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="delete_original"
                      checked={!!outputSettings.delete_original}
                      onCheckedChange={(v) => updateOutput('delete_original', !!v)}
                    />
                    <label htmlFor="delete_original" className="text-sm cursor-pointer">
                      {t('Delete original')}
                    </label>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 2 && (
            /* ===== Modify ===== */
            <div className="flex flex-col gap-4 p-4 overflow-auto h-full">
              <h2 className="text-lg font-semibold">{t('Modify')}</h2>

              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">{t('Downscaling')}</h3>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="enable_downscaling"
                    checked={!!modifySettings.downscaling?.enabled}
                    onCheckedChange={(v) =>
                      updateModify(['downscaling', 'enabled'], !!v)
                    }
                  />
                  <label htmlFor="enable_downscaling" className="text-sm cursor-pointer">
                    {t('Enable downscaling')}
                  </label>
                </div>
                {modifySettings.downscaling?.enabled && (
                  <>
                    <div className="flex gap-3 items-center mt-3">
                      <label className="text-sm">{t('Mode:')}</label>
                      <Select
                        value={modifySettings.downscaling?.mode || 'Resolution'}
                        onValueChange={(v) =>
                          updateModify(['downscaling', 'mode'], v)
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[t('Resolution'), t('Percent'), t('File Size'), t('Shortest Side'), t('Longest Side'), t('Megapixels')].map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {modifySettings.downscaling?.mode === 'Resolution' && (
                      <div className="flex gap-3 items-center mt-2">
                        <label className="text-sm">{t('Width:')}</label>
                        <input
                          type="number"
                          className="w-20 h-8 rounded-md border border-input bg-background px-2 text-sm"
                          value={modifySettings.downscaling?.width || 1920}
                          onChange={(e) =>
                            updateModify(['downscaling', 'width'], Number(e.target.value))
                          }
                        />
                        <label className="text-sm">{t('Height:')}</label>
                        <input
                          type="number"
                          className="w-20 h-8 rounded-md border border-input bg-background px-2 text-sm"
                          value={modifySettings.downscaling?.height || 1080}
                          onChange={(e) =>
                            updateModify(['downscaling', 'height'], Number(e.target.value))
                          }
                        />
                      </div>
                    )}
                    {modifySettings.downscaling?.mode === 'Percent' && (
                      <div className="flex gap-3 items-center mt-2">
                        <label className="text-sm">{t('Percent:')}</label>
                        <input
                          type="number"
                          className="w-20 h-8 rounded-md border border-input bg-background px-2 text-sm"
                          value={modifySettings.downscaling?.percent || 50}
                          min={1}
                          max={100}
                          onChange={(e) =>
                            updateModify(['downscaling', 'percent'], Number(e.target.value))
                          }
                        />
                      </div>
                    )}
                    {modifySettings.downscaling?.mode === 'Megapixels' && (
                      <div className="flex gap-3 items-center mt-2">
                        <label className="text-sm">{t('Megapixels:')}</label>
                        <input
                          type="number"
                          className="w-20 h-8 rounded-md border border-input bg-background px-2 text-sm"
                          value={modifySettings.downscaling?.megapixels || 2}
                          min={0.1}
                          step={0.1}
                          onChange={(e) =>
                            updateModify(['downscaling', 'megapixels'], Number(e.target.value))
                          }
                        />
                      </div>
                    )}
                  </>
                )}
              </Card>

              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">{t('Misc')}</h3>
                <div className="flex gap-3 items-center">
                  <label className="text-sm">{t('Metadata:')}</label>
                  <Select
                    value={modifySettings.misc?.keep_metadata || 'Encoder - Wipe'}
                    onValueChange={(v) => updateModify(['misc', 'keep_metadata'], v)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[t('Encoder - Wipe'), t('Encoder - Preserve'), t('ExifTool - Wipe'), t('ExifTool - Preserve'), t('ExifTool - Unsafe Wipe'), t('ExifTool - Custom')].map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Checkbox
                    id="keep_timestamps"
                    checked={!!modifySettings.misc?.keep_timestamps}
                    onCheckedChange={(v) => updateModify(['misc', 'keep_timestamps'], !!v)}
                  />
                  <label htmlFor="keep_timestamps" className="text-sm cursor-pointer">
                    {t('Keep timestamps')}
                  </label>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 3 && (
            /* ===== Settings ===== */
            <div className="flex flex-col gap-4 p-4 overflow-auto h-full">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{t('Settings')}</h2>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    const data = JSON.stringify({ output: outputSettings, modify: modifySettings, app: appSettings }, null, 2);
                    navigator.clipboard.writeText(data);
                  }}>
                    {t('Export')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
                    {t('Import')}
                  </Button>
                </div>
              </div>

              {/* Horizontal Tabs */}
              <div className="flex gap-1 border-b border-border pb-1">
                {[
                  t('Appearance'),
                  t('General'),
                  t('Conversion'),
                  t('ExifTool'),
                  t('Advanced'),
                ].map((label, i) => (
                  <button
                    key={label}
                    className={`px-3 py-1.5 text-sm rounded-t-md transition-colors cursor-pointer ${
                      settingsTab === i
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-muted-foreground'
                    }`}
                    onClick={() => setSettingsTab(i)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-auto">
                {settingsTab === 0 && (
                  /* Appearance */
                  <Card className="p-4">
                    <div className="flex gap-3 items-center mb-4">
                      <label className="text-sm">{t('Language:')}</label>
                      <Select value={currentLang} onValueChange={(v) => changeLanguage(v)}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="zh">中文</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <ThemePanel currentThemeName={appSettings.theme || 'Miku'} onThemeChange={changeTheme} />
                  </Card>
                )}

                {settingsTab === 1 && (
                  /* General */
                  <Card className="p-4">
                    <div className="flex flex-col gap-2">
                      {[
                        { key: 'disable_downscaling_startup', label: t('Disable downscaling on startup') },
                        { key: 'disable_delete_startup', label: t('Disable delete original on startup') },
                        { key: 'sorting_disabled', label: t('Disable sorting') },
                        { key: 'enable_quality_precision_snapping', label: t('Quality precision snapping') },
                        { key: 'play_sound_on_finish', label: t('Play sound on finish') },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-2">
                          <Checkbox id={key} checked={!!appSettings[key]} onCheckedChange={(v) => setAppSettings((prev: any) => ({ ...prev, [key]: !!v }))} />
                          <label htmlFor={key} className="text-sm cursor-pointer">{label}</label>
                        </div>
                      ))}
                      {appSettings.play_sound_on_finish && (
                        <div className="flex gap-3 items-center ml-6">
                          <label className="text-sm">{t('Volume:')}</label>
                          <Slider value={[appSettings.play_sound_on_finish_vol ?? 60]} onValueChange={([v]) => setAppSettings((prev: any) => ({ ...prev, play_sound_on_finish_vol: v }))} min={0} max={100} className="w-32" />
                          <span className="text-xs text-muted-foreground w-8">{appSettings.play_sound_on_finish_vol ?? 60}%</span>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {settingsTab === 2 && (
                  /* Conversion */
                  <Card className="p-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox id="jxl_lossy_modular" checked={!!appSettings.jxl_lossy_modular} onCheckedChange={(v) => setAppSettings((prev: any) => ({ ...prev, jxl_lossy_modular: !!v }))} />
                        <label htmlFor="jxl_lossy_modular" className="text-sm cursor-pointer">{t('JXL lossy modular')}</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="jxl_auto_lossless_jpeg" checked={!!appSettings.jxl_auto_lossless_jpeg} onCheckedChange={(v) => setAppSettings((prev: any) => ({ ...prev, jxl_auto_lossless_jpeg: !!v }))} />
                        <label htmlFor="jxl_auto_lossless_jpeg" className="text-sm cursor-pointer">{t('Auto lossless JPEG transcode for JXL')}</label>
                      </div>
                      <div className="flex gap-3 items-center mt-1">
                        <label className="text-sm">{t('JPEG Encoder:')}</label>
                        <Select value={appSettings.jpg_encoder || 'JPEGLI'} onValueChange={(v) => setAppSettings((prev: any) => ({ ...prev, jpg_encoder: v }))}>
                          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>{['JPEGLI', 'libjpeg'].map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      {appSettings.jpg_encoder === 'JPEGLI' && (
                        <div className="flex items-center gap-2 ml-4">
                          <Checkbox id="disable_progressive_jpegli" checked={!!appSettings.disable_progressive_jpegli} onCheckedChange={(v) => setAppSettings((prev: any) => ({ ...prev, disable_progressive_jpegli: !!v }))} />
                          <label htmlFor="disable_progressive_jpegli" className="text-sm cursor-pointer">{t('Disable progressive JPEGLI')}</label>
                        </div>
                      )}
                      <div className="flex gap-3 items-center mt-1">
                        <label className="text-sm">{t('AVIF Encoder:')}</label>
                        <Select value={appSettings.avif_encoder || 'AOM AV1'} onValueChange={(v) => setAppSettings((prev: any) => ({ ...prev, avif_encoder: v }))}>
                          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>{['AOM AV1', 'SVT-AV1-PSY', 'slimg'].map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-3 items-center mt-1">
                        <label className="text-sm">{t('AVIF bit depth:')}</label>
                        <Select value={appSettings.avif_bit_depth || 'Auto'} onValueChange={(v) => setAppSettings((prev: any) => ({ ...prev, avif_bit_depth: v }))}>
                          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>{[t('Auto'), '12', '10', '8'].map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      {appSettings.avif_encoder === 'AOM AV1' && (
                        <div className="flex items-center gap-2 ml-4">
                          <Checkbox id="avif_aom_iq_tune" checked={!!appSettings.avif_aom_iq_tune} onCheckedChange={(v) => setAppSettings((prev: any) => ({ ...prev, avif_aom_iq_tune: !!v }))} />
                          <label htmlFor="avif_aom_iq_tune" className="text-sm cursor-pointer">{t('AOM IQ Tune')}</label>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Checkbox id="keep_if_larger" checked={!!appSettings.keep_if_larger} onCheckedChange={(v) => setAppSettings((prev: any) => ({ ...prev, keep_if_larger: !!v }))} />
                        <label htmlFor="keep_if_larger" className="text-sm cursor-pointer">{t('Keep original if result is larger')}</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="copy_if_larger" checked={!!appSettings.copy_if_larger} onCheckedChange={(v) => setAppSettings((prev: any) => ({ ...prev, copy_if_larger: !!v }))} />
                        <label htmlFor="copy_if_larger" className="text-sm cursor-pointer">{t('Copy original if result is larger')}</label>
                      </div>
                    </div>
                  </Card>
                )}

                {settingsTab === 3 && (
                  /* ExifTool */
                  <Card className="p-4">
                    <div className="flex flex-col gap-2">
                      {[
                        { key: 'ExifTool - Wipe', label: t('Wipe command:') },
                        { key: 'ExifTool - Preserve', label: t('Preserve command:') },
                        { key: 'ExifTool - Unsafe Wipe', label: t('Unsafe Wipe command:') },
                        { key: 'ExifTool - Custom', label: t('Custom command:') },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex flex-col gap-1">
                          <label className="text-sm">{label}</label>
                          <Textarea value={appSettings.exiftool_args?.[key] || ''} onChange={(e) => setAppSettings((prev: any) => ({ ...prev, exiftool_args: { ...prev.exiftool_args, [key]: e.target.value } }))} className="min-h-[48px] text-xs font-mono" />
                        </div>
                      ))}
                      <Button variant="outline" size="sm" className="w-fit mt-1" onClick={() => setAppSettings((prev: any) => ({ ...prev, exiftool_args: { 'ExifTool - Wipe': '-overwrite_original -all= -tagsFromFile @ -ICC_Profile -ColorSpace -Orientation', 'ExifTool - Preserve': '-overwrite_original -tagsFromFile @', 'ExifTool - Unsafe Wipe': '-overwrite_original -all=', 'ExifTool - Custom': '' } }))}>
                        {t('Reset to defaults')}
                      </Button>
                    </div>
                  </Card>
                )}

                {settingsTab === 4 && (
                  /* Advanced */
                  <Card className="p-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-3 items-center">
                        <label className="text-sm">{t('RAM optimizer:')}</label>
                        <Select value={appSettings.ram_optimizer || 'Dynamic'} onValueChange={(v) => setAppSettings((prev: any) => ({ ...prev, ram_optimizer: v }))}>
                          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>{[t('Dynamic'), t('Static'), t('Disabled')].map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      {appSettings.ram_optimizer === 'Static' && (
                        <div className="flex flex-col gap-1 ml-4">
                          <label className="text-sm">{t('Optimization rules:')}</label>
                          <Textarea value={appSettings.ram_optimizer_rules || ''} onChange={(e) => setAppSettings((prev: any) => ({ ...prev, ram_optimizer_rules: e.target.value }))} className="min-h-[48px] text-xs font-mono" />
                        </div>
                      )}
                      {[
                        { key: 'enable_jxl_effort_10', label: t('JXL effort 10') },
                        { key: 'custom_resampling', label: t('Custom resampling') },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center gap-2">
                          <Checkbox id={key} checked={!!appSettings[key]} onCheckedChange={(v) => setAppSettings((prev: any) => ({ ...prev, [key]: !!v }))} />
                          <label htmlFor={key} className="text-sm cursor-pointer">{label}</label>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 mt-1">
                        <Checkbox id="enable_custom_args" checked={!!appSettings.enable_custom_args} onCheckedChange={(v) => setAppSettings((prev: any) => ({ ...prev, enable_custom_args: !!v }))} />
                        <label htmlFor="enable_custom_args" className="text-sm cursor-pointer">{t('Extra encoder args')}</label>
                      </div>
                      {appSettings.enable_custom_args && (
                        <div className="flex flex-col gap-2 ml-4">
                          {[
                            { key: 'cjxl_args', label: t('cjxl args:') },
                            { key: 'avifenc_args', label: t('avifenc args:') },
                            { key: 'cjpegli_args', label: t('cjpegli args:') },
                            { key: 'im_args', label: t('ImageMagick args:') },
                          ].map(({ key, label }) => (
                            <div key={key} className="flex flex-col gap-1">
                              <label className="text-xs text-muted-foreground">{label}</label>
                              <Input value={appSettings[key] || ''} onChange={(e) => setAppSettings((prev: any) => ({ ...prev, [key]: e.target.value }))} className="h-7 text-xs font-mono" />
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-3 items-center mt-1">
                        <label className="text-sm">{t('Processing order:')}</label>
                        <Select value={appSettings.processing_order || 'Original'} onValueChange={(v) => setAppSettings((prev: any) => ({ ...prev, processing_order: v }))}>
                          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                          <SelectContent>{[t('Original'), t('Random'), t('Sequential'), t('Path Ascending'), t('Path Descending'), t('Size Ascending'), t('Size Descending')].map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" size="sm" onClick={() => {}}>{t('Start logging')}</Button>
                        <Button variant="outline" size="sm" onClick={() => {}}>{t('Open log directory')}</Button>
                        <Button variant="outline" size="sm" onClick={() => {}}>{t('Wipe log directory')}</Button>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}

          {activeTab === 4 && (
            /* ===== About ===== */
            <div className="flex flex-col items-center justify-center p-6 gap-3 h-full">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl shadow-lg mb-2">
                X
              </div>
              <h1 className="text-3xl font-light">{t('Xlchemy')}</h1>
              <Badge variant="secondary">v{constants.version || '1.2.6'}</Badge>
              <p className="text-muted-foreground">{t('High-performance image converter')}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {t('Built with Wails 3 + React + Go')}
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://codepoems.eu', '_blank')}
                >
                  {t('Website')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open('https://github.com/nicjacek/xlchemy', '_blank')}
                >
                  {t('Source')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      </div>

      {/* Bottom Bar - Progress & File List */}
      {(isConverting || fileItems.length > 0) && (
        <div className="border-t border-border bg-muted/30 px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            {/* Progress section */}
            {isConverting && (
              <div className="flex items-center gap-3 flex-1">
                <Progress value={progressPercent} className="h-2 flex-1 max-w-[200px]" />
                <span className="text-xs text-muted-foreground">
                  {progress.completed} / {progress.total}
                </span>
                <span className="text-xs truncate max-w-[200px]">{progress.line1}</span>
                <Button variant="outline" size="sm" onClick={cancelConversion}>
                  {t('Cancel')}
                </Button>
              </div>
            )}
            {/* File count */}
            {!isConverting && fileItems.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{fileItems.length} {t('file(s)')}</Badge>
                {exceptions.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setShowExceptions(true)}>
                    {t('Exceptions')} ({exceptions.length})
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exception Dialog */}
      <Dialog open={showExceptions} onOpenChange={setShowExceptions}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('Exceptions')} ({exceptions.length})</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[300px] rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left p-2 font-semibold">{t('ID')}</th>
                  <th className="text-left p-2 font-semibold">{t('Message')}</th>
                </tr>
              </thead>
              <tbody>
                {exceptions.map((exc, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="p-2">{exc.id}</td>
                    <td className="p-2 text-xs text-muted-foreground">{exc.msg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowExceptions(false);
                setExceptions([]);
              }}
            >
              {t('Close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Settings Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('Import')} {t('Settings')}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={importSettingsJson}
            onChange={(e) => setImportSettingsJson(e.target.value)}
            placeholder="Paste settings JSON here..."
            className="min-h-[200px] text-xs font-mono"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              {t('Cancel')}
            </Button>
            <Button
              onClick={() => {
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
              }}
            >
              {t('Import')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
