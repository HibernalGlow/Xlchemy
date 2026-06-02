/**
 * Xlchemy Theme System — oklch-based, following neoview's theme architecture.
 * Each theme defines light & dark color variants using shadcn CSS variables.
 */

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

// Preset themes — converted from original hex to oklch
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
        sidebar: 'oklch(0.96 0.003 182.83)',
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
        sidebar: 'oklch(0.13 0.005 0)',
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
        sidebar: 'oklch(0.96 0.003 155.00)',
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
        sidebar: 'oklch(0.13 0.005 0)',
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
        sidebar: 'oklch(0.96 0.005 61.00)',
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
        sidebar: 'oklch(0.17 0.005 61.00)',
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
        sidebar: 'oklch(0.965 0.005 70.00)',
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
        sidebar: 'oklch(0.17 0.005 58.00)',
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

/** Apply a named theme to the DOM */
export function applyTheme(name: string): ThemeConfig {
  const theme = presetThemes.find((t) => t.name === name) || presetThemes[0];
  const root = document.documentElement;

  // Toggle dark class
  if (theme.isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Apply the appropriate color variant
  const colors = theme.isDark ? theme.colors.dark : theme.colors.light;
  for (const [key, value] of Object.entries(colors)) {
    root.style.setProperty(`--${key}`, value);
  }

  // Persist
  try {
    localStorage.setItem('xlchemy-theme', name);
  } catch {}

  return theme;
}

/** Get saved theme name from localStorage */
export function loadThemeName(): string {
  try {
    return localStorage.getItem('xlchemy-theme') || 'Miku';
  } catch {
    return 'Miku';
  }
}
