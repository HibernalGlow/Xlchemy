import { appState } from './app.svelte';
import { backend } from '$lib/backend';

export function initConversionEvents() {
  const unsubProgress = backend.onProgress((data: any) => {
    appState.progress = data;
  });
  const unsubException = backend.onException((data: any) => {
    appState.exceptions = [...appState.exceptions, data];
  });
  const unsubFinished = backend.onFinished(() => {
    appState.isConverting = false;
    if (appState.exceptions.length > 0) appState.showExceptions = true;
  });
  const unsubCanceled = backend.onCanceled(() => {
    appState.isConverting = false;
  });
  const unsubStarted = backend.onStarted(() => {
    appState.exceptions = [];
  });
  const unsubFilesDropped = backend.onFilesDropped(async (files: string[]) => {
    if (files.length > 0 && !appState.isConverting) {
      try {
        const result = await backend.addFiles(files);
        appState.addFileItems(result);
      } catch (e) {
        console.error('File drop error:', e);
      }
    }
  });

  return () => {
    unsubProgress?.();
    unsubException?.();
    unsubFinished?.();
    unsubCanceled?.();
    unsubStarted?.();
    unsubFilesDropped?.();
  };
}
