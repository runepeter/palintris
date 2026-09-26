import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { canBecomePalindrome, isPalindrome, matches, mismatchCount } from '../palindrome';
import { makeRules } from '../rules';
import { solve } from '../solver';
import { tilesFromString } from '../tiles';

describe('isPalindrome', () => {
  it.each([
    ['ABA', true],
    ['ABBA', true],
    ['ABC', false],
    ['*BA', true],
    ['AB*A', true],
    ['A*C', false],
    ['*BC*', false],
    ['aba', true],
    ['abc', false],
  ])('%s -> %s', (s, expected) => {
    expect(isPalindrome(tilesFromString(s))).toBe(expected);
  });
});

describe('matches', () => {
  it('joker matcher alt, låst matcher på symbol', () => {
    const [a, star, c] = tilesFromString('A*c');
    expect(matches(a!, star!)).toBe(true);
    expect(matches(star!, c!)).toBe(true);
    expect(matches(a!, c!)).toBe(false);
  });
});

describe('mismatchCount', () => {
  it('teller par som ikke matcher', () => {
    expect(mismatchCount(tilesFromString('ABCD'))).toBe(2);
    expect(mismatchCount(tilesFromString('ABCBA'))).toBe(0);
    expect(mismatchCount(tilesFromString('AB*BX'))).toBe(1);
  });
});

describe('canBecomePalindrome', () => {
  it.each([
    ['AB', 0, 0, false],
    ['AAB', 0, 0, true],
    ['ABC', 1, 0, false],
    ['ABC', 1, 1, true],
    ['ABC', 0, 2, true],
    ['AB*C', 0, 0, false],
    ['AB*C', 1, 0, true],
    ['CBCECEE', 1, 0, false],
    ['CBCECEE', 1, 1, true],
  ] as const)('%s med joker %i og fjern %i gir %s', (s, wild, remove, expected) => {
    expect(canBecomePalindrome(tilesFromString(s), { wild, remove })).toBe(expected);
  });

  it('melder aldri blindvei der løseren finner en løsning', () => {
    const rules = makeRules(['swap', 'rotate', 'mirror', 'insertWild', 'remove']);
    fc.assert(fc.property(
      fc.stringOf(fc.constantFrom('A', 'B', 'C', 'D', '*', 'a'), { minLength: 3, maxLength: 7 }),
      fc.integer({ min: 0, max: 1 }), fc.integer({ min: 0, max: 1 }),
      (s, wild, remove) => {
        const tiles = tilesFromString(s);
        const hand = { wild, remove };
        if (canBecomePalindrome(tiles, hand)) return;
        expect(solve({ rules, tiles, hand, maxMoves: 6, limits: { states: 200_000 } }).status).not.toBe('solved');
      },
    ), { numRuns: 300, seed: 27 });
  });
});
