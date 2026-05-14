import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useRef, useCallback } from 'react';
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
import { getAPI, onEvent } from '~/utils/api';
import { Sun, Moon, Play } from 'lucide-react';

export default function App() {
  const initTheme = useSetAtom(initThemeAtom);
  const toggleTheme = useSetAtom(toggleThemeAtom);
  const progress = useAtomValue(progressAtom);
  const files = useAtomValue(filesAtom);

  const outputTabRef = useRef<{ getSettings: () => Record<string, unknown> } | null>(null);
  const modifyTabRef = useRef<{ getSettings: () => Record<string, unknown> } | null>(null);
  const settingsTabRef = useRef<{ getSettings: () => Record<string, unknown> } | null>(null);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  // Listen for backend events
  useEffect(() => {
    const unsubProgress = onEvent('progress', (data: unknown) => {
      // handled by individual components via atom
    });
    const unsubStarted = onEvent('processing_started', () => {
      // handled by progress atom
    });
    const unsubFinished = onEvent('processing_finished', () => {
      // Could trigger sound, clear files, etc.
    });
    const unsubException = onEvent('exception', (data: unknown) => {
      // handled by exception viewer
    });

    return () => {
      unsubProgress();
      unsubStarted();
      unsubFinished();
      unsubException();
    };
  }, []);

  const handleConvert = useCallback(async () => {
    const api = getAPI();
    if (!api) return;

    const outputSettings = outputTabRef.current?.getSettings() || {};
    const modifySettings = modifyTabRef.current?.getSettings() || {};
    const settingsTabSettings = settingsTabRef.current?.getSettings() || {};
    const threadCount = (outputSettings as any).thread_count || 1;

    const check = await api.checkRequirements(outputSettings, modifySettings, settingsTabSettings);
    if (!check.allowed_to_proceed) {
      if (check.display_error) {
        alert(`${check.error_title}: ${check.error_description}`);
      }
      return;
    }

    await api.startConversion(outputSettings, modifySettings, settingsTabSettings, threadCount);
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
            <InputTab />
          </TabsContent>
          <TabsContent value="output" className="flex-1 overflow-hidden px-4">
            <OutputTab ref={outputTabRef} />
          </TabsContent>
          <TabsContent value="modify" className="flex-1 overflow-hidden px-4">
            <ModifyTab ref={modifyTabRef} />
          </TabsContent>
          <TabsContent value="settings" className="flex-1 overflow-hidden px-4">
            <SettingsTab ref={settingsTabRef} />
          </TabsContent>
          <TabsContent value="about" className="flex-1 overflow-hidden px-4">
            <AboutTab />
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
