import {
  cloneCardLayout,
  DEFAULT_CARD_LAYOUT,
  DEFAULT_PROGRESS_CARD_CONFIG,
  mergeCardLayoutWithDefaults,
  type CardLayout,
  type LaneId,
  type ProgressCardConfig,
} from '$lib/cards/definitions';
import { createDefaultSnapshot, type AppStateSnapshot } from '$lib/domain';
import { loadBackgroundSettings } from '$lib/utils/backgroundSettings';
import { getCustomThemes, getThemeMode, loadThemeName } from '$lib/utils/themes';

type ImportableSettingsPayload = {
  output?: unknown;
  modify?: unknown;
  app?: unknown;
  layout?: unknown;
  domain?: {
    output?: unknown;
    modify?: unknown;
    app?: unknown;
  };
};

const defaultSnapshot = createDefaultSnapshot();
const LANGUAGE_KEY = 'xlchemy-language';
const THEME_KEY = 'xlchemy-theme';
const THEME_MODE_KEY = 'xlchemy-theme-mode';
const CUSTOM_THEMES_KEY = 'xlchemy-custom-themes';
const BACKGROUND_KEY = 'xlchemy-bg';

function loadLaneOrder(): string[] {
  try {
    const v = localStorage.getItem('xlchemy-lane-order');
    if (v) {
      const arr = JSON.parse(v);
      if (Array.isArray(arr)) return arr;
    }
  } catch {}
  return [...defaultSnapshot.layout.laneOrder];
}

function loadCollapsedLanes(): string[] {
  try {
    const v = localStorage.getItem('xlchemy-collapsed-lanes');
    if (v) {
      const arr = JSON.parse(v);
      if (Array.isArray(arr)) return arr.filter(Boolean);
    }
  } catch {}
  return [];
}

function loadLaneWidths(): Record<string, number> {
  try {
    const raw = localStorage.getItem('xlchemy-lane-widths');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function loadLaneLabels(): Record<string, string> {
  try {
    const raw = localStorage.getItem('xlchemy-lane-labels');
    if (!raw) return { ...defaultSnapshot.layout.laneLabels };
    return { ...defaultSnapshot.layout.laneLabels, ...JSON.parse(raw) };
  } catch {
    return { ...defaultSnapshot.layout.laneLabels };
  }
}

function loadCardLayout(): CardLayout {
  try {
    const raw = localStorage.getItem('xlchemy-card-layout');
    if (!raw) return cloneCardLayout(DEFAULT_CARD_LAYOUT);
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return mergeCardLayoutWithDefaults(parsed as CardLayout);
    }
    return cloneCardLayout(DEFAULT_CARD_LAYOUT);
  } catch {
    return cloneCardLayout(DEFAULT_CARD_LAYOUT);
  }
}

function loadSingleLaneMode(): boolean {
  try {
    return localStorage.getItem('xlchemy-single-lane-mode') === 'true';
  } catch {
    return false;
  }
}

function loadActiveLaneId(): LaneId {
  try {
    const value = localStorage.getItem('xlchemy-active-lane-id') as LaneId | null;
    if (value && defaultSnapshot.layout.laneOrder.includes(value)) return value;
  } catch {}
  return 'input';
}

function loadProgressCardConfig(): ProgressCardConfig {
  try {
    const raw = localStorage.getItem('xlchemy-progress-card-config');
    if (!raw) return { ...DEFAULT_PROGRESS_CARD_CONFIG };
    return { ...DEFAULT_PROGRESS_CARD_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PROGRESS_CARD_CONFIG };
  }
}

function loadHiddenSet(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    }
  } catch {}
  return [];
}

function hasStoredValue(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

export function resolveImportPayload(data: unknown): {
  output?: unknown;
  modify?: unknown;
  app?: unknown;
  layout?: unknown;
  background?: unknown;
  theme?: unknown;
  lang?: unknown;
} {
  if (!data || typeof data !== 'object') {
    return {};
  }

  const payload = data as ImportableSettingsPayload;
  const domain = payload.domain && typeof payload.domain === 'object' ? payload.domain : undefined;

  return {
    output: domain?.output ?? payload.output,
    modify: domain?.modify ?? payload.modify,
    app: domain?.app ?? payload.app,
    layout: payload.layout,
    background: (payload as { background?: unknown }).background,
    theme: (payload as { theme?: unknown }).theme,
    lang: (payload as { lang?: unknown }).lang,
  };
}

export function loadLegacyClientState(): {
  layout: AppStateSnapshot['layout'];
  background: AppStateSnapshot['background'];
  theme: AppStateSnapshot['theme'];
  lang: string;
  hasLayoutState: boolean;
  hasBackgroundState: boolean;
  hasThemeState: boolean;
  hasLangState: boolean;
} {
  return {
    layout: {
      laneOrder: loadLaneOrder(),
      laneLabels: loadLaneLabels(),
      laneWidths: loadLaneWidths(),
      laneWidthRatios: {},
      cardLayout: loadCardLayout(),
      singleLaneMode: loadSingleLaneMode(),
      activeLaneId: loadActiveLaneId(),
      progressCardConfig: loadProgressCardConfig(),
      collapsedLanes: loadCollapsedLanes(),
      hiddenLanes: loadHiddenSet('xlchemy-hidden-lanes'),
      hiddenCards: loadHiddenSet('xlchemy-hidden-cards'),
    },
    background: loadBackgroundSettings(),
    theme: {
      name: loadThemeName(),
      mode: getThemeMode(),
      customThemes: getCustomThemes(),
    },
    lang: (() => {
      try {
        return localStorage.getItem(LANGUAGE_KEY) || defaultSnapshot.lang;
      } catch {
        return defaultSnapshot.lang;
      }
    })(),
    hasLayoutState: [
      'xlchemy-lane-order',
      'xlchemy-collapsed-lanes',
      'xlchemy-lane-widths',
      'xlchemy-lane-labels',
      'xlchemy-card-layout',
      'xlchemy-single-lane-mode',
      'xlchemy-active-lane-id',
      'xlchemy-progress-card-config',
      'xlchemy-hidden-lanes',
      'xlchemy-hidden-cards',
    ].some(hasStoredValue),
    hasBackgroundState: hasStoredValue(BACKGROUND_KEY),
    hasThemeState: [THEME_KEY, THEME_MODE_KEY, CUSTOM_THEMES_KEY].some(hasStoredValue),
    hasLangState: hasStoredValue(LANGUAGE_KEY),
  };
}
