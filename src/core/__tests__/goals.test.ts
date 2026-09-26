import { expect, it } from 'vitest';
import { hasCenterBonus } from '../goals';
import { tilesFromString } from '../tiles';

it('midtbonus krever palindrom, oddetall og riktig identitet', () => {
  const goal = { kind: 'centerTile', tileId: 1 } as const;
  expect(hasCenterBonus(tilesFromString('ABA'), goal)).toBe(true);
  expect(hasCenterBonus(tilesFromString('AAA'), { ...goal, tileId: 0 })).toBe(false);
  expect(hasCenterBonus(tilesFromString('ABC'), goal)).toBe(false);
  expect(hasCenterBonus(tilesFromString('ABBA'), goal)).toBe(false);
  expect(hasCenterBonus(tilesFromString('ABA'), { ...goal, tileId: 9 })).toBe(false);
  expect(hasCenterBonus([], goal)).toBe(false);
});
