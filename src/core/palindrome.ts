import type { Hand, Tile } from './tiles';

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

/**
 * Nødvendig betingelse, aldri tilstrekkelig: hvert symbol med oddetall trenger en joker eller midtplassen.
 * Bytte, rotasjon og speiling endrer ikke antallet; hver joker eller fjerning retter høyst ett odde symbol.
 */
export const canBecomePalindrome = (tiles: readonly Tile[], hand: Hand): boolean => {
  const odd = new Set<string>();
  let wilds = 0;
  for (const tile of tiles) {
    if (tile.wild) wilds++;
    else if (odd.has(tile.symbol)) odd.delete(tile.symbol);
    else odd.add(tile.symbol);
  }
  return odd.size <= wilds + hand.wild + hand.remove + 1;
};
