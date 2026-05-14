import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useRef, useCallback, useState } from 'react';
import { initThemeAtom, toggleThemeAtom } from '~/atom/theme';
import { progressAtom, exceptionsAtom, filesAtom } from '~/atom/primitive';
import { Button } from '~/components/shadcn/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/shadcn/tabs';
import { Toaster } from '~/components/shadcn/sonner';
import { InputTab } from '~/views/input-tab';
import { OutputTab } from '~/views/output-tab';
import { ModifyTab } from '~/views/modify-tab';
import { SettingsTab } from '~/views/settings-tab';
import { AboutTab } from '~/views/about-tab';
import { ProgressDialog } from '~/views/progress-dialog';
import { ExceptionViewer } from '~/views/exception-viewer';
import { getAPI, isPyWebView, onEvent } from '~/utils/api';
import { DEFAULT_ALLOWED_INPUT } from '~/consts';
import { getDefaultGeneralSettings, getDefaultInputSettings, getDefaultModifySettings, getDefaultOutputSettings } from '~/utils/defaults';
import type { AppSettingsPayload, GeneralSettings, InputSettings, ModifySettings, OutputSettings } from '~/types';
import { Sun, Moon, Play } from 'lucide-react';
import { toast } from 'sonner';

export default function App() {
  const initTheme = useSetAtom(initThemeAtom);
  const toggleTheme = useSetAtom(toggleThemeAtom);
  const progress = useAtomValue(progressAtom);
  const files = useAtomValue(filesAtom);
  const setFiles = useSetAtom(filesAtom);
  const setProgress = useSetAtom(progressAtom);
  const setExceptions = useSetAtom(exceptionsAtom);

  const [allowedInput, setAllowedInput] = useState<string[]>([...DEFAULT_ALLOWED_INPUT]);
  const [inputSettings, setInputSettings] = useState<InputSettings>(getDefaultInputSettings());
  const [outputState, setOutputState] = useState<OutputSettings>(getDefaultOutputSettings(1));
  const [modifyState, setModifyState] = useState<ModifySettings>(getDefaultModifySettings());
  const [settingsState, setSettingsState] = useState<GeneralSettings>(getDefaultGeneralSettings());
  const [appInfo, setAppInfo] = useState<AppSettingsPayload | null>(null);

  const outputTabRef = useRef<{ getSettings: () => OutputSettings } | null>(null);
  const modifyTabRef = useRef<{ getSettings: () => ModifySettings } | null>(null);
  const settingsTabRef = useRef<{ getSettings: () => GeneralSettings } | null>(null);
  const inputTabRef = useRef<{ getState: () => InputSettings } | null>(null);

  const outputStateRef = useRef(outputState);
  const settingsStateRef = useRef(settingsState);
  const filesRef = useRef(files);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  useEffect(() => {
    const api = getAPI();
    if (!api) {
      const maxThreads = navigator.hardwareConcurrency || 1;
      setOutputState(getDefaultOutputSettings(maxThreads));
      setModifyState(getDefaultModifySettings());
      setSettingsState(getDefaultGeneralSettings());
      setInputSettings(getDefaultInputSettings());
      return;
    }

    api.getSettings().then((payload) => {
      setAppInfo(payload);
      setAllowedInput(payload.allowed_input && payload.allowed_input.length > 0 ? payload.allowed_input : [...DEFAULT_ALLOWED_INPUT]);
      setInputSettings(payload.input || getDefaultInputSettings());
      setOutputState(payload.output || getDefaultOutputSettings(payload.max_threads || 1));
      setModifyState(payload.modify || getDefaultModifySettings());
      setSettingsState(payload.settings || getDefaultGeneralSettings());
    }).catch(() => {
      const maxThreads = navigator.hardwareConcurrency || 1;
      setOutputState(getDefaultOutputSettings(maxThreads));
      setModifyState(getDefaultModifySettings());
      setSettingsState(getDefaultGeneralSettings());
      setInputSettings(getDefaultInputSettings());
    });

    api.getFiles().then((data) => {
      if (Array.isArray(data)) {
        setFiles(data);
      }
    }).catch(() => {});
  }, [setFiles]);

  useEffect(() => {
    outputStateRef.current = outputState;
  }, [outputState]);

  useEffect(() => {
    settingsStateRef.current = settingsState;
  }, [settingsState]);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const playFinishSound = useCallback((volume: number) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.value = Math.max(0, Math.min(1, volume));
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.2);
    } catch {
      // Ignore audio failures
    }
  }, []);

  // Listen for backend events
  useEffect(() => {
    const unsubProgress = onEvent('progress', (data: unknown) => {
      if (!data || typeof data !== 'object') return;
      const payload = data as { line1?: string; line2?: string; value?: number };
      setProgress((prev) => ({
        ...prev,
        line1: typeof payload.line1 === 'string' ? payload.line1 : prev.line1,
        line2: typeof payload.line2 === 'string' ? payload.line2 : prev.line2,
        value: typeof payload.value === 'number' ? payload.value : prev.value,
      }));
    });
    const unsubStarted = onEvent('processing_started', () => {
      setExceptions([]);
      setProgress((prev) => ({
        ...prev,
        isProcessing: true,
        value: 0,
        maximum: Math.max(filesRef.current.length, 1),
      }));
    });
    const unsubFinished = onEvent('processing_finished', () => {
      setProgress((prev) => ({
        ...prev,
        isProcessing: false,
      }));

      if (outputStateRef.current.clear_after_conv) {
        const api = getAPI();
        if (api) {
          api.clearFiles().then(() => setFiles([])).catch(() => setFiles([]));
        } else {
          setFiles([]);
        }
      }

      if (settingsStateRef.current.play_sound_on_finish) {
        playFinishSound(settingsStateRef.current.play_sound_on_finish_vol);
      }
    });
    const unsubException = onEvent('exception', (data: unknown) => {
      if (!data || typeof data !== 'object') return;
      const payload = data as { title?: string; description?: string; path?: string };
      if (!payload.title && !payload.description) return;
      setExceptions((prev) => [
        ...prev,
        {
          title: payload.title || 'Error',
          description: payload.description || '',
          path: payload.path || '',
        },
      ]);
    });
    const unsubFilesUpdated = onEvent('files_updated', (data: unknown) => {
      if (Array.isArray(data)) {
        setFiles(data);
      }
    });

    return () => {
      unsubProgress();
      unsubStarted();
      unsubFinished();
      unsubException();
      unsubFilesUpdated();
    };
  }, [setProgress, setExceptions, setFiles, playFinishSound]);

  useEffect(() => {
    if (!isPyWebView()) return;
    const api = getAPI();
    if (!api) return;

    const handle = window.setTimeout(() => {
      const inputState = inputTabRef.current?.getState() || inputSettings;
      api.saveSettings({
        input: inputState,
        output: outputStateRef.current,
        modify: modifyState,
        settings: settingsStateRef.current,
      }).catch(() => {});
    }, 400);

    return () => window.clearTimeout(handle);
  }, [inputSettings, modifyState, outputState, settingsState]);

  const handleConvert = useCallback(async () => {
    const api = getAPI();
    if (!api) return;

    const outputSettings = (outputTabRef.current?.getSettings() as OutputSettings) || outputStateRef.current;
    const modifySettings = (modifyTabRef.current?.getSettings() as ModifySettings) || modifyState;
    const settingsTabSettings = (settingsTabRef.current?.getSettings() as GeneralSettings) || settingsStateRef.current;
    const threadCount = outputSettings.thread_count || 1;

    setProgress((prev) => ({
      ...prev,
      isProcessing: true,
      value: 0,
      maximum: Math.max(filesRef.current.length, 1),
    }));

    const check = await api.checkRequirements(outputSettings, modifySettings, settingsTabSettings);
    if (!check.allowed_to_proceed) {
      if (check.display_error) {
        toast.error(check.error_title, { description: check.error_description });
      }
      setProgress((prev) => ({ ...prev, isProcessing: false }));
      return;
    }

    await api.startConversion(outputSettings, modifySettings, settingsTabSettings, threadCount);
  }, [setProgress, modifyState]);

  const handleInputSettingsChange = useCallback((next: InputSettings) => {
    setInputSettings(next);
  }, []);

  const handleOutputSettingsChange = useCallback((next: OutputSettings) => {
    setOutputState(next);
  }, []);

  const handleModifySettingsChange = useCallback((next: ModifySettings) => {
    setModifyState(next);
  }, []);

  const handleSettingsChange = useCallback((next: GeneralSettings) => {
    setSettingsState(next);
  }, []);

  const isProcessing = progress.isProcessing;
  const hasFiles = files.length > 0;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <h1 className="text-lg font-bold text-primary">Xlchemy</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleConvert}
            disabled={isProcessing || !hasFiles}
          >
            <Play className="h-4 w-4 mr-1" />
            Convert
          </Button>
          <Button variant="ghost" size="icon" onClick={() => toggleTheme()}>
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <Tabs defaultValue="input" className="h-full flex flex-col">
          <TabsList className="mx-4 mt-2 w-auto self-start">
            <TabsTrigger value="input">Input</TabsTrigger>
            <TabsTrigger value="output">Output</TabsTrigger>
            <TabsTrigger value="modify">Modify</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="input" className="flex-1 overflow-hidden px-4">
            <InputTab
              ref={inputTabRef}
              allowedFormats={allowedInput}
              excludedFormats={inputSettings.excluded_formats}
              processingOrder={settingsState.processing_order}
              sortingDisabled={settingsState.sorting_disabled}
              onExcludedFormatsChange={(excluded) =>
                handleInputSettingsChange({
                  ...inputSettings,
                  excluded_formats: excluded,
                })
              }
              onProcessingOrderChange={(order) =>
                handleSettingsChange({
                  ...settingsState,
                  processing_order: order,
                })
              }
            />
          </TabsContent>
          <TabsContent value="output" className="flex-1 overflow-hidden px-4">
            <OutputTab
              ref={outputTabRef}
              initialSettings={outputState}
              settings={settingsState}
              maxThreads={appInfo?.max_threads || outputState.thread_count}
              onSettingsChange={handleOutputSettingsChange}
            />
          </TabsContent>
          <TabsContent value="modify" className="flex-1 overflow-hidden px-4">
            <ModifyTab
              ref={modifyTabRef}
              initialSettings={modifyState}
              fileFormat={outputState.format}
              customResamplingEnabled={settingsState.custom_resampling}
              onSettingsChange={handleModifySettingsChange}
            />
          </TabsContent>
          <TabsContent value="settings" className="flex-1 overflow-hidden px-4">
            <SettingsTab
              ref={settingsTabRef}
              initialSettings={settingsState}
              loggingEnabled={appInfo?.logging_enabled ?? false}
              onSettingsChange={handleSettingsChange}
              onLoggingChanged={(enabled) =>
                setAppInfo((prev) => (prev ? { ...prev, logging_enabled: enabled } : prev))
              }
            />
          </TabsContent>
          <TabsContent value="about" className="flex-1 overflow-hidden px-4">
            <AboutTab
              version={appInfo?.version || '1.2.4'}
              licensePath={appInfo?.license_path}
              licenseThirdPartyPath={appInfo?.license_3rd_party_path}
            />
          </TabsContent>
        </Tabs>
      </main>

      <ProgressDialog
        open={progress.isProcessing}
        line1={progress.line1}
        line2={progress.line2}
        value={progress.value}
        maximum={progress.maximum}
      />
      <ExceptionViewer />
      <Toaster />
    </div>
  );
}
