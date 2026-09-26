import { createHash } from 'node:crypto';
import { apply, createBoard, type BoardState } from '../../src/core/board';
import type { MoveCommand } from '../../src/core/commands';
import { isPalindrome } from '../../src/core/palindrome';
import { ALL_OPS, makeRules, type OpName } from '../../src/core/rules';
import { starsFor } from '../../src/core/scoring';
import { legalMoves, solve } from '../../src/core/solver';
import { applyMove } from '../../src/core/step';
import { tilesFromString, type Hand, type Tile } from '../../src/core/tiles';

export interface Puzzle {
  id: string; split: 'train' | 'dev' | 'holdout'; tiles: readonly Tile[];
  hand: Hand; ops: readonly OpName[]; budget: number;
}
export interface Request {
  policy: string;
  observation: { tiles: readonly Tile[]; hand: Hand; ops: readonly OpName[]; movesUsed: number; budget: number; history: readonly MoveCommand[] };
  choices: { id: string; command: MoveCommand }[];
}
export interface Trace { request: Request; choice: string; after: readonly Tile[]; elapsedMs: number }
export interface GameResult {
  puzzleId: string; outcome: 'solved' | 'budget' | 'noMoves'; moves: number;
  optimum: number | null; excess: number | null; stars: number; trace: Trace[];
}
export type Choose = (request: Request) => Promise<string>;
export const hash = (value: unknown): string => createHash('sha256').update(JSON.stringify(value)).digest('hex');

const fixture = (id: string, split: Puzzle['split'], symbols: string, ops: readonly OpName[], hand: Hand = { wild: 0, remove: 0 }): Puzzle =>
  ({ id, split, tiles: tilesFromString(symbols), ops, hand, budget: 2 });
export const FIXTURES: readonly Puzzle[] = [
  fixture('train-swap', 'train', 'AAB', ['swap']),
  fixture('train-rotate', 'train', 'BCABA', ['rotate']),
  fixture('dev-mirror', 'dev', 'AABB', ['mirror']),
  fixture('dev-remove', 'dev', 'ABCA', ['remove'], { wild: 0, remove: 1 }),
  fixture('dev-wild', 'dev', 'ABCB', ['insertWild'], { wild: 1, remove: 0 }),
  fixture('holdout-swap', 'holdout', 'ABBAB', ['swap']),
  fixture('holdout-locked', 'holdout', 'aBAC', ['remove'], { wild: 0, remove: 1 }),
  fixture('holdout-rotate', 'holdout', 'ACBBA', ['rotate']),
];

const isArray = (value: unknown): boolean => Array.isArray(value);

export function validateManifest(puzzles: readonly Puzzle[]): string[] {
  if (!isArray(puzzles) || puzzles.length === 0 || puzzles.length > 1000) throw new Error('Invalid puzzle manifest');
  const ids = new Set<string>(), states = new Set<string>();
  for (const p of puzzles) {
    if (!/^[A-Za-z0-9_-]+$/.test(p.id) || p.id.length > 100 || !Number.isInteger(p.budget) || p.budget < 1 || p.budget > 10) throw new Error('Invalid puzzle');
    if (!['train', 'dev', 'holdout'].includes(p.split) || !isArray(p.ops) || p.ops.length === 0 || p.ops.some(op => !ALL_OPS.includes(op)) || new Set(p.ops).size !== p.ops.length) throw new Error('Invalid puzzle rules/split');
    if (!isArray(p.tiles) || p.tiles.length < 3 || p.tiles.length > 14 || new Set(p.tiles.map(t => t.id)).size !== p.tiles.length || p.tiles.some(t => !Number.isSafeInteger(t.id) || t.id < 0 || typeof t.symbol !== 'string' || t.symbol.length !== 1 || typeof t.locked !== 'boolean' || typeof t.wild !== 'boolean' || (t.locked && t.wild))) throw new Error('Invalid tile identity or properties');
    if (![p.hand.wild, p.hand.remove].every(n => Number.isInteger(n) && n >= 0 && n <= 10)) throw new Error('Invalid hand');
    // Exclude labels and budgets: renaming an identical position must not hide leakage.
    const key = hash({ tiles: p.tiles.map(t => ({ symbol: t.symbol, wild: t.wild, locked: t.locked, sticky: t.sticky === true, bond: p.tiles.findIndex(other => other.id === t.bondedTo) })), hand: p.hand, ops: [...p.ops].sort() });
    if (ids.has(p.id) || states.has(key)) throw new Error('Duplicate puzzle ID or state across manifest');
    ids.add(p.id); states.add(key);
    const res = solve({ rules: makeRules(p.ops), tiles: p.tiles, hand: p.hand, maxMoves: p.budget, limits: { states: 50000 } });
    if (res.status !== 'solved' || res.moves === 0) throw new Error(`Puzzle must have a verified nonzero solution: ${p.id}`);
  }
  return [...states];
}

export function makeRequest(p: Puzzle, board: BoardState, policy: string, history: readonly MoveCommand[]): Request {
  const rules = makeRules(p.ops);
  return {
    policy,
    observation: { tiles: board.tiles, hand: board.hand, ops: p.ops, movesUsed: board.movesUsed, budget: p.budget, history: [...history] },
    choices: legalMoves(rules, board).filter(command => applyMove(rules, board, command).ok).map((command, index) => ({ id: `m${index}`, command })),
  };
}

export async function playPuzzle(p: Puzzle, policy: string, choose: Choose, onDecision: (trace: Trace) => void = (): void => undefined): Promise<GameResult> {
  const rules = makeRules(p.ops);
  let board = createBoard(p.tiles, p.hand);
  const trace: Trace[] = [], history: MoveCommand[] = [];
  while (!isPalindrome(board.tiles) && board.movesUsed < p.budget) {
    const request = makeRequest(p, board, policy, history);
    if (request.choices.length === 0) break;
    const start = performance.now();
    const choice = await choose(structuredClone(request));
    const selected = request.choices.find(c => c.id === choice);
    if (selected === undefined) throw new Error(`Invalid model choice: ${choice}`);
    const result = apply(rules, board, selected.command);
    if (!result.ok) throw new Error(`Engine rejected listed choice: ${result.reason}`);
    board = result.value;
    const record = { request, choice, after: board.tiles, elapsedMs: performance.now() - start };
    trace.push(record); onDecision(record); history.push(selected.command);
  }
  const solved = isPalindrome(board.tiles);
  const oracle = solve({ rules, tiles: p.tiles, hand: p.hand, maxMoves: p.budget, limits: { states: 50000 } });
  const optimum = oracle.status === 'solved' ? oracle.moves : null;
  return { puzzleId: p.id, outcome: solved ? 'solved' : board.movesUsed >= p.budget ? 'budget' : 'noMoves', moves: board.movesUsed, optimum, excess: solved && optimum !== null ? board.movesUsed - optimum : null, stars: solved && optimum !== null ? starsFor(board.movesUsed, optimum, p.budget) : 0, trace };
}
