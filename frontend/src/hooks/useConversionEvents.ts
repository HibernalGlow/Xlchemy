import { Events } from '@wailsio/runtime';
import { useEffect } from 'react';

export interface ConversionEventCallbacks {
  onProgress: (data: any) => void;
  onException: (data: any) => void;
  onFinished: () => void;
  onCanceled: () => void;
  onStarted: () => void;
  onFilesDropped: (files: string[]) => void;
}

export function useConversionEvents(callbacks: ConversionEventCallbacks): void {
  useEffect(() => {
    Events.On('conversion:progress', (data: any) => {
      callbacks.onProgress(data.data);
    });
    Events.On('conversion:exception', (data: any) => {
      callbacks.onException(data.data);
    });
    Events.On('conversion:finished', () => {
      callbacks.onFinished();
    });
    Events.On('conversion:canceled', () => {
      callbacks.onCanceled();
    });
    Events.On('conversion:started', () => {
      callbacks.onStarted();
    });
  }, [callbacks]);

  useEffect(() => {
    const unsubscribe = Events.On('files-dropped', (event: any) => {
      const files = event?.data?.files || [];
      if (files.length > 0) {
        callbacks.onFilesDropped(files);
      }
    });
    return unsubscribe;
  }, [callbacks]);
}
