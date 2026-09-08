import { describe, expect, it } from 'vitest';
import { createRng, hashString, pick, randInt, shuffle } from '../rng';

describe('createRng', () => {
  it('samme seed gir samme sekvens', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('ulik seed gir ulik sekvens', () => {
    expect(createRng(1)()).not.toBe(createRng(2)());
  });
  it('verdier ligger i [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('hashString', () => {
  it('er deterministisk og ikke-negativ', () => {
    expect(hashString('w1-01')).toBe(hashString('w1-01'));
    expect(hashString('w1-01')).not.toBe(hashString('w1-02'));
    expect(hashString('')).toBeGreaterThanOrEqual(0);
  });
});

describe('randInt', () => {
  it('dekker hele intervallet inklusivt', () => {
    const rng = createRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) seen.add(randInt(rng, 2, 4));
    expect([...seen].sort()).toEqual([2, 3, 4]);
  });
});

describe('pick og shuffle', () => {
  it('pick kaster på tom liste', () => {
    expect(() => pick(createRng(1), [])).toThrow();
  });
  it('shuffle er en permutasjon og muterer ikke', () => {
    const src = [1, 2, 3, 4, 5];
    const out = shuffle(createRng(9), src);
    expect(src).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual(src);
  });
});
