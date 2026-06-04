export type DragMode = 'none' | 'lane' | 'card';

interface DragState {
  mode: DragMode;
  laneId: string | null;
  cardId: string | null;
  fromLaneId: string | null;
  targetCardId: string | null;
  insertAfter: boolean;
}

const state: DragState = {
  mode: 'none',
  laneId: null,
  cardId: null,
  fromLaneId: null,
  targetCardId: null,
  insertAfter: false,
};

export function setLaneDrag(id: string): void {
  state.mode = 'lane';
  state.laneId = id;
  state.cardId = null;
  state.fromLaneId = null;
}

export function setCardDrag(cardId: string, fromLaneId: string): void {
  state.mode = 'card';
  state.cardId = cardId;
  state.fromLaneId = fromLaneId;
  state.laneId = null;
  state.targetCardId = null;
  state.insertAfter = false;
}

export function setCardDropTarget(targetCardId: string | null, insertAfter: boolean): void {
  state.targetCardId = targetCardId;
  state.insertAfter = insertAfter;
}

export function clearDrag(): void {
  state.mode = 'none';
  state.laneId = null;
  state.cardId = null;
  state.fromLaneId = null;
  state.targetCardId = null;
  state.insertAfter = false;
}

export function getDragMode(): DragMode {
  return state.mode;
}

export function getDragState(): Readonly<DragState> {
  return state;
}
