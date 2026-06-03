/**
 * Module-level shared drag state for lane and card drag-and-drop.
 * Using a module variable instead of DOM hacks or Context for simplicity and reliability.
 */
export type DragMode = 'none' | 'lane' | 'card';

interface DragState {
  mode: DragMode;
  laneId: string | null;
  cardId: string | null;
  fromLaneId: string | null;
}

const state: DragState = {
  mode: 'none',
  laneId: null,
  cardId: null,
  fromLaneId: null,
};

export function setDragMode(mode: DragMode): void {
  state.mode = mode;
}

export function getDragMode(): DragMode {
  return state.mode;
}

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
}

export function clearDrag(): void {
  state.mode = 'none';
  state.laneId = null;
  state.cardId = null;
  state.fromLaneId = null;
}

export function getDragState(): Readonly<DragState> {
  return state;
}
