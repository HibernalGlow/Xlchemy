export type LaneId = string;
export type BuiltinLaneId = 'input' | 'output' | 'modify' | 'settings' | 'about';
export type CardId =
  | 'input-files'
  | 'input-filter'
  | 'progress-status'
  | 'output-format'
  | 'output-conversion'
  | 'output-save'
  | 'modify-downscaling'
  | 'modify-misc'
  | 'settings-appearance'
  | 'settings-general'
  | 'settings-conversion'
  | 'settings-exiftool'
  | 'settings-advanced'
  | 'settings-frontend'
  | 'layout-manager'
  | 'about-info'
  | 'conversion-log'
  | 'system-status';

export type CardLayout = Record<LaneId, CardId[]>;

export const DEFAULT_CARD_LAYOUT: CardLayout = {
  input: ['input-files', 'progress-status', 'input-filter'],
  output: ['output-format', 'output-conversion', 'output-save'],
  modify: ['modify-downscaling', 'modify-misc'],
  settings: ['settings-appearance', 'settings-general', 'settings-conversion', 'settings-exiftool', 'settings-advanced', 'settings-frontend', 'layout-manager'],
  about: ['about-info', 'conversion-log', 'system-status'],
};

export const ALL_CARD_IDS: CardId[] = Object.values(DEFAULT_CARD_LAYOUT).flat();

export interface ProgressCardConfig {
  showCounter: boolean;
  showSummary: boolean;
  showEta: boolean;
  showFormat: boolean;
  showEncoder: boolean;
  showRawLines: boolean;
  showCurrentFile: boolean;
  showSizeChange: boolean;
}

export const DEFAULT_PROGRESS_CARD_CONFIG: ProgressCardConfig = {
  showCounter: true,
  showSummary: true,
  showEta: true,
  showFormat: true,
  showEncoder: true,
  showRawLines: true,
  showCurrentFile: true,
  showSizeChange: true,
};

export function cloneCardLayout(layout: CardLayout): CardLayout {
  const next: CardLayout = {};
  for (const [laneId, cards] of Object.entries(layout)) {
    next[laneId] = [...cards];
  }
  return next;
}
