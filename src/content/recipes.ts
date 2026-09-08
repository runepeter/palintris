import type { IntroOf, Recipe } from '../core/level';
import { LEVELS_PER_WORLD } from '../core/progression';

export const CONTENT_VERSION = 1;

const OFFLINE_STATES = 1_000_000;

/**
 * Eksakte mål er sjeldne: bare rundt én promille av kandidatene i verden 2 og 3
 * treffer minMoves på de øverste nivåene. Forsøkene kjøres i rekkefølge, så et
 * høyt tak er gratis for nivåer som treffer tidlig. Deles av byggeskriptet og
 * regenereringstesten, som ellers ikke ville reprodusert de samme nivåene.
 */
export const BUILD_ATTEMPTS = 20000;

/**
 * `movesRange[0]` er minMoves på nivå 1, `movesRange[1]` er minMoves på nivå 15
 * og øvre grense for mål. Byggeskriptet ramper lineært.
 */
export const WORLD_RECIPES: readonly Recipe[] = [
  {
    id: 'w1',
    lengthRange: [4, 6],
    alphabet: 3,
    allowedOps: ['swap'],
    movesRange: [1, 3],
    slack: 4,
    hand: { wild: 0, remove: 0 },
    lockedRange: [0, 0],
    scrambleRange: [1, 4],
    solverStates: OFFLINE_STATES,
  },
  {
    id: 'w2',
    lengthRange: [5, 7],
    alphabet: 4,
    allowedOps: ['swap', 'rotate'],
    movesRange: [2, 3],
    slack: 4,
    hand: { wild: 0, remove: 0 },
    lockedRange: [0, 0],
    scrambleRange: [2, 5],
    solverStates: OFFLINE_STATES,
  },
  {
    id: 'w3',
    lengthRange: [6, 8],
    alphabet: 4,
    allowedOps: ['swap', 'rotate', 'mirror'],
    movesRange: [2, 3],
    slack: 4,
    hand: { wild: 0, remove: 0 },
    lockedRange: [0, 0],
    scrambleRange: [2, 6],
    solverStates: OFFLINE_STATES,
  },
  {
    id: 'w4',
    lengthRange: [7, 10],
    alphabet: 5,
    allowedOps: ['swap', 'rotate', 'mirror'],
    movesRange: [2, 3],
    slack: 4,
    hand: { wild: 0, remove: 0 },
    lockedRange: [1, 2],
    scrambleRange: [3, 7],
    solverStates: OFFLINE_STATES,
  },
  {
    id: 'w5',
    lengthRange: [7, 10],
    alphabet: 5,
    allowedOps: ['swap', 'rotate', 'mirror', 'insertWild', 'remove'],
    movesRange: [3, 4],
    slack: 4,
    hand: { wild: 1, remove: 1 },
    lockedRange: [0, 0],
    scrambleRange: [2, 6],
    solverStates: OFFLINE_STATES,
  },
  {
    id: 'w6',
    lengthRange: [10, 14],
    alphabet: 6,
    allowedOps: ['swap', 'rotate', 'mirror', 'insertWild', 'remove'],
    movesRange: [3, 4],
    slack: 4,
    hand: { wild: 1, remove: 1 },
    lockedRange: [0, 2],
    scrambleRange: [3, 8],
    solverStates: OFFLINE_STATES,
  },
];

/** Første nivå som krever en ny mekanikk. Verifiseres av løser i makeLevel. */
export const INTRO_LEVELS: Readonly<Record<string, IntroOf>> = {
  'w2-01': 'rotate',
  'w3-01': 'mirror',
  'w4-01': 'locked',
  'w5-01': 'insertWild',
  'w5-02': 'remove',
};

/**
 * Vanskelighetskurve innen en verden: minMoves stiger lineært fra `movesRange[0]`
 * på nivå 1 til `movesRange[1]` på nivå LEVELS_PER_WORLD. Øvre grense er uendret.
 * Deles av byggeskriptet og regenereringstesten.
 */
export const rampedRecipe = (recipe: Recipe, n: number): Recipe => {
  const [lo, hi] = recipe.movesRange;
  const minMoves = lo + Math.round(((n - 1) / (LEVELS_PER_WORLD - 1)) * (hi - lo));
  return { ...recipe, movesRange: [minMoves, hi] };
};
