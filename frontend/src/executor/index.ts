import type { BackendExecutor } from './types';
import { WailsExecutor } from './wailsExecutor';
import { ElectronExecutor } from './electronExecutor';
import { TauriExecutor } from './tauriExecutor';
import { PywebviewExecutor } from './pywebviewExecutor';

/** 惰性解析：每次调用时检测当前宿主环境，避免模块初始化时就缓存错误选择 */
export function getExecutor(): BackendExecutor {
  if (typeof window !== 'undefined' && !!window.pywebview?.api) {
    return new PywebviewExecutor();
  }
  return new WailsExecutor();
}

export function setExecutor(_executor: BackendExecutor): void {
  // 不再缓存，让 getExecutor 每次重新检测
}

export function getExecutorName(): string {
  if (typeof window !== 'undefined' && !!window.pywebview?.api) {
    return 'pywebview';
  }
  return 'wails';
}

export function createExecutor(name: string): BackendExecutor {
  switch (name) {
    case 'wails':
      return new WailsExecutor();
    case 'electron':
      return new ElectronExecutor();
    case 'tauri':
      return new TauriExecutor();
    case 'pywebview':
      return new PywebviewExecutor();
    default:
      throw new Error(`Unknown executor: ${name}`);
  }
}

export * from './types';
