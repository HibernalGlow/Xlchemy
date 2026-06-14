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

/**
 * Merges a saved card layout with the current defaults.
 * - Preserves user's card ordering within each lane.
 * - Appends any new default cards that were added after the user saved.
 * - Filters out card IDs that are no longer valid (removed from defaults).
 * - Preserves user-created lanes that don't exist in defaults.
 */
export function mergeCardLayoutWithDefaults(saved: CardLayout): CardLayout {
  const validIds = new Set(ALL_CARD_IDS);
  const next: CardLayout = cloneCardLayout(DEFAULT_CARD_LAYOUT);

  // For each default lane, overlay the user's saved ordering
  for (const laneId of Object.keys(DEFAULT_CARD_LAYOUT)) {
    const savedCards = saved[laneId];
    if (!Array.isArray(savedCards)) continue;
    // Keep only valid cards, preserve user's order
    const filtered = savedCards.filter((id) => validIds.has(id));
    // Append any new default cards not in the saved list
    for (const cardId of DEFAULT_CARD_LAYOUT[laneId]) {
      if (!filtered.includes(cardId)) filtered.push(cardId);
    }
    next[laneId] = filtered;
  }

  // Preserve user-created lanes (not in defaults)
  for (const [laneId, cards] of Object.entries(saved)) {
    if (laneId in DEFAULT_CARD_LAYOUT) continue;
    next[laneId] = Array.isArray(cards) ? cards.filter((id) => validIds.has(id)) : [];
  }

  return next;
}

export interface DuplicateCardInfo {
  cardId: CardId;
  lanes: LaneId[];
}

/**
 * Scans a card layout and returns cards that appear in more than one lane.
 */
export function findDuplicateCards(layout: CardLayout): DuplicateCardInfo[] {
  const cardLanes = new Map<CardId, LaneId[]>();
  for (const [laneId, cards] of Object.entries(layout)) {
    for (const cardId of cards) {
      const lanes = cardLanes.get(cardId) ?? [];
      lanes.push(laneId);
      cardLanes.set(cardId, lanes);
    }
  }
  const dupes: DuplicateCardInfo[] = [];
  for (const [cardId, lanes] of cardLanes) {
    if (lanes.length > 1) {
      dupes.push({ cardId, lanes });
    }
  }
  return dupes;
}

/**
 * Removes duplicate cards from the layout, keeping each card only in the
 * first lane where it appears (based on the provided lane order).
 */
export function deduplicateCards(layout: CardLayout, laneOrder: LaneId[]): CardLayout {
  const next = cloneCardLayout(layout);
  const seen = new Set<CardId>();
  for (const laneId of laneOrder) {
    const cards = next[laneId];
    if (!cards) continue;
    next[laneId] = cards.filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }
  for (const [laneId, cards] of Object.entries(next)) {
    if (laneOrder.includes(laneId)) continue;
    next[laneId] = cards.filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }
  return next;
}
