import { describe, expect, it } from 'vitest';
import { createBoard } from '../../../src/core/board';
import { makeRules } from '../../../src/core/rules';
import { makeTile, tilesFromString } from '../../../src/core/tiles';
import { applyMove } from '../../../src/core/step';
import { makeRequest, playPuzzle, validateManifest, FIXTURES, type Puzzle } from '../game';

const puzzle: Puzzle = { id: 'x', split: 'train', tiles: tilesFromString('AAB'), hand: { wild: 0, remove: 0 }, ops: ['swap'], budget: 2 };
describe('sidecar engine boundary', () => {
  it('replays a selected move through the engine and measures oracle gap', async () => {
    const result = await playPuzzle(puzzle, 'policy', r => Promise.resolve(r.choices.find(c => c.command.type === 'swap' && c.command.a === 1)!.id));
    expect(result).toMatchObject({ outcome: 'solved', moves: 1, optimum: 1, excess: 0, stars: 3 });
    expect(result.trace[0]?.after.map(t => t.symbol).join('')).toBe('ABA');
  });
  it('never exposes an injected answer or oracle field to the player', () => {
    const withSecrets = { ...puzzle, solution: 'SENTINEL', seed: 555, optimum: 1 };
    const request = makeRequest(withSecrets, createBoard(puzzle.tiles, puzzle.hand), 'policy', []);
    const text = JSON.stringify(request);
    expect(text).not.toMatch(/SENTINEL|solution|seed|optimum|target|solveStatus/);
    expect(request.observation).toMatchObject({ movesUsed: 0, budget: 2 });
  });
  it('filters sticky conflicts before listing choices', () => {
    const sticky = { ...puzzle, ops: ['swap', 'rotate', 'mirror', 'remove'] as const, hand: { wild: 0, remove: 1 }, tiles: [makeTile(0, 'A', { sticky: true }), makeTile(1, 'B'), makeTile(2, 'C'), makeTile(3, 'A')] };
    const board = createBoard(sticky.tiles, sticky.hand);
    const request = makeRequest(sticky, board, 'p', []);
    expect(request.choices.length).toBeGreaterThan(0);
    expect(request.choices.every(c => applyMove(makeRules(sticky.ops), board, c.command).ok)).toBe(true);
    expect(request.choices.some(c => c.command.type === 'remove')).toBe(false);
  });
  it('does not fall back on illegal actions or model failure', async () => {
    await expect(playPuzzle(puzzle, 'p', () => Promise.resolve('missing'))).rejects.toThrow(/choice/);
    await expect(playPuzzle(puzzle, 'p', () => Promise.reject(new Error('offline')))).rejects.toThrow('offline');
  });
  it('records an unsolved budget exhaustion separately from failure', async () => {
    const result = await playPuzzle({ ...puzzle, budget: 1 }, 'p', () => Promise.resolve('m0'));
    expect(result.outcome).toBe('budget');
    expect(result.stars).toBe(0);
  });
  it('keeps historical requests immutable and actually covers a locked tile', async () => {
    let turn = 0;
    const result = await playPuzzle(puzzle, 'p', () => Promise.resolve(turn++ === 0 ? 'm0' : 'm1'));
    expect(result.trace[0]?.request.observation.history).toEqual([]);
    expect(result.trace[1]?.request.observation.history).toEqual([{ type: 'swap', a: 0, b: 1 }]);
    expect(FIXTURES.find(p => p.id === 'holdout-locked')?.tiles.some(t => t.locked)).toBe(true);
  });
  it('rejects puzzle IDs that could escape the output directory', () => {
    expect(() => validateManifest([{ ...puzzle, id: '../../escape' }])).toThrow(/Invalid puzzle/);
  });
  it('rejects duplicate, negative and fractional tile identities', () => {
    for (const bad of [0, -1, 1.5]) {
      const tiles = puzzle.tiles.map((t, i) => i === 1 ? { ...t, id: bad } : t);
      expect(() => validateManifest([{ ...puzzle, tiles }])).toThrow(/tile/);
    }
  });
  it('validates quota literals and distinguishes their manifest states', () => {
    const limited = (movesLeft: number): Puzzle => ({ ...puzzle, id: `q${movesLeft}`, tiles: puzzle.tiles.map(t => t.id === 1 ? { ...t, movesLeft } : t) });
    for (const quota of [-1, 1.5, 2 ** 54]) expect(() => validateManifest([{ ...limited(quota), id: 'invalid' }])).toThrow(/quota/i);
    expect(validateManifest([puzzle, limited(1), limited(2)])).toHaveLength(3);
    expect(validateManifest(FIXTURES)[0]).toBe('663d4bb67148580fd3ec9856e864ba58feec937b23b9e83e09408695dfd6d7ed');
    const exhausted = { ...puzzle, tiles: puzzle.tiles.map(t => t.id === 0 ? { ...t, movesLeft: 0 } : t) };
    const request = makeRequest(exhausted, createBoard(exhausted.tiles, exhausted.hand), 'p', []);
    expect(request.choices.map(c => c.command)).toEqual([{ type: 'swap', a: 1, b: 2 }]);
    expect(request.observation.tiles[0]?.movesLeft).toBe(0);
  });
  it('rejects cross-split duplicate states even with different IDs', () => {
    expect(() => validateManifest([puzzle, { ...puzzle, id: 'other', split: 'holdout' }])).toThrow(/duplicate/i);
    expect(validateManifest(FIXTURES).length).toBe(FIXTURES.length);
  });
});
