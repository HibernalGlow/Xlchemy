import type { BackgroundMode, BackgroundSettings } from '$lib/domain';
import { DEFAULT_BACKGROUND_SETTINGS } from '$lib/domain';

const BG_KEY = 'xlchemy-bg';

export type { BackgroundMode, BackgroundSettings };

export function loadBackgroundSettings(): BackgroundSettings {
  try {
    const raw = localStorage.getItem(BG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_BACKGROUND_SETTINGS, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_BACKGROUND_SETTINGS };
}

export function saveBackgroundSettings(settings: BackgroundSettings): void {
  try {
    localStorage.setItem(BG_KEY, JSON.stringify(settings));
  } catch {}
}

export function applyBackgroundCSS(settings: BackgroundSettings): void {
  const root = document.documentElement;
  root.style.setProperty('--bg-mode', settings.mode === 'image' ? '1' : '0');
  root.style.setProperty('--bg-image-opacity', String(settings.opacity / 100));
  root.style.setProperty('--bg-image-blur', `${settings.blur}px`);

  if (settings.mode === 'image' && settings.imageUrl) {
    root.style.setProperty('--bg-image-url', `url("${settings.imageUrl}")`);
  } else {
    root.style.setProperty('--bg-image-url', 'none');
  }
}

export function initBackground(): BackgroundSettings {
  const settings = loadBackgroundSettings();
  applyBackgroundCSS(settings);
  return settings;
}
