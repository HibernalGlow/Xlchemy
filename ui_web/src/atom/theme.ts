import { atom } from 'jotai';
import { Theme } from '~/consts';
import type { CustomThemeConfig } from '~/types';
import { storage } from '~/utils/storage';
import { isSystemDark } from '~/utils/theme';
import { applyThemeColors, PRESET_THEMES } from '~/utils/themeManager';
import {
  customThemesAtom,
  selectedThemeAtom,
  themeAtom,
} from './primitive';

function applyTheme(theme: string) {
  let finalTheme = theme;
  if (theme === Theme.System) {
    finalTheme = isSystemDark() ? Theme.Dark : Theme.Light;
  }
  const root = window.document.documentElement;
  root.classList.remove(Theme.Light, Theme.Dark);
  root.classList.add(finalTheme);
  return finalTheme;
}

function applyThemeWithColors(mode: string, themeConfig: CustomThemeConfig | null) {
  const finalMode = applyTheme(mode);

  if (themeConfig) {
    const isDark = finalMode === Theme.Dark;
    const colors = isDark ? themeConfig.colors.dark : themeConfig.colors.light;
    applyThemeColors(colors);

    storage.setRuntimeTheme({
      mode: mode as 'light' | 'dark' | 'system',
      themeName: themeConfig.name,
      themes: themeConfig.colors,
    });
  }

  return finalMode;
}

export const initThemeAtom = atom(null, (_, set) => {
  const theme = storage.getTheme();
  const themeName = storage.getThemeName();
  const customThemes = storage.getCustomThemes();

  let themeConfig = PRESET_THEMES.find((t) => t.name === themeName) || null;
  if (!themeConfig) {
    themeConfig = customThemes.find((t) => t.name === themeName) || null;
  }
  if (!themeConfig) {
    themeConfig = PRESET_THEMES[0];
  }

  const className = applyThemeWithColors(theme, themeConfig);
  set(themeAtom, { display: theme, className });
  set(selectedThemeAtom, themeConfig);
  set(customThemesAtom, customThemes);
});

export const toggleThemeAtom = atom(null, (get, set) => {
  const display = get(themeAtom).display;
  const selectedTheme = get(selectedThemeAtom);
  const displayList: string[] = [Theme.Light, Theme.Dark, Theme.System];
  let idx = displayList.indexOf(display);
  if (idx < 0) idx = 0;
  idx += 1;
  if (idx >= displayList.length) idx = 0;
  const newDisplay = displayList[idx];
  const newClassName = applyThemeWithColors(newDisplay, selectedTheme);
  set(themeAtom, { display: newDisplay, className: newClassName });
  storage.setTheme(newDisplay);
});

export const setThemeModeAtom = atom(null, (get, set, mode: string) => {
  const selectedTheme = get(selectedThemeAtom);
  const newClassName = applyThemeWithColors(mode, selectedTheme);
  set(themeAtom, { display: mode, className: newClassName });
  storage.setTheme(mode);
});

export const selectThemeAtom = atom(null, (get, set, themeConfig: CustomThemeConfig) => {
  const mode = get(themeAtom).display;
  const newClassName = applyThemeWithColors(mode, themeConfig);
  set(themeAtom, { display: mode, className: newClassName });
  set(selectedThemeAtom, themeConfig);
  storage.setThemeName(themeConfig.name);
});
