import type { MoveCommand } from './commands';
import type { Candidate } from './generator';
import { generateCandidate } from './generator';
import { createRng, hashString, randInt } from './rng';
import type { OpName, Rules } from './rules';
import { makeRules } from './rules';
import { solve } from './solver';
import type { Hand, Tile } from './tiles';
import { symbolKey } from './tiles';

export interface Recipe {
  readonly id: string;
  readonly lengthRange: readonly [number, number];
  readonly alphabet: number;
  readonly allowedOps: readonly OpName[];
  readonly movesRange: readonly [number, number];
  readonly slack: number;
  readonly hand: Hand;
  readonly lockedRange: readonly [number, number];
  readonly scrambleRange: readonly [number, number];
  readonly solverStates: number;
}

export interface Level {
  readonly id: string;
  readonly recipeId: string;
  readonly seed: number;
  readonly contentVersion: number;
  readonly tiles: readonly Tile[];
  readonly hand: Hand;
  readonly allowedOps: readonly OpName[];
  readonly target: number;
  readonly targetExact: boolean;
  readonly budget: number;
  readonly solution: readonly MoveCommand[];
}

export type IntroOf = OpName | 'locked';

export interface MakeLevelOptions {
  readonly id: string;
  readonly contentVersion: number;
  readonly previousKeys?: readonly string[];
  readonly introOf?: IntroOf;
  readonly attempts?: number;
  /** Forkast kandidater der løseren gir opp, slik at målet alltid er ekte minimum. */
  readonly requireExact?: boolean;
}

export const levelSeed = (contentVersion: number, id: string): number =>
  hashString(`${contentVersion}:${id}`);

export const rulesFor = (level: Pick<Level, 'allowedOps'>): Rules => makeRules(level.allowedOps);

const passesIntro = (
  introOf: IntroOf,
  c: Candidate,
  recipe: Recipe,
  target: number,
  targetExact: boolean
): boolean => {
  if (introOf === 'locked') {
    if (!targetExact || !c.tiles.some((t) => t.locked)) return false;
    const unlocked = c.tiles.map((t) => ({ ...t, locked: false }));
    const res = solve({
      rules: makeRules(recipe.allowedOps),
      tiles: unlocked,
      hand: c.hand,
      maxMoves: target - 1,
      limits: { states: recipe.solverStates },
    });
    return res.status === 'solved';
  }
  // Mekanikken må trengs for å nå mål (tre stjerner). Innen hele budsjettet er kravet
  // ikke oppfyllbart: swap alene når enhver permutasjon på korte brett innen mål + slakk.
  const without = recipe.allowedOps.filter((op) => op !== introOf);
  const res = solve({
    rules: makeRules(without),
    tiles: c.tiles,
    hand: c.hand,
    maxMoves: target,
    limits: { states: recipe.solverStates },
  });
  return res.status === 'unreachableWithinBudget';
};

/**
 * Deterministisk: samme oppskrift, id og contentVersion gir samme nivå og samme mål.
 * Bruker aldri ms-grense i løseren.
 *
 * Uten `requireExact` kan målet være generatorens løsningslengde, som bare er en
 * øvre grense. Med `requireExact` er målet alltid ekte minimum, mot høyere byggetid.
 */
export const makeLevel = (recipe: Recipe, opts: MakeLevelOptions): Level | null => {
  const seed = levelSeed(opts.contentVersion, opts.id);
  const previous = new Set(opts.previousKeys ?? []);
  const rules = makeRules(recipe.allowedOps);
  const [minMoves, maxMoves] = recipe.movesRange;
  const attempts = opts.attempts ?? 60;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const rng = createRng(hashString(`${seed}:${attempt}`));
    const spec = {
      length: randInt(rng, recipe.lengthRange[0], recipe.lengthRange[1]),
      alphabet: recipe.alphabet,
      allowedOps: recipe.allowedOps,
      hand: recipe.hand,
      lockedCount: randInt(rng, recipe.lockedRange[0], recipe.lockedRange[1]),
      scrambleSteps: randInt(rng, recipe.scrambleRange[0], recipe.scrambleRange[1]),
    };
    const c = generateCandidate(spec, rng);
    if (c === null) continue;
    if (previous.has(symbolKey(c.tiles))) continue;

    const res = solve({ rules, tiles: c.tiles, hand: c.hand, maxMoves, limits: { states: recipe.solverStates } });
    let target: number;
    let targetExact: boolean;
    if (res.status === 'solved') {
      if (res.moves < minMoves) continue;
      target = res.moves;
      targetExact = true;
    } else if (res.status === 'unknown') {
      if (opts.requireExact === true) continue;
      if (c.solution.length < minMoves || c.solution.length > maxMoves) continue;
      target = c.solution.length;
      targetExact = false;
    } else {
      continue;
    }
    const budget = target + recipe.slack;
    if (opts.introOf !== undefined && !passesIntro(opts.introOf, c, recipe, target, targetExact)) continue;

    return {
      id: opts.id,
      recipeId: recipe.id,
      seed,
      contentVersion: opts.contentVersion,
      tiles: c.tiles,
      hand: c.hand,
      allowedOps: recipe.allowedOps,
      target,
      targetExact,
      budget,
      solution: c.solution,
    };
  }
  return null;
};
