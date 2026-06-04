export type LaneId = 'input' | 'output' | 'modify' | 'settings' | 'about';
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
  | 'about-info';

export type CardLayout = Record<LaneId, CardId[]>;

export const DEFAULT_CARD_LAYOUT: CardLayout = {
  input: ['input-files', 'progress-status', 'input-filter'],
  output: ['output-format', 'output-conversion', 'output-save'],
  modify: ['modify-downscaling', 'modify-misc'],
  settings: ['settings-appearance', 'settings-general', 'settings-conversion', 'settings-exiftool', 'settings-advanced'],
  about: ['about-info'],
};

export const ALL_CARD_IDS: CardId[] = Object.values(DEFAULT_CARD_LAYOUT).flat();

export interface ProgressCardConfig {
  showCounter: boolean;
  showSummary: boolean;
  showEta: boolean;
  showFormat: boolean;
  showEncoder: boolean;
  showRawLines: boolean;
}

export const DEFAULT_PROGRESS_CARD_CONFIG: ProgressCardConfig = {
  showCounter: true,
  showSummary: true,
  showEta: true,
  showFormat: true,
  showEncoder: true,
  showRawLines: true,
};

export function cloneCardLayout(layout: CardLayout): CardLayout {
  return {
    input: [...layout.input],
    output: [...layout.output],
    modify: [...layout.modify],
    settings: [...layout.settings],
    about: [...layout.about],
  };
}
