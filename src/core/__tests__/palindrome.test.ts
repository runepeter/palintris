import { describe, expect, it } from 'vitest';
import { isPalindrome, matches, mismatchCount } from '../palindrome';
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
