import { describe, expect, it } from 'vitest';
import { apply, createBoard } from '../board';
import { makeRules } from '../rules';
import { applyMove } from '../step';
import { makeSnapshot, makeTile, tilesFromString } from '../tiles';

const hand = { wild: 0, remove: 0 };
const rules = makeRules(['swap', 'rotate', 'mirror']);
const limited = (s: string, quotas: Record<number, number>) => tilesFromString(s).map((t) =>
  quotas[t.id] === undefined ? t : { ...t, movesLeft: quotas[t.id]! });

describe('flyttekvote', () => {
  it('avviser kvoter der ett flytt ikke kan trekkes fra nøyaktig', () => {
    const movesLeft = 2 ** 54;
    expect(movesLeft - 1).toBe(movesLeft);
    expect(() => makeTile(0, 'A', { movesLeft })).toThrow();
    expect(makeTile(0, 'A', { movesLeft: Number.MAX_SAFE_INTEGER }).movesLeft).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('bevarer null og positiv kvote, avviser ugyldige tall', () => {
    expect(makeTile(0, 'A', { movesLeft: 0 }).movesLeft).toBe(0);
    expect(makeTile(0, 'A', { movesLeft: 2 }).movesLeft).toBe(2);
    for (const movesLeft of [-1, 0.5, NaN, Infinity]) {
      expect(() => makeTile(0, 'A', { movesLeft })).toThrow();
    }
    expect(makeTile(0, 'A')).not.toHaveProperty('movesLeft');
  });

  it('belaster begge identiteter selv ved like symboler, uten mutasjon', () => {
    const snap = makeSnapshot(limited('AAB', { 0: 2, 1: 1 }), hand);
    const result = applyMove(rules, snap, { type: 'swap', a: 0, b: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tiles.map((t) => [t.id, t.movesLeft])).toEqual([[1, 0], [0, 1], [2, undefined]]);
    expect(snap.tiles.map((t) => t.movesLeft)).toEqual([2, 1, undefined]);
    expect(result.value.tiles[2]).toBe(snap.tiles[2]);
  });

  it('avviser hele byttet når en deltaker er tom, også med historikk', () => {
    const initial = createBoard(limited('ABCA', { 0: 2, 1: 0 }), hand);
    const first = apply(rules, initial, { type: 'swap', a: 2, b: 3 });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const before = structuredClone(first.value);
    expect(apply(rules, first.value, { type: 'swap', a: 0, b: 1 })).toEqual({ ok: false, reason: 'quotaExhausted' });
    expect(first.value).toEqual(before);
  });

  it.each(['left', 'right'] as const)('rotasjon %s belaster også brikken som går rundt', (dir) => {
    const snap = makeSnapshot(limited('ABC', { 0: 2, 1: 1, 2: 3 }), hand);
    const result = applyMove(rules, snap, { type: 'rotate', from: 0, to: 2, dir });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect([...result.value.tiles].sort((a, b) => a.id - b.id).map((t) => t.movesLeft)).toEqual([1, 0, 2]);
    expect(applyMove(rules, result.value, { type: 'rotate', from: 0, to: 2, dir })).toEqual({ ok: false, reason: 'quotaExhausted' });
  });

  it('speil beholder urørt midtbrikke med null kvote', () => {
    const snap = makeSnapshot(limited('ABC', { 0: 1, 1: 0, 2: 2 }), hand);
    const result = applyMove(rules, snap, { type: 'mirror', from: 0, to: 2 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tiles.map((t) => [t.id, t.movesLeft])).toEqual([[2, 1], [1, 0], [0, 0]]);
    expect(result.value.tiles[1]).toBe(snap.tiles[1]);
  });

  it('angre og reset gjenoppretter kvoter og identiteter', () => {
    const initial = createBoard(limited('AABAB', { 2: 2 }), hand);
    const first = apply(rules, initial, { type: 'swap', a: 1, b: 2 });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = apply(rules, first.value, { type: 'swap', a: 0, b: 1 });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value.tiles[0]?.movesLeft).toBe(0);
    const undo = apply(rules, second.value, { type: 'undo' });
    expect(undo.ok && undo.value.tiles).toEqual(first.value.tiles);
    const reset = apply(rules, second.value, { type: 'reset' });
    expect(reset.ok && reset.value.tiles).toEqual(initial.tiles);
    expect(initial.tiles[2]?.movesLeft).toBe(2);
  });
});
