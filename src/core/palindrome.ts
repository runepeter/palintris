import type { Tile } from './tiles';

export const matches = (a: Tile, b: Tile): boolean =>
  a.wild || b.wild || a.symbol === b.symbol;

export const mismatchCount = (tiles: readonly Tile[]): number => {
  let count = 0;
  const n = tiles.length;
  for (let i = 0; i < Math.floor(n / 2); i++) {
    const left = tiles[i];
    const right = tiles[n - 1 - i];
    if (left !== undefined && right !== undefined && !matches(left, right)) count++;
  }
  return count;
};

export const isPalindrome = (tiles: readonly Tile[]): boolean => mismatchCount(tiles) === 0;
