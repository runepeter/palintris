import { describe, expect, it } from 'vitest';
import { apply, createBoard } from '../../core/board';
import { isPalindrome } from '../../core/palindrome';
import { legalMoves, solve, stateKey } from '../../core/solver';
import { applyMove } from '../../core/step';
import type { Snapshot } from '../../core/tiles';
import { STICKY_LEVELS, StickyMode } from '../modes/sticky';

const mode = new StickyMode();

describe('StickyMode', () => {
  it('åpner tre prøvebrett uten kampanjeprogresjon', () => {
    expect(mode.load('')?.id).toBe('sticky-01');
    expect(mode.load('w1-01')).toBeNull();
    for (const definition of STICKY_LEVELS) {
      const level = mode.load(definition.id)!;
      expect(mode.isUnlocked(level.id)).toBe(true);
      expect([...level.rules.allowedOps]).toEqual(['swap']);
      expect(level.hand).toEqual({ wild: 0, remove: 0 });
      expect(level.budget).toBeGreaterThanOrEqual(level.target + 5);
      expect(mode.onSolved(level.id, level.target)).toMatchObject({
        stars: 3, previousStars: 0, worldJustUnlocked: null,
      });
    }
    expect(mode.onSolved('sticky-01', 2).nextLevelId).toBe('sticky-02');
    expect(mode.onSolved('sticky-02', 3).nextLevelId).toBe('sticky-03');
    expect(mode.onSolved('sticky-03', 3)).toMatchObject({ nextLevelId: null, nextUnlocked: false });
  });

  it.each(STICKY_LEVELS)('$id har en lovlig og kortest mulig løsning', (definition) => {
    const level = mode.load(definition.id)!;
    let board = createBoard(level.tiles, level.hand);
    expect(isPalindrome(board.tiles)).toBe(false);
    for (const command of definition.solution) {
      const result = apply(level.rules, board, command);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.reason);
      board = result.value;
    }
    expect(isPalindrome(board.tiles)).toBe(true);
    expect(board.movesUsed).toBe(level.target);
    expect(solve({ ...level, maxMoves: level.target, limits: { states: 10000 } }))
      .toEqual({ status: 'solved', moves: level.target });
  });

  it('første brett lærer å danne en ny kobling', () => {
    const level = mode.load('sticky-01')!;
    const start = createBoard(level.tiles, level.hand);
    expect(start.tiles.some((tile) => tile.bondedTo !== undefined)).toBe(false);
    const result = apply(level.rules, start, STICKY_LEVELS[0]!.solution[0]!);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tiles.filter((tile) => tile.bondedTo !== undefined)).toHaveLength(2);
    expect(isPalindrome(result.value.tiles)).toBe(false);
  });

  it('andre brett kan ikke løses uten å flytte et bundet par', () => {
    const level = mode.load('sticky-02')!;
    const start = createBoard(level.tiles, level.hand);
    expect(start.tiles.filter((tile) => tile.bondedTo !== undefined)).toHaveLength(2);
    const queue: Snapshot[] = [start];
    const seen = new Set([stateKey(start.tiles, start.hand)]);
    for (const state of queue) {
      expect(isPalindrome(state.tiles)).toBe(false);
      for (const command of legalMoves(level.rules, state)) {
        if (command.type !== 'swap') continue;
        if (state.tiles[command.a]!.bondedTo !== undefined || state.tiles[command.b]!.bondedTo !== undefined) continue;
        const result = applyMove(level.rules, state, command);
        if (!result.ok) continue;
        const key = stateKey(result.value.tiles, result.value.hand);
        if (seen.has(key)) continue;
        seen.add(key);
        queue.push(result.value);
      }
    }
  });

  it('tredje brett belønner å vente med koblingen', () => {
    const level = mode.load('sticky-03')!;
    const start = createBoard(level.tiles, level.hand);
    const patient = apply(level.rules, start, STICKY_LEVELS[2]!.solution[0]!);
    const early = apply(level.rules, start, { type: 'swap', a: 0, b: 1 });
    expect(patient.ok && early.ok).toBe(true);
    if (!patient.ok || !early.ok) return;
    expect(patient.value.tiles.some((tile) => tile.bondedTo !== undefined)).toBe(false);
    expect(early.value.tiles.filter((tile) => tile.bondedTo !== undefined)).toHaveLength(2);
    expect(solve({ ...level, tiles: early.value.tiles, maxMoves: 8, limits: { states: 10000 } }))
      .toEqual({ status: 'solved', moves: 3 });
    expect(solve({ ...level, tiles: patient.value.tiles, maxMoves: 8, limits: { states: 10000 } }))
      .toEqual({ status: 'solved', moves: 2 });
    const undo = apply(level.rules, early.value, { type: 'undo' });
    expect(undo.ok && undo.value.tiles).toEqual(start.tiles);
  });
});
