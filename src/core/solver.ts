import type { MoveCommand } from './commands';
import { isPalindrome } from './palindrome';
import type { Rules } from './rules';
import { applyMove } from './step';
import type { Hand, Snapshot, Tile } from './tiles';
import { makeSnapshot, symbolKey } from './tiles';

export interface SolveRequest {
  readonly rules: Rules;
  readonly tiles: readonly Tile[];
  readonly hand: Hand;
  readonly maxMoves: number;
  readonly limits: { readonly states: number; readonly ms?: number };
}

export type SolveResult =
  | { readonly status: 'solved'; readonly moves: number }
  | { readonly status: 'unreachableWithinBudget' }
  | { readonly status: 'unknown' };

export const stateKey = (tiles: readonly Tile[], hand: Hand): string =>
  `${symbolKey(tiles)}|${hand.wild}|${hand.remove}`;

export const legalMoves = (rules: Rules, snap: Snapshot): MoveCommand[] => {
  const n = snap.tiles.length;
  const moves: MoveCommand[] = [];
  const ops = rules.allowedOps;
  const locked = snap.tiles.map((t) => t.locked);

  if (ops.has('swap')) {
    for (let i = 0; i + 1 < n; i++) {
      if (locked[i] === false && locked[i + 1] === false) moves.push({ type: 'swap', a: i, b: i + 1 });
    }
  }
  if (ops.has('rotate') || ops.has('mirror')) {
    for (let from = 0; from < n; from++) {
      if (locked[from] === true) continue;
      for (let to = from + 1; to < n; to++) {
        if (locked[to] === true) break;
        const len = to - from + 1;
        if (ops.has('rotate') && len >= 2) {
          moves.push({ type: 'rotate', from, to, dir: 'left' });
          moves.push({ type: 'rotate', from, to, dir: 'right' });
        }
        if (ops.has('mirror') && len >= 3) moves.push({ type: 'mirror', from, to });
      }
    }
  }
  if (ops.has('insertWild') && snap.hand.wild > 0 && n < rules.maxLength) {
    for (let at = 0; at <= n; at++) moves.push({ type: 'insertWild', at });
  }
  if (ops.has('remove') && snap.hand.remove > 0 && n > rules.minLength) {
    for (const t of snap.tiles) {
      if (!t.locked) moves.push({ type: 'remove', tileId: t.id });
    }
  }
  return moves;
};

interface QueueItem {
  readonly snap: Snapshot;
  readonly depth: number;
}

export class BfsSearch {
  private readonly queue: QueueItem[] = [];
  private head = 0;
  private readonly visited = new Set<string>();
  private readonly startedAt = Date.now();
  private done: SolveResult | null = null;

  constructor(private readonly req: SolveRequest) {
    const start = makeSnapshot(req.tiles, req.hand);
    if (isPalindrome(start.tiles)) {
      this.done = { status: 'solved', moves: 0 };
      return;
    }
    if (req.maxMoves <= 0) {
      this.done = { status: 'unreachableWithinBudget' };
      return;
    }
    this.visited.add(stateKey(start.tiles, start.hand));
    this.queue.push({ snap: start, depth: 0 });
  }

  /** Utvider inntil maxStatesThisStep tilstander. Returnerer null hvis søket ikke er ferdig. */
  step(maxStatesThisStep: number): SolveResult | null {
    if (this.done !== null) return this.done;
    let expanded = 0;
    while (this.head < this.queue.length && expanded < maxStatesThisStep) {
      const item = this.queue[this.head];
      if (item === undefined) break;
      this.head++;
      expanded++;
      for (const move of legalMoves(this.req.rules, item.snap)) {
        const r = applyMove(this.req.rules, item.snap, move);
        if (!r.ok) continue;
        const key = stateKey(r.value.tiles, r.value.hand);
        if (this.visited.has(key)) continue;
        if (isPalindrome(r.value.tiles)) {
          this.done = { status: 'solved', moves: item.depth + 1 };
          return this.done;
        }
        this.visited.add(key);
        if (this.visited.size > this.req.limits.states) {
          this.done = { status: 'unknown' };
          return this.done;
        }
        if (item.depth + 1 < this.req.maxMoves) this.queue.push({ snap: r.value, depth: item.depth + 1 });
      }
      if (this.req.limits.ms !== undefined && Date.now() - this.startedAt > this.req.limits.ms) {
        this.done = { status: 'unknown' };
        return this.done;
      }
    }
    if (this.head >= this.queue.length) {
      this.done = { status: 'unreachableWithinBudget' };
      return this.done;
    }
    return null;
  }
}

export const solve = (req: SolveRequest): SolveResult => {
  const search = new BfsSearch(req);
  let result: SolveResult | null = null;
  while (result === null) result = search.step(1000);
  return result;
};
