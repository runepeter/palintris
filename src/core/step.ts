import type { MoveCommand, RejectReason, Result } from './commands';
import { ok, reject } from './commands';
import type { Rules } from './rules';
import type { Snapshot, Tile } from './tiles';

const inRange = (i: number, n: number): boolean => Number.isInteger(i) && i >= 0 && i < n;

const withTiles = (snap: Snapshot, tiles: readonly Tile[]): Snapshot => ({
  ...snap,
  tiles,
  movesUsed: snap.movesUsed + 1,
});

const swap = (_rules: Rules, snap: Snapshot, a: number, b: number): Result<Snapshot, RejectReason> => {
  const n = snap.tiles.length;
  if (!inRange(a, n) || !inRange(b, n)) return reject('outOfRange');
  if (Math.abs(a - b) !== 1) return reject('notAdjacent');
  const ta = snap.tiles[a];
  const tb = snap.tiles[b];
  if (ta === undefined || tb === undefined) return reject('outOfRange');
  if (ta.locked || tb.locked) return reject('locked');
  const tiles = [...snap.tiles];
  tiles[a] = tb;
  tiles[b] = ta;
  return ok(withTiles(snap, tiles));
};

export const applyMove = (
  rules: Rules,
  snap: Snapshot,
  cmd: MoveCommand
): Result<Snapshot, RejectReason> => {
  if (!rules.allowedOps.has(cmd.type)) return reject('notAllowed');
  switch (cmd.type) {
    case 'swap':
      return swap(rules, snap, cmd.a, cmd.b);
    case 'rotate':
    case 'mirror':
    case 'insertWild':
    case 'remove':
      return reject('notAllowed');
  }
};
