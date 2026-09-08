import { describe, expect, it } from 'vitest';
import { makeSnapshot, makeTile, symbolKey, tilesFromString, WILD_SYMBOL } from '../tiles';

describe('tilesFromString', () => {
  it('lager vanlige, låste og joker-brikker med stigende id', () => {
    const tiles = tilesFromString('AB*c');
    expect(tiles.map((t) => t.id)).toEqual([0, 1, 2, 3]);
    expect(tiles.map((t) => t.symbol)).toEqual(['A', 'B', WILD_SYMBOL, 'C']);
    expect(tiles.map((t) => t.locked)).toEqual([false, false, false, true]);
    expect(tiles.map((t) => t.wild)).toEqual([false, false, true, false]);
  });
});

describe('symbolKey', () => {
  it('er invers av tilesFromString', () => {
    expect(symbolKey(tilesFromString('AB*c'))).toBe('AB*c');
  });
});

describe('makeTile', () => {
  it('joker får alltid symbolet *', () => {
    expect(makeTile(7, 'Q', { wild: true }).symbol).toBe(WILD_SYMBOL);
  });
});

describe('makeSnapshot', () => {
  it('setter nextId til høyeste id pluss én og movesUsed til 0', () => {
    const snap = makeSnapshot(tilesFromString('ABC'), { wild: 1, remove: 0 });
    expect(snap.nextId).toBe(3);
    expect(snap.movesUsed).toBe(0);
    expect(snap.hand).toEqual({ wild: 1, remove: 0 });
  });
});
