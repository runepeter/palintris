import { describe, expect, it } from 'vitest';
import { apply, createBoard } from '../../core/board';
import type { MoveCommand } from '../../core/commands';
import { isPalindrome } from '../../core/palindrome';
import { legalMoves } from '../../core/solver';
import { stateKey } from '../../core/solver';
import type { StorageLike } from '../../core/storage';
import type { ModeLevel } from '../modes/types';
import { EXPEDITION_ROOMS, EXPEDITION_SAVE_KEY, ExpeditionMode, RELICS } from '../modes/expedition';

const storage = (): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
};

const solution = (level: ModeLevel): MoveCommand[] => {
  const start = createBoard(level.tiles, level.hand);
  const queue = [{ board: start, path: [] as MoveCommand[] }];
  const seen = new Set([stateKey(start.tiles, start.hand)]);
  for (let head = 0; head < queue.length; head++) {
    const item = queue[head]!;
    if (isPalindrome(item.board.tiles)) return item.path;
    if (item.path.length >= level.budget) continue;
    for (const move of legalMoves(level.rules, item.board)) {
      const result = apply(level.rules, item.board, move);
      if (!result.ok) continue;
      const key = stateKey(result.value.tiles, result.value.hand);
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ board: result.value, path: [...item.path, move] });
    }
  }
  throw new Error(`No solution for ${level.id}`);
};

const solveRoom = (mode: ExpeditionMode): void => {
  const floor = mode.state!.floor;
  expect(mode.chooseRoute(floor % 3 === 0 ? 'guardian' : 'risk')).toBe(true);
  const level = mode.load('current')!;
  const path = solution(level);
  expect(path.length).toBe(level.target);
  for (const command of path) expect(mode.recordCommand(command)).toBe(true);
  expect(mode.onSolved(level.id, path.length).stars).toBe(3);
};

describe('ExpeditionMode', () => {
  it('generates deterministic exact solvable boards across seeds, floors, routes and relic rules', () => {
    const relicSets = [Object.keys(RELICS).slice(0, 4), Object.keys(RELICS).slice(2, 6),
      ['rotation', 'recovery', 'mirror', 'multiplier']];
    for (const seed of [0, 1, 17, 0x7fffffff]) {
      for (let floor = 1; floor <= EXPEDITION_ROOMS; floor++) {
        for (const route of floor % 3 === 0 ? ['guardian'] as const : ['safe', 'risk'] as const) {
          for (const relics of relicSets) {
            const store = storage();
            const mode = new ExpeditionMode(store);
            mode.start(seed);
            store.data.set(EXPEDITION_SAVE_KEY, JSON.stringify({
              version: 1, records: mode.records,
              state: { ...mode.state, floor, relics: relics.slice(0, Math.floor((floor - 1) / 2)), phase: 'route' },
            }));
            const restored = new ExpeditionMode(store);
            expect(restored.chooseRoute(route)).toBe(true);
            const level = restored.load('current')!;
            expect(level.targetExact).toBe(true);
            expect(level.showBudget).toBe(true);
            if (floor % 3 === 0) expect(level.target).toBeGreaterThanOrEqual(2);
            if (floor >= 4 && floor % 3 !== 0) expect(level.target).toBeGreaterThanOrEqual(2);
            if (floor >= 7 && floor % 3 !== 0) expect(level.target).toBeGreaterThanOrEqual(3);
            if (floor === 9) expect(level.target, `${seed}:${relics.join(',')}`).toBeGreaterThanOrEqual(3);
            expect(solution(level)).toHaveLength(level.target);
            expect(new ExpeditionMode(store).load('current')).toEqual(level);
          }
        }
      }
    }
  });

  it('checks route gates, legal forward commands, budget and exact replay before award', () => {
    const mode = new ExpeditionMode(storage());
    mode.start(7);
    expect(mode.chooseRoute('guardian')).toBe(false);
    expect(mode.chooseRoute('risk')).toBe(true);
    expect(mode.chooseRoute('safe')).toBe(false);
    const level = mode.load('current')!;
    expect(mode.recordCommand({ type: 'undo' })).toBe(false);
    expect(mode.recordCommand({ type: 'reset' })).toBe(false);
    expect(mode.recordCommand({ type: 'swap', a: -1, b: 0 })).toBe(false);
    expect(mode.onSolved('wrong', 0).stars).toBe(0);
    expect(mode.onSolved(level.id, 1).stars).toBe(0);
    const path = solution(level);
    for (const command of path) expect(mode.recordCommand(command)).toBe(true);
    expect(mode.onSolved(level.id, path.length + 1).stars).toBe(0);
    expect(mode.onSolved(level.id, path.length).stars).toBe(3);
    const score = mode.state!.score;
    expect(mode.onSolved(level.id, path.length).stars).toBe(0);
    expect(mode.state!.score).toBe(score);
  });

  it('resumes a partial attempt, rejects tampered commands, and preserves records', () => {
    const store = storage();
    const mode = new ExpeditionMode(store);
    mode.start(20);
    mode.chooseRoute('safe');
    const level = mode.load('current')!;
    const path = solution(level);
    mode.recordCommand(path[0]!);
    const resumed = new ExpeditionMode(store);
    expect(resumed.state!.commands).toEqual([path[0]]);
    expect(resumed.load('current')).toEqual(level);
    for (const command of path.slice(1)) expect(resumed.recordCommand(command)).toBe(true);
    expect(resumed.onSolved(level.id, path.length).stars).toBe(3);
    const raw = JSON.parse(store.data.get(EXPEDITION_SAVE_KEY)!) as { state: unknown };
    raw.state = { ...mode.state, commands: [{ type: 'swap', a: -4, b: 0 }] };
    store.data.set(EXPEDITION_SAVE_KEY, JSON.stringify(raw));
    const corrupt = new ExpeditionMode(store);
    expect(corrupt.state).toBeNull();
    expect(corrupt.records).toEqual(resumed.records);
  });

  it('rejects saves with relic counts impossible for their floor and phase', () => {
    const store = storage();
    const mode = new ExpeditionMode(store);
    mode.start(8);
    const original = JSON.parse(store.data.get(EXPEDITION_SAVE_KEY)!) as { state: unknown; records: unknown };
    const records = { bestScore: 420, wins: 1, runs: 2 };
    for (const state of [
      { ...mode.state, floor: 1, relics: ['rotation'] },
      { ...mode.state, floor: 3, phase: 'reward', relics: ['rotation'] },
      { ...mode.state, floor: 9, phase: 'reward', relics: ['rotation', 'mirror', 'extraMove', 'recovery'] },
      { ...mode.state, floor: 9, phase: 'route', relics: ['rotation', 'mirror', 'extraMove'] },
    ]) {
      store.data.set(EXPEDITION_SAVE_KEY, JSON.stringify({ ...original, records, state }));
      const restored = new ExpeditionMode(store);
      expect(restored.state).toBeNull();
      expect(restored.records).toEqual(records);
    }
  });

  it('plays nine rooms, four distinct drafts, records a win once, and starts afresh', () => {
    const store = storage();
    const mode = new ExpeditionMode(store);
    mode.start(43);
    for (let floor = 1; floor <= EXPEDITION_ROOMS; floor++) {
      solveRoom(mode);
      if (floor < EXPEDITION_ROOMS && floor % 2 === 0) {
        expect(mode.state!.phase).toBe('reward');
        const offers = mode.offers();
        expect(offers).toHaveLength(3);
        expect(new Set(offers).size).toBe(3);
        expect(mode.claimRelic(offers[0]!)).toBe(true);
        expect(mode.claimRelic(offers[0]!)).toBe(false);
      }
    }
    expect(mode.state!.phase).toBe('won');
    expect(mode.state!.floor).toBe(9);
    expect(mode.records).toEqual({ bestScore: mode.state!.score, wins: 1, runs: 1 });
    expect(new ExpeditionMode(store).records).toEqual(mode.records);
    mode.start(44);
    expect(mode.state!.score).toBe(0);
    expect(mode.records.runs).toBe(1);
  });

  it('uses three lives on sacrifice, restarts route, and counts terminal loss once', () => {
    const mode = new ExpeditionMode(storage());
    mode.start(2);
    for (const lives of [2, 1, 0]) {
      expect(mode.chooseRoute('safe')).toBe(true);
      mode.fail();
      expect(mode.state!.lives).toBe(lives);
      expect(mode.state!.phase).toBe(lives ? 'route' : 'lost');
      expect(mode.state!.commands).toEqual([]);
    }
    mode.fail();
    expect(mode.records).toEqual({ bestScore: 0, wins: 0, runs: 1 });
  });

  it('applies move, perfect, multiplier and guardian recovery relic effects', () => {
    const store = storage();
    const fresh = new ExpeditionMode(store);
    fresh.start(5);
    const raw = JSON.parse(store.data.get(EXPEDITION_SAVE_KEY)!) as { state: unknown };
    raw.state = { ...fresh.state, floor: 9, lives: 2,
      relics: ['extraMove', 'perfectBonus', 'recovery', 'multiplier'] };
    store.data.set(EXPEDITION_SAVE_KEY, JSON.stringify(raw));
    const mode = new ExpeditionMode(store);
    expect(mode.chooseRoute('guardian')).toBe(true);
    const level = mode.load('current')!;
    expect(level.budget).toBe(level.target + 3);
    const path = solution(level);
    for (const step of path) mode.recordCommand(step);
    mode.onSolved('current', path.length);
    expect(mode.state!.lives).toBe(3);
    expect(mode.state!.lastResult).toEqual({ kind: 'solved', points: 563, perfect: true });
  });

  it('keeps playing when storage reads and writes are denied', () => {
    const denied: StorageLike = {
      getItem: () => { throw new Error('denied'); },
      setItem: () => { throw new Error('denied'); },
    };
    const mode = new ExpeditionMode(denied);
    mode.start(4);
    solveRoom(mode);
    expect(mode.state!.phase).toBe('route');
  });
});
