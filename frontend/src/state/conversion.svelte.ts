import { appState } from './app.svelte';
import { getExecutor } from '$lib/executor';
import type { DomainEvent } from '$lib/domain';

export function initConversionEvents() {
  const executor = getExecutor();
  let elapsedTimer: ReturnType<typeof setInterval> | null = null;
  let lastLoggedCompleted = 0;

  const unsubscribe = executor.subscribeEvents((event: DomainEvent) => {
    switch (event.type) {
      case 'run_started':
        appState.isConverting = true;
        appState.exceptions = [];
        appState.progress = { completed: 0, total: event.totalTasks, line1: 'Starting...', line2: '' };
        appState.conversionStartTime = Date.now();
        appState.conversionElapsed = 0;
        appState.conversionResults = [];
        lastLoggedCompleted = 0;
        // Snapshot current file paths for clear-completed
        appState.conversionFilePaths = new Set(appState.fileItems.map((item) => item.absPath));
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
        // Log each completed file (detected by completed count increase)
        if (event.completed > lastLoggedCompleted && event.line1) {
          const fileName = event.line1.includes(' : ')
            ? event.line1.slice(0, event.line1.indexOf(' : '))
            : event.line1;
          const sizeInfo = event.line1.includes(' : ')
            ? event.line1.slice(event.line1.indexOf(' : ') + 3)
            : '';
          if (!event.line1.startsWith('Converted ') && !event.line1.startsWith('Starting')) {
            appState.addLog('success', `${fileName}${sizeInfo ? ` \u2014 ${sizeInfo}` : ''}`);
          }
          lastLoggedCompleted = event.completed;
        }
        break;

      case 'task_succeeded':
        // Track conversion result for analytics
        {
          const inputExt = event.inputPath?.split('.').pop()?.toLowerCase() || '';
          appState.conversionResults = [
            ...appState.conversionResults,
            { inputExt, srcSize: event.srcSize, dstSize: event.dstSize },
          ];
        }
        break;

      case 'task_failed':
        appState.exceptions = [
          ...appState.exceptions,
          { id: event.errorId, msg: event.errorMsg, path: event.inputPath },
        ];
        appState.addLog('error', `[${event.errorId}] ${event.inputPath ? event.inputPath.split(/[\\/]/).pop() + ' \u2014 ' : ''}${event.errorMsg}`);
        break;

      case 'run_finished':
        appState.isConverting = false;
        appState.conversionElapsed = Date.now() - appState.conversionStartTime;
        if (elapsedTimer) { clearInterval(elapsedTimer); elapsedTimer = null; }
        appState.addLog('success', `Conversion finished: ${event.completedCount} succeeded, ${event.failedCount} failed`);
        // Auto-clear completed items if setting is enabled
        if (appState.appSettings.auto_clear_completed) {
          appState.clearCompleted();
        }
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
