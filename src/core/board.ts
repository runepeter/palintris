import type { Command, RejectReason, Result } from './commands';
import { ok, reject } from './commands';
import type { Rules } from './rules';
import { applyMove } from './step';
import type { Hand, Snapshot, Tile } from './tiles';
import { makeSnapshot } from './tiles';

export interface BoardState extends Snapshot {
  readonly initial: Snapshot;
  readonly history: readonly Snapshot[];
}

export const toSnapshot = (s: Snapshot): Snapshot => ({
  tiles: s.tiles,
  hand: s.hand,
  movesUsed: s.movesUsed,
  nextId: s.nextId,
});

export const createBoard = (tiles: readonly Tile[], hand: Hand): BoardState => {
  const initial = makeSnapshot(tiles, hand);
  return { ...initial, initial, history: [] };
};

const sameSnapshot = (a: Snapshot, b: Snapshot): boolean =>
  a.movesUsed === b.movesUsed &&
  a.nextId === b.nextId &&
  a.hand.wild === b.hand.wild &&
  a.hand.remove === b.hand.remove &&
  a.tiles.length === b.tiles.length &&
  a.tiles.every((t, i) => t === b.tiles[i]);

export const apply = (rules: Rules, state: BoardState, cmd: Command): Result<BoardState, RejectReason> => {
  if (cmd.type === 'undo') {
    const prev = state.history[state.history.length - 1];
    if (prev === undefined) return reject('nothingToUndo');
    return ok({ ...prev, initial: state.initial, history: state.history.slice(0, -1) });
  }
  if (cmd.type === 'reset') {
    if (sameSnapshot(state, state.initial)) return ok(state);
    return ok({
      ...state.initial,
      initial: state.initial,
      history: [...state.history, toSnapshot(state)],
    });
  }
  const r = applyMove(rules, state, cmd);
  if (!r.ok) return r;
  return ok({
    ...r.value,
    initial: state.initial,
    history: [...state.history, toSnapshot(state)],
  });
};
