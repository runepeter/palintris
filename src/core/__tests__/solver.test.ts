import { describe, expect, it } from 'vitest';
import { makeRules, ALL_OPS } from '../rules';
import { BfsSearch, legalMoves, solve, stateKey } from '../solver';
import { makeSnapshot, tilesFromString } from '../tiles';

const req = (s: string, ops = ALL_OPS, maxMoves = 6, hand = { wild: 0, remove: 0 }, states = 50000) => ({
  rules: makeRules(ops),
  tiles: tilesFromString(s),
  hand,
  maxMoves,
  limits: { states },
});

describe('stateKey', () => {
  it('ignorerer id og trekk, tar med hånd', () => {
    const a = tilesFromString('AB*');
    const b = tilesFromString('AB*').map((t) => ({ ...t, id: t.id + 10 }));
    expect(stateKey(a, { wild: 1, remove: 0 })).toBe(stateKey(b, { wild: 1, remove: 0 }));
    expect(stateKey(a, { wild: 1, remove: 0 })).not.toBe(stateKey(a, { wild: 0, remove: 0 }));
  });
});

describe('legalMoves', () => {
  it('lister swap, rotate, mirror, insertWild og remove etter regler og hånd', () => {
    const snap = makeSnapshot(tilesFromString('ABC'), { wild: 1, remove: 1 });
    const moves = legalMoves(makeRules(ALL_OPS), snap);
    expect(moves.filter((m) => m.type === 'swap')).toHaveLength(2);
    expect(moves.filter((m) => m.type === 'rotate')).toHaveLength(6);
    expect(moves.filter((m) => m.type === 'mirror')).toHaveLength(1);
    expect(moves.filter((m) => m.type === 'insertWild')).toHaveLength(4);
    expect(moves.filter((m) => m.type === 'remove')).toHaveLength(0);
  });
  it('hopper over låste brikker', () => {
    const snap = makeSnapshot(tilesFromString('AbC'), { wild: 0, remove: 0 });
    expect(legalMoves(makeRules(['swap']), snap)).toHaveLength(0);
  });
});

describe('solve', () => {
  it('0 trekk for palindrom', () => {
    expect(solve(req('ABA'))).toEqual({ status: 'solved', moves: 0 });
  });
  it('1 swap for AAB', () => {
    expect(solve(req('AAB', ['swap']))).toEqual({ status: 'solved', moves: 1 });
  });
  it('2 swaps for AABB med bare swap', () => {
    expect(solve(req('AABB', ['swap']))).toEqual({ status: 'solved', moves: 2 });
  });
  it('1 rotate for DOCRECORD, segment OCR roteres til ROC', () => {
    expect(solve(req('DOCRECORD', ['rotate']))).toEqual({ status: 'solved', moves: 1 });
  });
  it('uoppnåelig innen budsjett når paritet er feil og bare permutasjoner', () => {
    expect(solve(req('ABCD', ['swap', 'rotate', 'mirror'], 4))).toEqual({ status: 'unreachableWithinBudget' });
  });
  it('ABCDA løses med fjern B og sett inn joker, to trekk', () => {
    expect(solve(req('ABCDA', ALL_OPS, 3, { wild: 1, remove: 1 }))).toEqual({ status: 'solved', moves: 2 });
  });
  it('unknown når state-grensen er nådd', () => {
    expect(solve(req('ABCDEFGHIJ', ALL_OPS, 8, { wild: 0, remove: 0 }, 50))).toEqual({ status: 'unknown' });
  });
  it('er deterministisk uten ms-grense', () => {
    const r = req('BACDEFGFEDCBA', ['swap', 'rotate'], 4, { wild: 0, remove: 0 }, 5000);
    expect(solve(r)).toEqual(solve(r));
  });
});

describe('BfsSearch.step', () => {
  it('returnerer null til søket er ferdig', () => {
    const s = new BfsSearch(req('AABB', ['swap']));
    let result = s.step(1);
    let steps = 1;
    while (result === null) {
      result = s.step(1);
      steps++;
    }
    expect(result).toEqual({ status: 'solved', moves: 2 });
    expect(steps).toBeGreaterThan(1);
  });
});
