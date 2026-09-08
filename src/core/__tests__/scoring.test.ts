import { describe, expect, it } from 'vitest';
import { budgetFor, starsFor } from '../scoring';

describe('budgetFor', () => {
  it('er mål pluss slakk', () => {
    expect(budgetFor(3, 4)).toBe(7);
  });
});

describe('starsFor', () => {
  it.each([
    [3, 3, 7, 3],
    [2, 3, 7, 3],
    [4, 3, 7, 2],
    [5, 3, 7, 2],
    [6, 3, 7, 1],
    [7, 3, 7, 1],
    [8, 3, 7, 0],
  ])('movesUsed=%i mål=%i budsjett=%i -> %i stjerner', (moves, target, budget, stars) => {
    expect(starsFor(moves, target, budget)).toBe(stars);
  });
});
