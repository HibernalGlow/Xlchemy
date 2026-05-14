import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { initThemeAtom, toggleThemeAtom } from '~/atom/theme';
import { progressAtom, exceptionsAtom } from '~/atom/primitive';
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
import { Sun, Moon } from 'lucide-react';

export default function App() {
  const initTheme = useSetAtom(initThemeAtom);
  const toggleTheme = useSetAtom(toggleThemeAtom);
  const progress = useAtomValue(progressAtom);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2 border-b bg-background">
        <h1 className="text-lg font-bold text-primary">Xlchemy</h1>
        <Button variant="ghost" size="icon" onClick={() => toggleTheme()}>
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
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
            <OutputTab />
          </TabsContent>
          <TabsContent value="modify" className="flex-1 overflow-hidden px-4">
            <ModifyTab />
          </TabsContent>
          <TabsContent value="settings" className="flex-1 overflow-hidden px-4">
            <SettingsTab />
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
