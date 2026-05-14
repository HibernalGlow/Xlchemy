import { atom } from 'jotai';
import type { CustomThemeConfig, ThemeCfg } from '~/types';

export const themeAtom = atom<ThemeCfg>({
  display: '',
  className: '',
});

export const selectedThemeAtom = atom<CustomThemeConfig | null>(null);

export const customThemesAtom = atom<CustomThemeConfig[]>([]);

export const progressAtom = atom({
  line1: '',
  line2: '',
  value: 0,
  maximum: 100,
  isProcessing: false,
});

export const exceptionsAtom = atom<Array<{ title: string; description: string; path: string }>>([]);

export const filesAtom = atom<Array<{ path: string; anchor_path: string; name: string; size: number; format: string }>>([]);

export const settingsAtom = atom<Record<string, unknown>>({});
