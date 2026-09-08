import { describe, expect, it } from 'vitest';
import { generateCandidate, makeTargetPalindrome, validateSolution } from '../generator';
import { isPalindrome } from '../palindrome';
import { createRng } from '../rng';
import { makeRules, ALL_OPS } from '../rules';
import { symbolKey, tilesFromString } from '../tiles';

const base = {
  length: 7,
  alphabet: 4,
  allowedOps: ALL_OPS,
  hand: { wild: 0, remove: 0 },
  lockedCount: 0,
  scrambleSteps: 3,
};

describe('makeTargetPalindrome', () => {
  it('er palindrom med riktig lengde, jokere og låser', () => {
    const tiles = makeTargetPalindrome({ ...base, hand: { wild: 2, remove: 0 }, lockedCount: 1 }, createRng(1));
    expect(tiles).toHaveLength(7);
    expect(isPalindrome(tiles)).toBe(true);
    expect(tiles.filter((t) => t.wild)).toHaveLength(2);
    expect(tiles.filter((t) => t.locked)).toHaveLength(1);
    expect(tiles.map((t) => t.id)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
  it('bruker bare alfabetet', () => {
    const tiles = makeTargetPalindrome({ ...base, alphabet: 2 }, createRng(5));
    expect(tiles.every((t) => t.symbol === 'A' || t.symbol === 'B')).toBe(true);
  });
});

describe('generateCandidate', () => {
  it('gir brett som ikke er palindrom, med validert løsning', () => {
    for (let seed = 0; seed < 30; seed++) {
      const c = generateCandidate(base, createRng(seed));
      if (c === null) continue;
      expect(isPalindrome(c.tiles)).toBe(false);
      expect(validateSolution(makeRules(ALL_OPS), c)).toBe(true);
    }
  });

  it('hånden dekker nøyaktig løsningens hånd-trekk', () => {
    const spec = { ...base, hand: { wild: 1, remove: 1 }, scrambleSteps: 2 };
    let found = 0;
    for (let seed = 0; seed < 50 && found < 5; seed++) {
      const c = generateCandidate(spec, createRng(seed));
      if (c === null) continue;
      found++;
      expect(c.hand).toEqual({ wild: 1, remove: 1 });
      expect(c.solution.filter((m) => m.type === 'insertWild')).toHaveLength(1);
      expect(c.solution.filter((m) => m.type === 'remove')).toHaveLength(1);
      expect(validateSolution(makeRules(ALL_OPS), c)).toBe(true);
    }
    expect(found).toBeGreaterThan(0);
  });

  it('respekterer tillatte operasjoner i løsningen', () => {
    const spec = { ...base, allowedOps: ['swap'] as const };
    let found = 0;
    for (let seed = 0; seed < 30 && found < 5; seed++) {
      const c = generateCandidate(spec, createRng(seed));
      if (c === null) continue;
      found++;
      expect(c.solution.every((m) => m.type === 'swap')).toBe(true);
      expect(validateSolution(makeRules(['swap']), c)).toBe(true);
    }
    expect(found).toBeGreaterThan(0);
  });

  it('låste brikker forblir låste og flyttes aldri av løsningen', () => {
    const spec = { ...base, lockedCount: 2, scrambleSteps: 4 };
    let found = 0;
    for (let seed = 0; seed < 50 && found < 5; seed++) {
      const c = generateCandidate(spec, createRng(seed));
      if (c === null) continue;
      found++;
      expect(c.tiles.filter((t) => t.locked)).toHaveLength(2);
      expect(validateSolution(makeRules(ALL_OPS), c)).toBe(true);
    }
    expect(found).toBeGreaterThan(0);
  });

  it('er deterministisk for samme seed', () => {
    const a = generateCandidate(base, createRng(77));
    const b = generateCandidate(base, createRng(77));
    expect(a === null ? null : symbolKey(a.tiles)).toEqual(b === null ? null : symbolKey(b.tiles));
    expect(a?.solution).toEqual(b?.solution);
  });
});

describe('validateSolution', () => {
  it('avviser løsning som ikke ender i palindrom', () => {
    const c = { tiles: tilesFromString('ABC'), hand: { wild: 0, remove: 0 }, solution: [{ type: 'swap' as const, a: 0, b: 1 }] };
    expect(validateSolution(makeRules(ALL_OPS), c)).toBe(false);
  });
  it('avviser løsning som bruker mer hånd enn den har', () => {
    const c = { tiles: tilesFromString('ABC'), hand: { wild: 0, remove: 0 }, solution: [{ type: 'insertWild' as const, at: 0 }] };
    expect(validateSolution(makeRules(ALL_OPS), c)).toBe(false);
  });
});
