import { ok, reject, type RejectReason, type Result } from './commands';
import type { Tile } from './tiles';

export const bindStickyPairs = (tiles: readonly Tile[]): readonly Tile[] => {
  let bound: Tile[] | undefined;
  for (let i = 0; i < Math.floor(tiles.length / 2); i++) {
    const j = tiles.length - 1 - i;
    const a = tiles[i];
    const b = tiles[j];
    if (a === undefined || b === undefined || (a.sticky !== true && b.sticky !== true) || a.bondedTo !== undefined || b.bondedTo !== undefined ||
      a.locked || b.locked || a.wild || b.wild || a.symbol !== b.symbol) continue;
    bound ??= [...tiles];
    bound[i] = { ...a, bondedTo: b.id };
    bound[j] = { ...b, bondedTo: a.id };
  }
  return bound ?? tiles;
};

const validBonds = (tiles: readonly Tile[]): boolean => tiles.every((tile, i) => {
  if (tile.bondedTo === undefined) return true;
  const partner = tiles[tiles.length - 1 - i];
  return partner !== undefined && partner.id !== tile.id && partner.id === tile.bondedTo &&
    partner.bondedTo === tile.id && partner.symbol === tile.symbol &&
    !tile.locked && !tile.wild && !partner.locked && !partner.wild;
});

export const planSwap = (
  tiles: readonly Tile[], a: number, b: number
): Result<readonly { a: number; b: number }[], RejectReason> => {
  const n = tiles.length;
  if (![a, b].every((i) => Number.isInteger(i) && i >= 0 && i < n)) return reject('outOfRange');
  if (Math.abs(a - b) !== 1) return reject('notAdjacent');
  const first = tiles[a];
  const second = tiles[b];
  if (first === undefined || second === undefined) return reject('outOfRange');
  if (first.locked || second.locked) return reject('locked');
  if (!validBonds(tiles)) return reject('stickyConflict');
  const swaps = [{ a, b }];
  if (first.bondedTo !== undefined || second.bondedTo !== undefined) {
    const reflected = { a: n - 1 - a, b: n - 1 - b };
    if (tiles[reflected.a]?.locked === true || tiles[reflected.b]?.locked === true) return reject('locked');
    if (reflected.a !== b || reflected.b !== a) {
      if ([a, b].includes(reflected.a) || [a, b].includes(reflected.b)) return reject('stickyConflict');
      swaps.push(reflected);
    }
  }
  const moved = [...tiles];
  for (const swap of swaps) {
    const aTile = moved[swap.a];
    const bTile = moved[swap.b];
    if (aTile === undefined || bTile === undefined) return reject('outOfRange');
    moved[swap.a] = bTile;
    moved[swap.b] = aTile;
  }
  if (!validBonds(moved)) return reject('stickyConflict');
  return ok(swaps);
};
