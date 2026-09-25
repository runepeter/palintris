import { apply, createBoard } from '../../core/board';
import type { BoardState } from '../../core/board';
import type { Command } from '../../core/commands';
import { makeLevel, rulesFor } from '../../core/level';
import type { Recipe } from '../../core/level';
import { isPalindrome } from '../../core/palindrome';
import { createRng, hashString, shuffle } from '../../core/rng';
import { starsFor } from '../../core/scoring';
import { solve } from '../../core/solver';
import type { StorageLike } from '../../core/storage';
import { tilesFromString } from '../../core/tiles';
import type { BoardMode, ModeLevel, SolvedOutcome } from './types';

export const EXPEDITION_SAVE_KEY = 'palintris.expedition.v1';
export const EXPEDITION_ROOMS = 9;
const VERSION = 1;
const MAX_COMMANDS = 12;

export const RELICS = {
  rotation: { name: 'Kompass', description: 'Lås opp rotasjon av brikker.', glyph: '↻' },
  mirror: { name: 'Speilskår', description: 'Lås opp speiling av segmenter.', glyph: '◇' },
  extraMove: { name: 'Ekstra steg', description: 'Ett ekstra trekk i hvert rom.', glyph: '+' },
  perfectBonus: { name: 'Gullsegl', description: '100 ekstra poeng for perfekt løsning.', glyph: '✦' },
  recovery: { name: 'Livsfrø', description: 'Få tilbake ett liv etter en vokter.', glyph: '♥' },
  multiplier: { name: 'Runemynt', description: '25 % flere poeng fra hvert rom.', glyph: '×1,25' },
} as const;

export type RelicId = keyof typeof RELICS;
export type RouteKind = 'safe' | 'risk' | 'guardian';
export type ExpeditionPhase = 'route' | 'board' | 'reward' | 'won' | 'lost';

export interface ExpeditionState {
  readonly seed: number;
  readonly floor: number;
  readonly phase: ExpeditionPhase;
  readonly lives: number;
  readonly score: number;
  readonly streak: number;
  readonly relics: RelicId[];
  readonly route: RouteKind | null;
  readonly commands: Command[];
  readonly lastResult: { kind: 'solved' | 'failed'; points: number; perfect: boolean } | null;
}

export interface ExpeditionRecords {
  readonly bestScore: number;
  readonly wins: number;
  readonly runs: number;
}

const NOTHING: SolvedOutcome = {
  stars: 0, previousStars: 0, nextLevelId: null, nextUnlocked: false, worldJustUnlocked: null,
};
const EMPTY_RECORDS: ExpeditionRecords = { bestScore: 0, wins: 0, runs: 0 };
const RELIC_IDS = Object.keys(RELICS) as RelicId[];
const integer = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const relic = (value: unknown): value is RelicId =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(RELICS, value);
const route = (value: unknown): value is RouteKind => value === 'safe' || value === 'risk' || value === 'guardian';
const command = (value: unknown): value is Command => {
  if (!object(value)) return false;
  switch (value['type']) {
    case 'swap': return integer(value['a'], 0, 13) && integer(value['b'], 0, 13);
    case 'rotate': return integer(value['from'], 0, 13) && integer(value['to'], 0, 13) &&
      (value['dir'] === 'left' || value['dir'] === 'right');
    case 'mirror': return integer(value['from'], 0, 13) && integer(value['to'], 0, 13);
    default: return false;
  }
};

const parseRecords = (value: unknown): ExpeditionRecords => {
  if (!object(value) || !integer(value['bestScore'], 0, 1_000_000_000) ||
      !integer(value['wins'], 0, 1_000_000) || !integer(value['runs'], 0, 1_000_000) ||
      value['wins'] > value['runs']) return EMPTY_RECORDS;
  return { bestScore: value['bestScore'], wins: value['wins'], runs: value['runs'] };
};

const parseState = (value: unknown): ExpeditionState | null => {
  if (!object(value)) return null;
  const { seed, floor, phase, lives, score, streak, relics, route: selected, commands, lastResult } = value;
  if (!integer(seed, 0, 0xffffffff) || !integer(floor, 1, EXPEDITION_ROOMS) ||
      (phase !== 'route' && phase !== 'board' && phase !== 'reward' && phase !== 'won' && phase !== 'lost') ||
      !integer(lives, 0, 3) || !integer(score, 0, 1_000_000_000) || !integer(streak, 0, 9) ||
      !Array.isArray(relics) || relics.length > 4 || !relics.every(relic) || new Set(relics).size !== relics.length ||
      !Array.isArray(commands) || commands.length > MAX_COMMANDS || !commands.every(command)) return null;
  if (selected !== null && !route(selected)) return null;
  if ((phase === 'board') !== (selected !== null)) return null;
  if (phase !== 'board' && commands.length > 0) return null;
  const expectedRelics = Math.floor((floor - 1) / 2) - Number(phase === 'reward');
  if (relics.length !== expectedRelics) return null;
  if (phase === 'board' && ((floor % 3 === 0) !== (selected === 'guardian'))) return null;
  if (phase === 'reward' && (floor % 2 !== 1 || floor < 3 || floor > 9)) return null;
  if (phase === 'won' && floor !== 9) return null;
  if ((phase === 'lost') !== (lives === 0)) return null;
  if (lastResult !== null && (!object(lastResult) ||
      (lastResult['kind'] !== 'solved' && lastResult['kind'] !== 'failed') ||
      !integer(lastResult['points'], 0, 100_000) || typeof lastResult['perfect'] !== 'boolean')) return null;
  return {
    seed, floor, phase, lives, score, streak, relics: [...relics], route: selected,
    commands: [...commands], lastResult: lastResult as ExpeditionState['lastResult'],
  };
};

const recipeFor = (floor: number, relics: readonly RelicId[]): Recipe => {
  const guardian = floor % 3 === 0;
  const length = floor <= 2 ? 5 : floor <= 5 ? 7 : floor === 6 ? 9 : 11;
  const movesRange: readonly [number, number] = guardian
    ? floor === 9 ? [3, 4] : [2, 3]
    : floor <= 3 ? [1, 2] : floor <= 6 ? [2, 3] : [3, 4];
  const allowedOps = ['swap', ...(relics.includes('rotation') ? ['rotate'] : []),
    ...(relics.includes('mirror') ? ['mirror'] : [])] as Recipe['allowedOps'];
  return {
    id: 'expedition', lengthRange: [length, length], alphabet: floor <= 3 ? 3 : floor <= 6 ? 4 : 5,
    allowedOps, movesRange, slack: 0,
    hand: { wild: 0, remove: 0 }, lockedRange: [0, 0],
    scrambleRange: guardian ? [3, 6] : floor <= 3 ? [2, 4] : floor <= 6 ? [3, 6] : [4, 7],
    solverStates: 6000,
  };
};

/** Bounded fallback from a palindrome with a verified exact swap path. */
const fallback = (floor: number, seed: number, allowedOps: Recipe['allowedOps'], minimum: number): ModeLevel => {
  const length = floor <= 2 ? 5 : floor <= 5 ? 7 : floor === 6 ? 9 : 11;
  const left = Array.from({ length: Math.floor(length / 2) }, (_, i) => 'ABCDE'[(seed + i) % 5] ?? 'A');
  const at = Math.max(0, Math.floor(length / 2) - 1);
  const palindrome = [...left, left[at] === 'C' ? 'D' : 'C', ...left.reverse()].join('');
  const rules = rulesFor({ allowedOps });
  const hand = { wild: 0, remove: 0 };
  const base = createBoard(tilesFromString(palindrome), hand);
  const candidate = (positions: readonly number[]): BoardState | null => {
    let board = base;
    for (const a of positions) {
      const next = apply(rules, board, { type: 'swap', a, b: a + 1 });
      if (!next.ok) return null;
      board = next.value;
    }
    return board;
  };
  const verified = (board: BoardState, target: number): ModeLevel | null => {
    const result = solve({ rules, tiles: board.tiles, hand, maxMoves: target, limits: { states: 50000 } });
    if (result.status !== 'solved' || result.moves !== target) return null;
    return { id: 'current', world: 0, n: floor, tiles: board.tiles, hand, rules,
      target, targetExact: true, budget: target, contentVersion: VERSION, showBudget: true };
  };
  if (minimum >= 3) {
    for (let a = 0; a < length - 3; a++) {
      for (let b = a + 1; b < length - 2; b++) {
        for (let c = b + 1; c < length - 1; c++) {
          const board = candidate([a, b, c]);
          if (board === null) continue;
          const level = verified(board, 3);
          if (level !== null) return level;
        }
      }
    }
  }
  if (minimum >= 2) {
    for (let a = 0; a < length - 2; a++) {
      for (let b = a + 1; b < length - 1; b++) {
        const board = candidate([a, b]);
        if (board === null) continue;
        const level = verified(board, 2);
        if (level !== null) return level;
      }
    }
  }
  const palindromeTiles = [...palindrome];
  const before = palindromeTiles[at];
  const after = palindromeTiles[at + 1];
  if (before !== undefined && after !== undefined) {
    palindromeTiles[at] = after;
    palindromeTiles[at + 1] = before;
  }
  return {
    id: 'current', world: 0, n: floor, tiles: tilesFromString(palindromeTiles.join('')),
    hand, rules, target: 1,
    targetExact: true, budget: 1, contentVersion: VERSION, showBudget: true,
  };
};

export class ExpeditionMode implements BoardMode {
  readonly kind = 'expedition' as const;
  private current: ExpeditionState | null = null;
  private best: ExpeditionRecords = EMPTY_RECORDS;
  private cache: { key: string; level: ModeLevel } | null = null;

  constructor(private readonly storage: StorageLike) {
    try {
      const raw: unknown = JSON.parse(storage.getItem(EXPEDITION_SAVE_KEY) ?? 'null');
      if (object(raw) && raw['version'] === VERSION) {
        this.best = parseRecords(raw['records']);
        const state = parseState(raw['state']);
        if (state !== null && this.validReplay(state)) this.current = state;
      }
    } catch { /* Storage denied or malformed: start from a clean in-memory run. */ }
  }

  get state(): ExpeditionState | null { return this.current; }
  get records(): ExpeditionRecords { return this.best; }

  start(seed: number): void {
    this.current = {
      seed: Number.isFinite(seed) ? seed >>> 0 : 0, floor: 1, phase: 'route', lives: 3,
      score: 0, streak: 0, relics: [], route: null, commands: [], lastResult: null,
    };
    this.cache = null;
    this.persist();
  }

  chooseRoute(selected: RouteKind): boolean {
    const state = this.current;
    if (state === null || state.phase !== 'route' || !route(selected) ||
        ((state.floor % 3 === 0) !== (selected === 'guardian'))) return false;
    this.current = { ...state, phase: 'board', route: selected, commands: [], lastResult: null };
    this.cache = null;
    this.persist();
    return true;
  }

  offers(): readonly RelicId[] {
    const state = this.current;
    if (state === null || state.phase !== 'reward') return [];
    return shuffle(createRng(hashString(`${state.seed}:${state.floor}:draft`)),
      RELIC_IDS.filter((id) => !state.relics.includes(id))).slice(0, 3);
  }

  claimRelic(id: RelicId): boolean {
    const state = this.current;
    if (state === null || state.relics.length >= 4 || !this.offers().includes(id)) return false;
    this.current = { ...state, phase: 'route', relics: [...state.relics, id], lastResult: null };
    this.cache = null;
    this.persist();
    return true;
  }

  fail(): void {
    const state = this.current;
    if (state === null || state.phase !== 'board') return;
    const lives = state.lives - 1;
    this.current = { ...state, lives, phase: lives === 0 ? 'lost' : 'route', route: null,
      commands: [], streak: 0, lastResult: { kind: 'failed', points: 0, perfect: false } };
    this.cache = null;
    if (lives === 0) this.finish(false);
    this.persist();
  }

  recordCommand(next: Command): boolean {
    const state = this.current;
    if (state === null || state.phase !== 'board' || !command(next)) return false;
    const level = this.load('current');
    if (level === null || state.commands.length >= level.budget) return false;
    let board = createBoard(level.tiles, level.hand);
    for (const previous of state.commands) {
      const result = apply(level.rules, board, previous);
      if (!result.ok) return false;
      board = result.value;
    }
    if (isPalindrome(board.tiles)) return false;
    const result = apply(level.rules, board, next);
    if (!result.ok) return false;
    this.current = { ...state, commands: [...state.commands, next] };
    this.persist();
    return true;
  }

  load(id: string): ModeLevel | null {
    const state = this.current;
    if (id !== 'current' || state === null || state.phase !== 'board' || state.route === null) return null;
    const key = `${state.seed}:${state.floor}:${state.route}:${state.relics.join(',')}`;
    if (this.cache?.key === key) return this.cache.level;
    const recipe = recipeFor(state.floor, state.relics);
    const level = makeLevel(recipe, { id: `expedition:${key}`, contentVersion: VERSION,
      requireExact: true, attempts: 24 });
    const basic = level === null ? fallback(state.floor, state.seed, recipe.allowedOps, recipe.movesRange[0]) : {
      id: 'current', world: 0, n: state.floor, tiles: level.tiles, hand: level.hand,
      rules: rulesFor(level), target: level.target, targetExact: true,
      budget: level.target, contentVersion: VERSION, showBudget: true,
    };
    const budget = basic.target + (state.route === 'safe' ? 3 : state.route === 'risk' ? 1 : 2) +
      (state.relics.includes('extraMove') ? 1 : 0);
    const mode = { ...basic, budget };
    this.cache = { key, level: mode };
    return mode;
  }

  isUnlocked(): boolean { return this.current?.phase === 'board'; }

  onSolved(id: string, moves: number): SolvedOutcome {
    const state = this.current;
    if (id !== 'current' || state === null || state.phase !== 'board' ||
        !integer(moves, 1, MAX_COMMANDS) || moves !== state.commands.length) return NOTHING;
    const level = this.load(id);
    if (level === null || moves > level.budget) return NOTHING;
    let board: BoardState = createBoard(level.tiles, level.hand);
    for (const step of state.commands) {
      const result = apply(level.rules, board, step);
      if (!result.ok) return NOTHING;
      board = result.value;
    }
    if (!isPalindrome(board.tiles) || board.movesUsed !== moves) return NOTHING;
    const perfect = moves <= level.target;
    const base = state.route === 'safe' ? 100 : state.route === 'risk' ? 180 : 300;
    const rawPoints = base + (perfect ? (state.relics.includes('perfectBonus') ? 150 : 50) : 0) +
      Math.min(state.streak, 8) * 15;
    const points = state.relics.includes('multiplier') ? Math.round(rawPoints * 1.25) : rawPoints;
    const floor = state.floor === EXPEDITION_ROOMS ? EXPEDITION_ROOMS : state.floor + 1;
    const phase: ExpeditionPhase = state.floor === EXPEDITION_ROOMS ? 'won' : state.floor % 2 === 0 ? 'reward' : 'route';
    this.current = { ...state, floor, phase, lives: Math.min(3, state.lives +
      (state.route === 'guardian' && state.relics.includes('recovery') ? 1 : 0)),
    score: state.score + points, streak: state.streak + 1, route: null, commands: [],
    lastResult: { kind: 'solved', points, perfect } };
    this.cache = null;
    if (phase === 'won') this.finish(true);
    this.persist();
    return { stars: starsFor(moves, level.target, level.budget), previousStars: 0,
      nextLevelId: null, nextUnlocked: false, worldJustUnlocked: null };
  }

  private validReplay(state: ExpeditionState): boolean {
    if (state.phase !== 'board') return true;
    this.current = state;
    const level = this.load('current');
    this.current = null;
    if (level === null || state.commands.length > level.budget) return false;
    let board = createBoard(level.tiles, level.hand);
    for (const step of state.commands) {
      if (isPalindrome(board.tiles)) return false;
      const result = apply(level.rules, board, step);
      if (!result.ok) return false;
      board = result.value;
    }
    return true;
  }

  private finish(won: boolean): void {
    const score = this.current?.score ?? 0;
    this.best = { bestScore: Math.max(this.best.bestScore, score), wins: this.best.wins + Number(won),
      runs: this.best.runs + 1 };
  }

  private persist(): void {
    try { this.storage.setItem(EXPEDITION_SAVE_KEY,
      JSON.stringify({ version: VERSION, records: this.best, state: this.current })); }
    catch { /* Play stays available when storage is blocked. */ }
  }
}
