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
      return rotate(snap, cmd.from, cmd.to, cmd.dir);
    case 'mirror':
      return mirror(snap, cmd.from, cmd.to);
    case 'insertWild':
    case 'remove':
      return reject('notAllowed');
  }
};
