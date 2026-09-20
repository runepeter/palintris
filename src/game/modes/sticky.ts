import type { MoveCommand } from '../../core/commands';
import { makeRules } from '../../core/rules';
import { starsFor } from '../../core/scoring';
import { makeTile, type Tile } from '../../core/tiles';
import type { BoardMode, ModeLevel, SolvedOutcome } from './types';

type Swap = Extract<MoveCommand, { type: 'swap' }>;

interface StickyLevel {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  readonly compactText: string;
  readonly tiles: readonly Tile[];
  readonly target: number;
  readonly solution: readonly Swap[];
}

const tiles = (symbols: string, sticky: number): readonly Tile[] =>
  [...symbols].map((symbol, id) => makeTile(id, symbol, { sticky: id === sticky }));

const swaps = (...indices: number[]): readonly Swap[] =>
  indices.map((a) => ({ type: 'swap', a, b: a + 1 }));

export const STICKY_LEVELS: readonly StickyLevel[] = [
  {
    id: 'sticky-01',
    title: 'Finn partneren',
    compactText: 'Like speilpartnere bindes.',
    text: 'Flytt den klebrige B-en ytterst. Like speilpartnere bindes sammen.',
    tiles: tiles('ABCACB', 1),
    target: 2,
    solution: swaps(0, 1),
  },
  {
    id: 'sticky-02',
    title: 'Flytt som et par',
    compactText: 'Lenkede par bytter sammen.',
    text: 'Dra en bundet B. Partneren bytter med naboen på motsatt side.',
    tiles: tiles('ABACBC', 1),
    target: 3,
    solution: swaps(0, 2, 1),
  },
  {
    id: 'sticky-03',
    title: 'Velg tidspunkt',
    compactText: 'Vent med å koble A-paret.',
    text: 'Vent med å binde A-paret for å spare et trekk. Angre lar deg prøve igjen.',
    tiles: tiles('ABBCAC', 0),
    target: 3,
    solution: swaps(2, 1, 0),
  },
];

export class StickyMode implements BoardMode {
  readonly kind = 'sticky' as const;

  load(levelId: string): ModeLevel | null {
    const id = levelId || 'sticky-01';
    const index = STICKY_LEVELS.findIndex((level) => level.id === id);
    const level = STICKY_LEVELS[index];
    if (level === undefined) return null;
    return {
      id: level.id,
      world: 1,
      n: index + 1,
      tiles: level.tiles,
      hand: { wild: 0, remove: 0 },
      rules: makeRules(['swap']),
      target: level.target,
      targetExact: true,
      budget: level.target + 5,
      contentVersion: 1,
      showBudget: true,
    };
  }

  isUnlocked(levelId: string): boolean {
    return this.load(levelId) !== null;
  }

  onSolved(levelId: string, movesUsed: number): SolvedOutcome {
    const index = STICKY_LEVELS.findIndex((level) => level.id === levelId);
    const level = this.load(levelId);
    const next = index < 0 ? null : STICKY_LEVELS[index + 1]?.id ?? null;
    return {
      stars: level === null ? 0 : starsFor(movesUsed, level.target, level.budget),
      previousStars: 0,
      nextLevelId: next,
      nextUnlocked: next !== null,
      worldJustUnlocked: null,
    };
  }
}
