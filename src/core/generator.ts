import { apply, createBoard } from './board';
import type { MoveCommand } from './commands';
import { isPalindrome } from './palindrome';
import type { Rng } from './rng';
import { pick, randInt, shuffle } from './rng';
import type { OpName, Rules } from './rules';
import { makeRules } from './rules';
import { applyMove } from './step';
import type { Hand, Snapshot, Tile } from './tiles';
import { makeSnapshot, makeTile, WILD_SYMBOL } from './tiles';

export interface GenerateSpec {
  readonly length: number;
  readonly alphabet: number;
  readonly allowedOps: readonly OpName[];
  readonly hand: Hand;
  readonly lockedCount: number;
  readonly scrambleSteps: number;
}

export interface Candidate {
  readonly tiles: readonly Tile[];
  readonly hand: Hand;
  readonly solution: readonly MoveCommand[];
}

const ALPHABET = 'ABCDEFGHIJ';
const symbolAt = (i: number): string => ALPHABET[i] ?? 'A';
const randomSymbol = (spec: GenerateSpec, rng: Rng): string => symbolAt(randInt(rng, 0, spec.alphabet - 1));

export const makeTargetPalindrome = (spec: GenerateSpec, rng: Rng): Tile[] => {
  const half = Math.floor(spec.length / 2);
  const left: string[] = [];
  for (let i = 0; i < half; i++) left.push(randomSymbol(spec, rng));
  const mid = spec.length % 2 === 1 ? [randomSymbol(spec, rng)] : [];
  const symbols = [...left, ...mid, ...[...left].reverse()];
  const positions = shuffle(rng, symbols.map((_, i) => i));
  const wildPos = new Set(positions.slice(0, spec.hand.wild));
  const lockPos = new Set(positions.slice(spec.hand.wild, spec.hand.wild + spec.lockedCount));
  return symbols.map((s, i) => {
    if (wildPos.has(i)) return makeTile(i, WILD_SYMBOL, { wild: true });
    return makeTile(i, s, { locked: lockPos.has(i) });
  });
};

type StepKind = 'perm' | 'insertWild' | 'remove';

interface Predecessor {
  readonly prev: Snapshot;
  readonly forward: MoveCommand;
}

const isPermOp = (op: OpName): op is 'swap' | 'rotate' | 'mirror' =>
  op === 'swap' || op === 'rotate' || op === 'mirror';

const permPredecessor = (
  cur: Snapshot,
  permOps: readonly ('swap' | 'rotate' | 'mirror')[],
  permRules: Rules,
  rng: Rng
): Predecessor | null => {
  const n = cur.tiles.length;
  if (permOps.length === 0) return null;
  for (let attempt = 0; attempt < 20; attempt++) {
    const op = pick(rng, permOps);
    let forward: MoveCommand;
    let backward: MoveCommand;
    if (op === 'swap') {
      const a = randInt(rng, 0, n - 2);
      forward = { type: 'swap', a, b: a + 1 };
      backward = forward;
    } else if (op === 'rotate') {
      const from = randInt(rng, 0, n - 2);
      const to = randInt(rng, from + 1, n - 1);
      const dir = pick(rng, ['left', 'right'] as const);
      forward = { type: 'rotate', from, to, dir };
      backward = { type: 'rotate', from, to, dir: dir === 'left' ? 'right' : 'left' };
    } else {
      if (n < 3) return null;
      const from = randInt(rng, 0, n - 3);
      const to = randInt(rng, from + 2, n - 1);
      forward = { type: 'mirror', from, to };
      backward = forward;
    }
    const r = applyMove(permRules, cur, backward);
    if (r.ok) return { prev: { ...r.value, movesUsed: 0 }, forward };
  }
  return null;
};

const insertWildPredecessor = (cur: Snapshot, rules: Rules, rng: Rng): Predecessor | null => {
  const wildIdx = cur.tiles.map((t, i) => (t.wild ? i : -1)).filter((i) => i >= 0);
  if (wildIdx.length === 0 || cur.tiles.length - 1 < rules.minLength) return null;
  const at = pick(rng, wildIdx);
  return {
    prev: { ...cur, tiles: cur.tiles.filter((_, i) => i !== at), hand: { ...cur.hand, wild: cur.hand.wild + 1 } },
    forward: { type: 'insertWild', at },
  };
};

const removePredecessor = (cur: Snapshot, rules: Rules, spec: GenerateSpec, rng: Rng): Predecessor | null => {
  const n = cur.tiles.length;
  if (n + 1 > rules.maxLength) return null;
  const at = randInt(rng, 0, n);
  const tile = makeTile(cur.nextId, randomSymbol(spec, rng));
  const tiles = [...cur.tiles];
  tiles.splice(at, 0, tile);
  return {
    prev: { ...cur, tiles, nextId: cur.nextId + 1, hand: { ...cur.hand, remove: cur.hand.remove + 1 } },
    forward: { type: 'remove', tileId: tile.id },
  };
};

export const validateSolution = (rules: Rules, c: Candidate): boolean => {
  let state = createBoard(c.tiles, c.hand);
  for (const cmd of c.solution) {
    const r = apply(rules, state, cmd);
    if (!r.ok) return false;
    state = r.value;
  }
  return isPalindrome(state.tiles) && state.hand.wild === 0 && state.hand.remove === 0;
};

/**
 * Lager et brett baklengs: start i et palindrom, gå til lovlige forgjengere,
 * og noter forover-kommandoen for hvert steg. Løsningen valideres med apply.
 */
export const generateCandidate = (spec: GenerateSpec, rng: Rng): Candidate | null => {
  const rules = makeRules(spec.allowedOps);
  const permOps = spec.allowedOps.filter(isPermOp);
  const permRules = makeRules(permOps);
  if (spec.length - spec.hand.wild < rules.minLength) return null;
  if (spec.length + spec.hand.remove > rules.maxLength) return null;
  if (spec.hand.wild + spec.lockedCount > spec.length) return null;

  let cur: Snapshot = makeSnapshot(makeTargetPalindrome(spec, rng), { wild: 0, remove: 0 });
  const solution: MoveCommand[] = [];
  const steps: StepKind[] = shuffle(rng, [
    ...Array.from({ length: spec.scrambleSteps }, (): StepKind => 'perm'),
    ...Array.from({ length: spec.hand.wild }, (): StepKind => 'insertWild'),
    ...Array.from({ length: spec.hand.remove }, (): StepKind => 'remove'),
  ]);

  for (const step of steps) {
    const p =
      step === 'perm'
        ? permPredecessor(cur, permOps, permRules, rng)
        : step === 'insertWild'
          ? insertWildPredecessor(cur, rules, rng)
          : removePredecessor(cur, rules, spec, rng);
    if (p === null) return null;
    cur = p.prev;
    solution.unshift(p.forward);
  }

  if (isPalindrome(cur.tiles)) return null;
  const candidate: Candidate = { tiles: cur.tiles, hand: cur.hand, solution };
  return validateSolution(rules, candidate) ? candidate : null;
};
