import { describe, expect, it } from 'vitest';
import { validateSolution } from '../generator';
import type { Recipe } from '../level';
import { levelSeed, makeLevel, rulesFor } from '../level';
import { isPalindrome } from '../palindrome';
import { solve } from '../solver';
import { symbolKey } from '../tiles';

const swapWorld: Recipe = {
  id: 'w1',
  lengthRange: [4, 6],
  alphabet: 3,
  allowedOps: ['swap'],
  movesRange: [1, 4],
  slack: 4,
  hand: { wild: 0, remove: 0 },
  lockedRange: [0, 0],
  scrambleRange: [1, 4],
  solverStates: 20000,
};

const rotateWorld: Recipe = {
  ...swapWorld,
  id: 'w2',
  lengthRange: [5, 5],
  alphabet: 4,
  allowedOps: ['swap', 'rotate'],
  movesRange: [2, 5],
  scrambleRange: [2, 5],
};

const lockWorld: Recipe = {
  ...rotateWorld,
  id: 'w4',
  lengthRange: [7, 7],
  allowedOps: ['swap', 'rotate', 'mirror'],
  lockedRange: [1, 2],
  movesRange: [2, 6],
};

describe('makeLevel', () => {
  it('lager nivå med mål, budsjett og gyldig løsning', () => {
    const level = makeLevel(swapWorld, { id: 'w1-01', contentVersion: 1 });
    expect(level).not.toBeNull();
    if (level === null) return;
    expect(level.id).toBe('w1-01');
    expect(level.seed).toBe(levelSeed(1, 'w1-01'));
    expect(isPalindrome(level.tiles)).toBe(false);
    expect(level.budget).toBe(level.target + swapWorld.slack);
    expect(level.target).toBeGreaterThanOrEqual(1);
    expect(level.target).toBeLessThanOrEqual(4);
    expect(level.targetExact).toBe(true);
    expect(validateSolution(rulesFor(level), level)).toBe(true);
  });

  it('er deterministisk', () => {
    const a = makeLevel(swapWorld, { id: 'w1-03', contentVersion: 1 });
    const b = makeLevel(swapWorld, { id: 'w1-03', contentVersion: 1 });
    expect(a).toEqual(b);
  });

  it('endrer brett når contentVersion endres', () => {
    const a = makeLevel(swapWorld, { id: 'w1-03', contentVersion: 1 });
    const b = makeLevel(swapWorld, { id: 'w1-03', contentVersion: 2 });
    expect(a !== null && b !== null && symbolKey(a.tiles) === symbolKey(b.tiles)).toBe(false);
  });

  it('hopper over duplikater', () => {
    const a = makeLevel(swapWorld, { id: 'w1-05', contentVersion: 1 });
    expect(a).not.toBeNull();
    if (a === null) return;
    const b = makeLevel(swapWorld, { id: 'w1-05', contentVersion: 1, previousKeys: [symbolKey(a.tiles)] });
    expect(b).not.toBeNull();
    if (b === null) return;
    expect(symbolKey(b.tiles)).not.toBe(symbolKey(a.tiles));
  });

  it('mål er eksakt minimum når løseren fullfører', () => {
    const level = makeLevel(rotateWorld, { id: 'w2-04', contentVersion: 1 });
    expect(level).not.toBeNull();
    if (level === null) return;
    const res = solve({ rules: rulesFor(level), tiles: level.tiles, hand: level.hand, maxMoves: 8, limits: { states: 100000 } });
    expect(res).toEqual({ status: 'solved', moves: level.target });
  });

  it('introOf rotate gir brett som ikke kan løses uten rotate innen mål', () => {
    const level = makeLevel(rotateWorld, { id: 'w2-01', contentVersion: 1, introOf: 'rotate', attempts: 200 });
    expect(level).not.toBeNull();
    if (level === null) return;
    const res = solve({ rules: rulesFor({ allowedOps: ['swap'] }), tiles: level.tiles, hand: level.hand, maxMoves: level.target, limits: { states: 100000 } });
    expect(res.status).toBe('unreachableWithinBudget');
  });

  it('introOf locked gir brett der låsen øker minimum', () => {
    const level = makeLevel(lockWorld, { id: 'w4-01', contentVersion: 1, introOf: 'locked', attempts: 300 });
    expect(level).not.toBeNull();
    if (level === null) return;
    expect(level.tiles.some((t) => t.locked)).toBe(true);
    const unlocked = level.tiles.map((t) => ({ ...t, locked: false }));
    const res = solve({ rules: rulesFor(level), tiles: unlocked, hand: level.hand, maxMoves: level.target - 1, limits: { states: 200000 } });
    expect(res.status).toBe('solved');
  });

  it('gir null når ingen kandidat passerer', () => {
    const impossible: Recipe = { ...swapWorld, movesRange: [9, 9], scrambleRange: [1, 1] };
    expect(makeLevel(impossible, { id: 'x', contentVersion: 1, attempts: 5 })).toBeNull();
  });
});
