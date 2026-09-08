import { describe, expect, it } from 'vitest';
import { applyMove } from '../step';
import { makeRules } from '../rules';
import { makeSnapshot, symbolKey, tilesFromString } from '../tiles';

const rules = makeRules(['insertWild', 'remove']);
const snap = (s: string, hand = { wild: 1, remove: 1 }) => makeSnapshot(tilesFromString(s), hand);
const key = (r: ReturnType<typeof applyMove>): string => (r.ok ? symbolKey(r.value.tiles) : `reject:${r.reason}`);

describe('insertWild', () => {
  it('setter inn joker med ny id og bruker hånd', () => {
    const r = applyMove(rules, snap('ABC'), { type: 'insertWild', at: 3 });
    expect(key(r)).toBe('ABC*');
    if (r.ok) {
      expect(r.value.tiles[3]?.id).toBe(3);
      expect(r.value.nextId).toBe(4);
      expect(r.value.hand).toEqual({ wild: 0, remove: 1 });
      expect(r.value.movesUsed).toBe(1);
    }
  });
  it('kan settes inn først', () => {
    expect(key(applyMove(rules, snap('ABC'), { type: 'insertWild', at: 0 }))).toBe('*ABC');
  });
  it('avviser tom hånd', () => {
    expect(key(applyMove(rules, snap('ABC', { wild: 0, remove: 0 }), { type: 'insertWild', at: 0 }))).toBe('reject:handEmpty');
  });
  it('avviser ved maks lengde', () => {
    expect(key(applyMove(rules, snap('ABCDEFGHIJKLMN'), { type: 'insertWild', at: 0 }))).toBe('reject:maxLength');
  });
  it('avviser posisjon utenfor 0..n', () => {
    expect(key(applyMove(rules, snap('ABC'), { type: 'insertWild', at: 4 }))).toBe('reject:outOfRange');
  });
});

describe('remove', () => {
  it('fjerner brikke etter id og bruker hånd', () => {
    const r = applyMove(rules, snap('ABCD'), { type: 'remove', tileId: 1 });
    expect(key(r)).toBe('ACD');
    if (r.ok) expect(r.value.hand).toEqual({ wild: 1, remove: 0 });
  });
  it('avviser ukjent id', () => {
    expect(key(applyMove(rules, snap('ABCD'), { type: 'remove', tileId: 9 }))).toBe('reject:outOfRange');
  });
  it('avviser låst brikke', () => {
    expect(key(applyMove(rules, snap('AbCD'), { type: 'remove', tileId: 1 }))).toBe('reject:locked');
  });
  it('avviser ved minste lengde', () => {
    expect(key(applyMove(rules, snap('ABC'), { type: 'remove', tileId: 0 }))).toBe('reject:minLength');
  });
  it('avviser tom hånd', () => {
    expect(key(applyMove(rules, snap('ABCD', { wild: 0, remove: 0 }), { type: 'remove', tileId: 0 }))).toBe('reject:handEmpty');
  });
});
