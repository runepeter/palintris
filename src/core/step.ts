import type { MoveCommand, RejectReason, Result } from './commands';
import { ok, reject } from './commands';
import type { Rules } from './rules';
import { bindStickyPairs, planSwap } from './sticky';
import type { Snapshot, Tile } from './tiles';
import { makeTile, WILD_SYMBOL } from './tiles';

const inRange = (i: number, n: number): boolean => Number.isInteger(i) && i >= 0 && i < n;

const withTiles = (snap: Snapshot, tiles: readonly Tile[]): Snapshot => ({
  ...snap,
  tiles,
  movesUsed: snap.movesUsed + 1,
});

const swap = (_rules: Rules, snap: Snapshot, a: number, b: number): Result<Snapshot, RejectReason> => {
  const plan = planSwap(snap.tiles, a, b);
  if (!plan.ok) return plan;
  const tiles = [...snap.tiles];
  for (const pair of plan.value) {
    const aTile = tiles[pair.a];
    const bTile = tiles[pair.b];
    if (aTile === undefined || bTile === undefined) return reject('outOfRange');
    tiles[pair.a] = bTile;
    tiles[pair.b] = aTile;
  }
  return ok(withTiles(snap, tiles));
};

const segment = (
  snap: Snapshot,
  from: number,
  to: number,
  minLen: number
): Result<readonly Tile[], RejectReason> => {
  const n = snap.tiles.length;
  if (!inRange(from, n) || !inRange(to, n) || from > to) return reject('outOfRange');
  const seg = snap.tiles.slice(from, to + 1);
  if (seg.length < minLen) return reject('segmentTooShort');
  if (seg.some((t) => t.locked)) return reject('segmentContainsLocked');
  return ok(seg);
};

const replaceSegment = (snap: Snapshot, from: number, seg: readonly Tile[]): Snapshot => {
  const tiles = [...snap.tiles];
  seg.forEach((t, i) => {
    tiles[from + i] = t;
  });
  return withTiles(snap, tiles);
};

const rotate = (
  snap: Snapshot,
  from: number,
  to: number,
  dir: 'left' | 'right'
): Result<Snapshot, RejectReason> => {
  const seg = segment(snap, from, to, 2);
  if (!seg.ok) return seg;
  const s = [...seg.value];
  if (dir === 'left') {
    const first = s.shift();
    if (first !== undefined) s.push(first);
  } else {
    const last = s.pop();
    if (last !== undefined) s.unshift(last);
  }
  return ok(replaceSegment(snap, from, s));
};

const mirror = (snap: Snapshot, from: number, to: number): Result<Snapshot, RejectReason> => {
  const seg = segment(snap, from, to, 3);
  if (!seg.ok) return seg;
  return ok(replaceSegment(snap, from, [...seg.value].reverse()));
};

const insertWild = (rules: Rules, snap: Snapshot, at: number): Result<Snapshot, RejectReason> => {
  const n = snap.tiles.length;
  if (!Number.isInteger(at) || at < 0 || at > n) return reject('outOfRange');
  if (snap.hand.wild <= 0) return reject('handEmpty');
  if (n >= rules.maxLength) return reject('maxLength');
  const tiles = [...snap.tiles];
  tiles.splice(at, 0, makeTile(snap.nextId, WILD_SYMBOL, { wild: true }));
  return ok({
    ...withTiles(snap, tiles),
    hand: { ...snap.hand, wild: snap.hand.wild - 1 },
    nextId: snap.nextId + 1,
  });
};

const remove = (rules: Rules, snap: Snapshot, tileId: number): Result<Snapshot, RejectReason> => {
  const idx = snap.tiles.findIndex((t) => t.id === tileId);
  if (idx === -1) return reject('outOfRange');
  const t = snap.tiles[idx];
  if (t === undefined) return reject('outOfRange');
  if (t.locked) return reject('locked');
  if (snap.hand.remove <= 0) return reject('handEmpty');
  if (snap.tiles.length <= rules.minLength) return reject('minLength');
  const tiles = snap.tiles.filter((_, i) => i !== idx);
  return ok({
    ...withTiles(snap, tiles),
    hand: { ...snap.hand, remove: snap.hand.remove - 1 },
  });
};

const dispatchMove = (
  rules: Rules,
  snap: Snapshot,
  cmd: MoveCommand
): Result<Snapshot, RejectReason> => {
  if (!rules.allowedOps.has(cmd.type)) return reject('notAllowed');
  switch (cmd.type) {
    case 'swap':
      return swap(rules, snap, cmd.a, cmd.b);
    case 'rotate':
      return rotate(snap, cmd.from, cmd.to, cmd.dir);
    case 'mirror':
      return mirror(snap, cmd.from, cmd.to);
    case 'insertWild':
      return insertWild(rules, snap, cmd.at);
    case 'remove':
      return remove(rules, snap, cmd.tileId);
  }
};

export const applyMove = (
  rules: Rules,
  snap: Snapshot,
  cmd: MoveCommand
): Result<Snapshot, RejectReason> => {
  const result = dispatchMove(rules, snap, cmd);
  if (!result.ok) return result;
  if (cmd.type !== 'swap' && snap.tiles.some((t, i) => t.bondedTo !== undefined &&
    (snap.tiles.length !== result.value.tiles.length || result.value.tiles[i]?.id !== t.id))) {
    return reject('stickyConflict');
  }
  return ok({ ...result.value, tiles: bindStickyPairs(result.value.tiles) });
};
