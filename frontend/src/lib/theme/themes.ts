// Theme definitions ported from Python themes.py

export interface ThemeColors {
  accentBig: string;
  accentSmall: string;
  font: string;
  fontDisabled: string;
  canvas: string;
  border: string;
  progressBarText: string;
  // Derived
  backgroundHover: string;
  backgroundSelected: string;
  borderFaded: string;
  canvasFaded: string;
  scrollbarHandle: string;
  scrollbarHandleHover: string;
}

export interface Theme {
  name: string;
  colors: ThemeColors;
  isDark: boolean;
}

function hexToRGBA(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha / 255})`;
}

function createDerived(base: Omit<ThemeColors, 'backgroundHover' | 'backgroundSelected' | 'borderFaded' | 'canvasFaded' | 'scrollbarHandle' | 'scrollbarHandleHover'>, isDark: boolean): ThemeColors {
  const backgroundHover = hexToRGBA(base.accentBig, 51);
  const backgroundSelected = hexToRGBA(base.accentBig, 102);
  const borderFaded = hexToRGBA(base.border, 150);
  const canvasFaded = hexToRGBA(base.canvas, 180);

  let scrollbarHandle: string;
  let scrollbarHandleHover: string;
  if (!isDark) {
    scrollbarHandle = base.border;
    scrollbarHandleHover = hexToRGBA(base.font, 166);
  } else {
    scrollbarHandle = borderFaded;
    scrollbarHandleHover = base.border;
  }

  return {
    ...base,
    backgroundHover,
    backgroundSelected,
    borderFaded,
    canvasFaded,
    scrollbarHandle,
    scrollbarHandleHover,
  };
}

export const themes: Record<string, Theme> = {
  'Miku': {
    name: 'Miku',
    isDark: true,
    colors: createDerived({
      accentBig: '#39C5BB',
      accentSmall: '#E12885',
      font: '#e9e9e9',
      fontDisabled: '#9A9A9A',
      canvas: '#141414',
      border: '#404040',
      progressBarText: '#E12885',
    }, true),
  },
  'Ralsei': {
    name: 'Ralsei',
    isDark: true,
    colors: createDerived({
      accentBig: '#00ff76',
      accentSmall: '#ff0066',
      font: '#e9e9e9',
      fontDisabled: '#9A9A9A',
      canvas: '#141414',
      border: '#404040',
      progressBarText: '#ff0066',
    }, true),
  },
  'Dark Amber': {
    name: 'Dark Amber',
    isDark: true,
    colors: createDerived({
      accentBig: '#F18000',
      accentSmall: '#F18000',
      font: '#E4E7EB',
      fontDisabled: '#A1A1A1',
      canvas: '#202124',
      border: '#3F4042',
      progressBarText: '#E4E7EB',
    }, true),
  },
  'Light Amber': {
    name: 'Light Amber',
    isDark: false,
    colors: createDerived({
      accentBig: '#F17400',
      accentSmall: '#F17400',
      font: '#404040',
      fontDisabled: '#9198A3',
      canvas: '#F8F9FA',
      border: '#D8DADE',
      progressBarText: '#404040',
    }, false),
  },
};

export const themeNames = Object.keys(themes);

export function applyTheme(name: string): Theme {
  const theme = themes[name] || themes['Miku'];
  const c = theme.colors;
  const root = document.documentElement;

  root.style.setProperty('--color-accent-big', c.accentBig);
  root.style.setProperty('--color-accent-small', c.accentSmall);
  root.style.setProperty('--color-font', c.font);
  root.style.setProperty('--color-font-disabled', c.fontDisabled);
  root.style.setProperty('--color-canvas', c.canvas);
  root.style.setProperty('--color-border', c.border);
  root.style.setProperty('--color-progress-text', c.progressBarText);
  root.style.setProperty('--color-bg-hover', c.backgroundHover);
  root.style.setProperty('--color-bg-selected', c.backgroundSelected);
  root.style.setProperty('--color-border-faded', c.borderFaded);
  root.style.setProperty('--color-canvas-faded', c.canvasFaded);
  root.style.setProperty('--color-scrollbar-handle', c.scrollbarHandle);
  root.style.setProperty('--color-scrollbar-hover', c.scrollbarHandleHover);

  return theme;
}
