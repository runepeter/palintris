import { isPalindrome } from './palindrome';
import type { Tile } from './tiles';

export interface CenterTileGoal {
  readonly kind: 'centerTile';
  readonly tileId: number;
}

export const hasCenterBonus = (tiles: readonly Tile[], goal: CenterTileGoal): boolean =>
  tiles.length % 2 === 1 && tiles[Math.floor(tiles.length / 2)]?.id === goal.tileId && isPalindrome(tiles);
