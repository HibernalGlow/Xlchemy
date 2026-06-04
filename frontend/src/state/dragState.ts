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

export function getDragMode(): DragMode {
  return state.mode;
}

export function getDragState(): Readonly<DragState> {
  return state;
}
