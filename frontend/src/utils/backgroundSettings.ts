/**
 * Background Settings — neoview-style background image support.
 * Replaces the default dot-grid with a configurable background image
 * that supports opacity and blur controls.
 */

export type BackgroundMode = 'dot-grid' | 'image' | 'none';

export interface BackgroundSettings {
  mode: BackgroundMode;
  imageUrl: string;
  opacity: number;   // 0–100
  blur: number;      // 0–30 px
}

const BG_KEY = 'xlchemy-bg';

const DEFAULTS: BackgroundSettings = {
  mode: 'dot-grid',
  imageUrl: '',
  opacity: 40,
  blur: 0,
};

// --- Persistence ---

export function loadBackgroundSettings(): BackgroundSettings {
  try {
    const raw = localStorage.getItem(BG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULTS, ...parsed };
    }
  } catch {}
  return { ...DEFAULTS };
}

export function saveBackgroundSettings(settings: BackgroundSettings): void {
  try {
    localStorage.setItem(BG_KEY, JSON.stringify(settings));
  } catch {}
}

// --- CSS Application ---

/**
 * Apply background settings to the workspace element via CSS variables.
 * The `.canvas-bg` class reads these variables.
 */
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

/** Load + apply on startup */
export function initBackground(): BackgroundSettings {
  const settings = loadBackgroundSettings();
  applyBackgroundCSS(settings);
  return settings;
}
