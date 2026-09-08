import { describe, expect, it } from 'vitest';
import { applyMove } from '../step';
import { makeRules } from '../rules';
import { makeSnapshot, symbolKey, tilesFromString } from '../tiles';

const rules = makeRules(['swap']);
const snap = (s: string) => makeSnapshot(tilesFromString(s), { wild: 0, remove: 0 });

describe('applyMove swap', () => {
  it('bytter naboer og teller trekk', () => {
    const r = applyMove(rules, snap('ABC'), { type: 'swap', a: 0, b: 1 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(symbolKey(r.value.tiles)).toBe('BAC');
      expect(r.value.movesUsed).toBe(1);
      expect(r.value.tiles.map((t) => t.id)).toEqual([1, 0, 2]);
    }
  });

  it('avviser ikke-naboer', () => {
    const r = applyMove(rules, snap('ABC'), { type: 'swap', a: 0, b: 2 });
    expect(r).toEqual({ ok: false, reason: 'notAdjacent' });
  });

  it('avviser utenfor rekkevidde', () => {
    expect(applyMove(rules, snap('ABC'), { type: 'swap', a: 2, b: 3 })).toEqual({ ok: false, reason: 'outOfRange' });
    expect(applyMove(rules, snap('ABC'), { type: 'swap', a: -1, b: 0 })).toEqual({ ok: false, reason: 'outOfRange' });
  });

  it('avviser låst brikke', () => {
    expect(applyMove(rules, snap('aBC'), { type: 'swap', a: 0, b: 1 })).toEqual({ ok: false, reason: 'locked' });
  });

  it('avviser operasjon som ikke er tillatt', () => {
    expect(applyMove(makeRules(['rotate']), snap('ABC'), { type: 'swap', a: 0, b: 1 })).toEqual({ ok: false, reason: 'notAllowed' });
  });

  it('muterer ikke inndata', () => {
    const before = snap('ABC');
    applyMove(rules, before, { type: 'swap', a: 0, b: 1 });
    expect(symbolKey(before.tiles)).toBe('ABC');
    expect(before.movesUsed).toBe(0);
  });
});
