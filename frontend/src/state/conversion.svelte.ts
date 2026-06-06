import { appState } from './app.svelte';
import { getExecutor } from '$lib/executor';
import type { DomainEvent } from '$lib/domain';

export function initConversionEvents() {
  const executor = getExecutor();
  let elapsedTimer: ReturnType<typeof setInterval> | null = null;

  const unsubscribe = executor.subscribeEvents((event: DomainEvent) => {
    switch (event.type) {
      case 'run_started':
        appState.isConverting = true;
        appState.exceptions = [];
        appState.progress = { completed: 0, total: event.totalTasks, line1: 'Starting...', line2: '' };
        appState.conversionStartTime = Date.now();
        appState.conversionElapsed = 0;
        appState.addLog('info', `Conversion started: ${event.totalTasks} tasks`);
        // Start elapsed timer
        if (elapsedTimer) clearInterval(elapsedTimer);
        elapsedTimer = setInterval(() => {
          if (appState.isConverting) {
            appState.conversionElapsed = Date.now() - appState.conversionStartTime;
          }
        }, 500);
        break;

      case 'task_progress':
        appState.progress = {
          completed: event.completed,
          total: event.total,
          line1: event.line1,
          line2: event.line2,
        };
        break;

      case 'task_succeeded':
        // Individual task success - progress already updated
        break;

      case 'task_failed':
        appState.exceptions = [
          ...appState.exceptions,
          { id: event.errorId, msg: event.errorMsg, path: event.inputPath },
        ];
        appState.addLog('error', `[${event.errorId}] ${event.errorMsg}`);
        break;

      case 'run_finished':
        appState.isConverting = false;
        appState.conversionElapsed = Date.now() - appState.conversionStartTime;
        if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null; }
        appState.addLog('success', `Conversion finished: ${event.completedCount} succeeded, ${event.failedCount} failed`);
        if (appState.exceptions.length > 0) {
          appState.showExceptions = true;
        }
        break;

      case 'run_canceled':
        appState.isConverting = false;
        if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null; }
        appState.addLog('warn', 'Conversion canceled');
        break;

      case 'files_dropped':
        // Handled by appState file drop listener
        break;
    }
  });

  return () => {
    unsubscribe();
    if (elapsedTimer) clearInterval(elapsedTimer);
  };
}
