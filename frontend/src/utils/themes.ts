/**
 * Xlchemy Theme System — oklch-based, following neoview's theme architecture.
 * Each theme defines light & dark color variants using shadcn CSS variables.
 */

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeColorsVariant = Record<string, string>;

export interface ThemeConfig {
  name: string;
  description: string;
  isDark: boolean;
  colors: {
    light: ThemeColorsVariant;
    dark: ThemeColorsVariant;
  };
}

export interface CustomThemeConfig {
  name: string;
  description: string;
  colors: {
    light: ThemeColorsVariant;
    dark: ThemeColorsVariant;
  };
}

// --- localStorage keys ---
const THEME_KEY = 'xlchemy-theme';
const THEME_MODE_KEY = 'xlchemy-theme-mode';
const CUSTOM_THEMES_KEY = 'xlchemy-custom-themes';

// --- Preset themes ---
export const presetThemes: ThemeConfig[] = [
  {
    name: 'Miku',
    description: 'Cyan & magenta dark theme',
    isDark: true,
    colors: {
      light: {
        primary: 'oklch(0.7684 0.1370 182.83)',
        'primary-foreground': 'oklch(0.145 0.005 0)',
        accent: 'oklch(0.6013 0.2200 348.53)',
        'accent-foreground': 'oklch(0.98 0 0)',
        background: 'oklch(0.97 0 0)',
        foreground: 'oklch(0.2 0 0)',
        card: 'oklch(0.97 0 0)',
        'card-foreground': 'oklch(0.2 0 0)',
        popover: 'oklch(0.97 0 0)',
        'popover-foreground': 'oklch(0.2 0 0)',
        secondary: 'oklch(0.93 0.005 182.83)',
        'secondary-foreground': 'oklch(0.2 0 0)',
        muted: 'oklch(0.93 0 0)',
        'muted-foreground': 'oklch(0.5 0 0)',
        destructive: 'oklch(0.577 0.245 27.325)',
        border: 'oklch(0.88 0 0)',
        input: 'oklch(0.88 0 0)',
        ring: 'oklch(0.7684 0.1370 182.83)',
        'progress-text': 'oklch(0.6013 0.2200 348.53)',
        'sidebar-background': 'oklch(0.96 0.003 182.83)',
        'sidebar-foreground': 'oklch(0.2 0 0)',
        'sidebar-primary': 'oklch(0.7684 0.1370 182.83)',
        'sidebar-primary-foreground': 'oklch(0.145 0.005 0)',
        'sidebar-accent': 'oklch(0.93 0.005 182.83)',
        'sidebar-accent-foreground': 'oklch(0.2 0 0)',
        'sidebar-border': 'oklch(0.88 0 0)',
        'sidebar-ring': 'oklch(0.7684 0.1370 182.83)',
      },
      dark: {
        primary: 'oklch(0.7684 0.1370 182.83)',
        'primary-foreground': 'oklch(0.145 0.005 0)',
        accent: 'oklch(0.6013 0.2200 348.53)',
        'accent-foreground': 'oklch(0.92 0 0)',
        background: 'oklch(0.145 0.005 0)',
        foreground: 'oklch(0.92 0 0)',
        card: 'oklch(0.17 0.005 0)',
        'card-foreground': 'oklch(0.92 0 0)',
        popover: 'oklch(0.17 0.005 0)',
        'popover-foreground': 'oklch(0.92 0 0)',
        secondary: 'oklch(0.25 0.01 0)',
        'secondary-foreground': 'oklch(0.92 0 0)',
        muted: 'oklch(0.25 0.01 0)',
        'muted-foreground': 'oklch(0.65 0 0)',
        destructive: 'oklch(0.704 0.191 22.216)',
        border: 'oklch(0.32 0.01 0)',
        input: 'oklch(0.32 0.01 0)',
        ring: 'oklch(0.7684 0.1370 182.83)',
        'progress-text': 'oklch(0.6013 0.2200 348.53)',
        'sidebar-background': 'oklch(0.13 0.005 0)',
        'sidebar-foreground': 'oklch(0.92 0 0)',
        'sidebar-primary': 'oklch(0.7684 0.1370 182.83)',
        'sidebar-primary-foreground': 'oklch(0.145 0.005 0)',
        'sidebar-accent': 'oklch(0.22 0.01 0)',
        'sidebar-accent-foreground': 'oklch(0.92 0 0)',
        'sidebar-border': 'oklch(0.28 0.01 0)',
        'sidebar-ring': 'oklch(0.7684 0.1370 182.83)',
      },
    },
  },
  {
    name: 'Ralsei',
    description: 'Green & pink dark theme',
    isDark: true,
    colors: {
      light: {
        primary: 'oklch(0.8200 0.1800 155.00)',
        'primary-foreground': 'oklch(0.145 0.005 0)',
        accent: 'oklch(0.6013 0.2400 355.00)',
        'accent-foreground': 'oklch(0.98 0 0)',
        background: 'oklch(0.97 0 0)',
        foreground: 'oklch(0.2 0 0)',
        card: 'oklch(0.97 0 0)',
        'card-foreground': 'oklch(0.2 0 0)',
        popover: 'oklch(0.97 0 0)',
        'popover-foreground': 'oklch(0.2 0 0)',
        secondary: 'oklch(0.93 0.005 155.00)',
        'secondary-foreground': 'oklch(0.2 0 0)',
        muted: 'oklch(0.93 0 0)',
        'muted-foreground': 'oklch(0.5 0 0)',
        destructive: 'oklch(0.577 0.245 27.325)',
        border: 'oklch(0.88 0 0)',
        input: 'oklch(0.88 0 0)',
        ring: 'oklch(0.8200 0.1800 155.00)',
        'progress-text': 'oklch(0.6013 0.2400 355.00)',
        'sidebar-background': 'oklch(0.96 0.003 155.00)',
        'sidebar-foreground': 'oklch(0.2 0 0)',
        'sidebar-primary': 'oklch(0.8200 0.1800 155.00)',
        'sidebar-primary-foreground': 'oklch(0.145 0.005 0)',
        'sidebar-accent': 'oklch(0.93 0.005 155.00)',
        'sidebar-accent-foreground': 'oklch(0.2 0 0)',
        'sidebar-border': 'oklch(0.88 0 0)',
        'sidebar-ring': 'oklch(0.8200 0.1800 155.00)',
      },
      dark: {
        primary: 'oklch(0.8200 0.1800 155.00)',
        'primary-foreground': 'oklch(0.145 0.005 0)',
        accent: 'oklch(0.6013 0.2400 355.00)',
        'accent-foreground': 'oklch(0.92 0 0)',
        background: 'oklch(0.145 0.005 0)',
        foreground: 'oklch(0.92 0 0)',
        card: 'oklch(0.17 0.005 0)',
        'card-foreground': 'oklch(0.92 0 0)',
        popover: 'oklch(0.17 0.005 0)',
        'popover-foreground': 'oklch(0.92 0 0)',
        secondary: 'oklch(0.25 0.01 0)',
        'secondary-foreground': 'oklch(0.92 0 0)',
        muted: 'oklch(0.25 0.01 0)',
        'muted-foreground': 'oklch(0.65 0 0)',
        destructive: 'oklch(0.704 0.191 22.216)',
        border: 'oklch(0.32 0.01 0)',
        input: 'oklch(0.32 0.01 0)',
        ring: 'oklch(0.8200 0.1800 155.00)',
        'progress-text': 'oklch(0.6013 0.2400 355.00)',
        'sidebar-background': 'oklch(0.13 0.005 0)',
        'sidebar-foreground': 'oklch(0.92 0 0)',
        'sidebar-primary': 'oklch(0.8200 0.1800 155.00)',
        'sidebar-primary-foreground': 'oklch(0.145 0.005 0)',
        'sidebar-accent': 'oklch(0.22 0.01 0)',
        'sidebar-accent-foreground': 'oklch(0.92 0 0)',
        'sidebar-border': 'oklch(0.28 0.01 0)',
        'sidebar-ring': 'oklch(0.8200 0.1800 155.00)',
      },
    },
  },
  {
    name: 'Dark Amber',
    description: 'Warm amber dark theme',
    isDark: true,
    colors: {
      light: {
        primary: 'oklch(0.7053 0.1663 61.00)',
        'primary-foreground': 'oklch(0.145 0.005 0)',
        accent: 'oklch(0.7053 0.1663 61.00)',
        'accent-foreground': 'oklch(0.98 0 0)',
        background: 'oklch(0.97 0 0)',
        foreground: 'oklch(0.25 0 0)',
        card: 'oklch(0.97 0 0)',
        'card-foreground': 'oklch(0.25 0 0)',
        popover: 'oklch(0.97 0 0)',
        'popover-foreground': 'oklch(0.25 0 0)',
        secondary: 'oklch(0.93 0.01 61.00)',
        'secondary-foreground': 'oklch(0.25 0 0)',
        muted: 'oklch(0.93 0 0)',
        'muted-foreground': 'oklch(0.5 0 0)',
        destructive: 'oklch(0.577 0.245 27.325)',
        border: 'oklch(0.88 0 0)',
        input: 'oklch(0.88 0 0)',
        ring: 'oklch(0.7053 0.1663 61.00)',
        'progress-text': 'oklch(0.9 0.02 61.00)',
        'sidebar-background': 'oklch(0.96 0.005 61.00)',
        'sidebar-foreground': 'oklch(0.25 0 0)',
        'sidebar-primary': 'oklch(0.7053 0.1663 61.00)',
        'sidebar-primary-foreground': 'oklch(0.145 0.005 0)',
        'sidebar-accent': 'oklch(0.93 0.01 61.00)',
        'sidebar-accent-foreground': 'oklch(0.25 0 0)',
        'sidebar-border': 'oklch(0.88 0 0)',
        'sidebar-ring': 'oklch(0.7053 0.1663 61.00)',
      },
      dark: {
        primary: 'oklch(0.7053 0.1663 61.00)',
        'primary-foreground': 'oklch(0.145 0.005 0)',
        accent: 'oklch(0.7053 0.1663 61.00)',
        'accent-foreground': 'oklch(0.92 0 0)',
        background: 'oklch(0.19 0.005 61.00)',
        foreground: 'oklch(0.91 0.01 240.00)',
        card: 'oklch(0.22 0.005 61.00)',
        'card-foreground': 'oklch(0.91 0.01 240.00)',
        popover: 'oklch(0.22 0.005 61.00)',
        'popover-foreground': 'oklch(0.91 0.01 240.00)',
        secondary: 'oklch(0.27 0.01 61.00)',
        'secondary-foreground': 'oklch(0.92 0 0)',
        muted: 'oklch(0.27 0.01 61.00)',
        'muted-foreground': 'oklch(0.65 0 0)',
        destructive: 'oklch(0.704 0.191 22.216)',
        border: 'oklch(0.33 0.01 61.00)',
        input: 'oklch(0.33 0.01 61.00)',
        ring: 'oklch(0.7053 0.1663 61.00)',
        'progress-text': 'oklch(0.91 0.01 240.00)',
        'sidebar-background': 'oklch(0.17 0.005 61.00)',
        'sidebar-foreground': 'oklch(0.91 0.01 240.00)',
        'sidebar-primary': 'oklch(0.7053 0.1663 61.00)',
        'sidebar-primary-foreground': 'oklch(0.145 0.005 0)',
        'sidebar-accent': 'oklch(0.25 0.01 61.00)',
        'sidebar-accent-foreground': 'oklch(0.91 0.01 240.00)',
        'sidebar-border': 'oklch(0.29 0.01 61.00)',
        'sidebar-ring': 'oklch(0.7053 0.1663 61.00)',
      },
    },
  },
  {
    name: 'Light Amber',
    description: 'Warm amber light theme',
    isDark: false,
    colors: {
      light: {
        primary: 'oklch(0.6553 0.1763 58.00)',
        'primary-foreground': 'oklch(0.98 0 0)',
        accent: 'oklch(0.6553 0.1763 58.00)',
        'accent-foreground': 'oklch(0.98 0 0)',
        background: 'oklch(0.975 0.003 70.00)',
        foreground: 'oklch(0.32 0.01 0)',
        card: 'oklch(0.99 0 0)',
        'card-foreground': 'oklch(0.32 0.01 0)',
        popover: 'oklch(0.99 0 0)',
        'popover-foreground': 'oklch(0.32 0.01 0)',
        secondary: 'oklch(0.94 0.005 58.00)',
        'secondary-foreground': 'oklch(0.32 0.01 0)',
        muted: 'oklch(0.94 0 0)',
        'muted-foreground': 'oklch(0.55 0 0)',
        destructive: 'oklch(0.577 0.245 27.325)',
        border: 'oklch(0.88 0.005 70.00)',
        input: 'oklch(0.88 0.005 70.00)',
        ring: 'oklch(0.6553 0.1763 58.00)',
        'progress-text': 'oklch(0.32 0.01 0)',
        'sidebar-background': 'oklch(0.965 0.005 70.00)',
        'sidebar-foreground': 'oklch(0.32 0.01 0)',
        'sidebar-primary': 'oklch(0.6553 0.1763 58.00)',
        'sidebar-primary-foreground': 'oklch(0.98 0 0)',
        'sidebar-accent': 'oklch(0.94 0.005 58.00)',
        'sidebar-accent-foreground': 'oklch(0.32 0.01 0)',
        'sidebar-border': 'oklch(0.88 0.005 70.00)',
        'sidebar-ring': 'oklch(0.6553 0.1763 58.00)',
      },
      dark: {
        primary: 'oklch(0.6553 0.1763 58.00)',
        'primary-foreground': 'oklch(0.98 0 0)',
        accent: 'oklch(0.6553 0.1763 58.00)',
        'accent-foreground': 'oklch(0.92 0 0)',
        background: 'oklch(0.19 0.005 58.00)',
        foreground: 'oklch(0.92 0 0)',
        card: 'oklch(0.22 0.005 58.00)',
        'card-foreground': 'oklch(0.92 0 0)',
        popover: 'oklch(0.22 0.005 58.00)',
        'popover-foreground': 'oklch(0.92 0 0)',
        secondary: 'oklch(0.27 0.01 58.00)',
        'secondary-foreground': 'oklch(0.92 0 0)',
        muted: 'oklch(0.27 0.01 58.00)',
        'muted-foreground': 'oklch(0.65 0 0)',
        destructive: 'oklch(0.704 0.191 22.216)',
        border: 'oklch(0.33 0.01 58.00)',
        input: 'oklch(0.33 0.01 58.00)',
        ring: 'oklch(0.6553 0.1763 58.00)',
        'progress-text': 'oklch(0.92 0 0)',
        'sidebar-background': 'oklch(0.17 0.005 58.00)',
        'sidebar-foreground': 'oklch(0.92 0 0)',
        'sidebar-primary': 'oklch(0.6553 0.1763 58.00)',
        'sidebar-primary-foreground': 'oklch(0.98 0 0)',
        'sidebar-accent': 'oklch(0.25 0.01 58.00)',
        'sidebar-accent-foreground': 'oklch(0.92 0 0)',
        'sidebar-border': 'oklch(0.29 0.01 58.00)',
        'sidebar-ring': 'oklch(0.6553 0.1763 58.00)',
      },
    },
  },
];

export const themeNames = presetThemes.map((t) => t.name);

// --- Theme Mode ---

export function getThemeMode(): ThemeMode {
  try {
    return (localStorage.getItem(THEME_MODE_KEY) as ThemeMode) || 'dark';
  } catch {
    return 'dark';
  }
}

export function setThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_MODE_KEY, mode);
  } catch {}
}

export function isSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Resolve the effective mode (system → light/dark) */
export function resolveEffectiveMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return isSystemDark() ? 'dark' : 'light';
  return mode;
}

// --- Custom Themes CRUD ---

export function getCustomThemes(): CustomThemeConfig[] {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomTheme(theme: CustomThemeConfig): void {
  const themes = getCustomThemes();
  const idx = themes.findIndex((t) => t.name === theme.name);
  if (idx >= 0) {
    themes[idx] = theme;
  } else {
    themes.push(theme);
  }
  try {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
  } catch {}
}

export function deleteCustomTheme(name: string): void {
  const themes = getCustomThemes().filter((t) => t.name !== name);
  try {
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
  } catch {}
}

// --- Apply Theme ---

/** Apply CSS variables from a color variant to the document root */
function applyColorVariant(colors: ThemeColorsVariant): void {
  const root = document.documentElement;

  // Sidebar fallback mapping: if sidebar vars not defined, use base vars
  const sidebarFallbacks: Record<string, string> = {
    'sidebar-background': 'background',
    'sidebar-foreground': 'foreground',
    'sidebar-primary': 'primary',
    'sidebar-primary-foreground': 'primary-foreground',
    'sidebar-accent': 'accent',
    'sidebar-accent-foreground': 'accent-foreground',
    'sidebar-border': 'border',
    'sidebar-ring': 'ring',
  };

  for (const [key, value] of Object.entries(colors)) {
    if (typeof value === 'string') {
      root.style.setProperty(`--${key}`, value);

      // Special handling: 'sidebar' key maps to sidebar-background
      if (key === 'sidebar') {
        root.style.setProperty('--sidebar-background', value);
      }

      // Apply fallbacks for sidebar vars
      for (const [sKey, bKey] of Object.entries(sidebarFallbacks)) {
        if (key === bKey) {
          // Only apply fallback if sidebar var not explicitly defined
          const hasExplicit = colors[sKey] || (sKey === 'sidebar-background' && colors['sidebar']);
          if (!hasExplicit) {
            root.style.setProperty(`--${sKey}`, value);
          }
        }
      }
    }
  }
}

/** Core function: apply theme based on mode + theme name + custom themes */
export function applyThemeColors(mode: ThemeMode, themeName: string): void {
  const effectiveMode = resolveEffectiveMode(mode);
  const root = document.documentElement;

  // Toggle dark class
  root.classList.toggle('dark', effectiveMode === 'dark');

  // Find theme: check custom first, then presets
  const customThemes = getCustomThemes();
  const customTheme = customThemes.find((t) => t.name === themeName);
  const presetTheme = presetThemes.find((t) => t.name === themeName);

  if (customTheme) {
    applyColorVariant(customTheme.colors[effectiveMode]);
  } else if (presetTheme) {
    applyColorVariant(presetTheme.colors[effectiveMode]);
  } else {
    // Fallback to first preset
    applyColorVariant(presetThemes[0].colors[effectiveMode]);
  }

  // Persist
  try {
    localStorage.setItem(THEME_KEY, themeName);
    localStorage.setItem(THEME_MODE_KEY, mode);
  } catch {}
}

/** Legacy: apply a named theme (uses current mode or dark) */
export function applyTheme(name: string): ThemeConfig {
  const mode = getThemeMode();
  applyThemeColors(mode, name);
  return presetThemes.find((t) => t.name === name) || presetThemes[0];
}

/** Get saved theme name from localStorage */
export function loadThemeName(): string {
  try {
    return localStorage.getItem(THEME_KEY) || 'Miku';
  } catch {
    return 'Miku';
  }
}

// --- System Theme Watcher ---

export function watchSystemTheme(callback: () => void): () => void {
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e: MediaQueryListEvent) => {
    if (getThemeMode() === 'system') {
      callback();
    }
  };
  mql.addEventListener('change', handler);
  return () => mql.removeEventListener('change', handler);
}

// --- Import / Export ---

/** Parse tweakcn.com theme JSON format */
function parseTweakcnColor(obj: any): ThemeColorsVariant {
  const result: ThemeColorsVariant = {};
  if (!obj || typeof obj !== 'object') return result;
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = value;
    }
  }
  return result;
}

export function importThemeFromJSON(json: string): CustomThemeConfig[] {
  try {
    const parsed = JSON.parse(json);
    const items = Array.isArray(parsed) ? parsed : [parsed];
    const results: CustomThemeConfig[] = [];

    for (const item of items) {
      // Support both 'colors' (our format) and 'cssVars' (tweakcn format)
      const cssVars = item.cssVars || item.colors;
      if (!cssVars) continue;

      // theme is the base vars that apply to both light and dark
      const base = cssVars.theme ?? {};
      const light = { ...base, ...(cssVars.light ?? {}) };
      const dark = { ...base, ...(cssVars.dark ?? cssVars.light ?? {}) };

      results.push({
        name: item.name || 'Imported Theme',
        description: item.description || '',
        colors: { light, dark },
      });
    }

    return results;
  } catch (error) {
    console.error('Import theme failed:', error);
    return [];
  }
}

export async function importThemeFromURL(url: string): Promise<CustomThemeConfig[]> {
  const response = await fetch(url);
  const json = await response.text();
  return importThemeFromJSON(json);
}

export function exportTheme(theme: CustomThemeConfig): string {
  return JSON.stringify(theme, null, 2);
}

export function exportAllThemes(themes: CustomThemeConfig[]): string {
  return JSON.stringify(themes, null, 2);
}

/** Capture current CSS variable values from DOM */
export function captureCurrentTheme(): CustomThemeConfig {
  const root = document.documentElement;
  const isDarkMode = root.classList.contains('dark');

  const colorKeys = [
    'primary', 'primary-foreground', 'accent', 'accent-foreground',
    'background', 'foreground', 'card', 'card-foreground',
    'popover', 'popover-foreground', 'secondary', 'secondary-foreground',
    'muted', 'muted-foreground', 'destructive', 'border', 'input', 'ring',
    'progress-text', 'sidebar-background', 'sidebar-foreground',
    'sidebar-primary', 'sidebar-primary-foreground', 'sidebar-accent',
    'sidebar-accent-foreground', 'sidebar-border', 'sidebar-ring',
  ];

  const capture = (keys: string[]): ThemeColorsVariant => {
    const result: ThemeColorsVariant = {};
    for (const key of keys) {
      const value = root.style.getPropertyValue(`--${key}`);
      if (value) result[key] = value;
    }
    return result;
  };

  return {
    name: '',
    description: '',
    colors: {
      light: isDarkMode ? {} : capture(colorKeys),
      dark: isDarkMode ? capture(colorKeys) : {},
    },
  };
}
