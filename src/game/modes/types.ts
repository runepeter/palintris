import type { Rules } from '../../core/rules';
import type { Stars } from '../../core/scoring';
import type { Hand, Tile } from '../../core/tiles';

export interface ModeLevel {
  readonly id: string;
  readonly world: number;
  readonly n: number;
  readonly tiles: readonly Tile[];
  readonly hand: Hand;
  readonly rules: Rules;
  readonly target: number;
  readonly budget: number;
  readonly contentVersion: number;
}

export interface SolvedOutcome {
  readonly stars: Stars;
  readonly previousStars: number;
  readonly nextLevelId: string | null;
  readonly nextUnlocked: boolean;
  readonly worldJustUnlocked: number | null;
}

/** Brettet vet ingenting om modus. Modusen leverer brett og avgjør hva som skjer ved løsning. */
export interface BoardMode {
  readonly kind: 'campaign';
  load(levelId: string): ModeLevel | null;
  isUnlocked(levelId: string): boolean;
  onSolved(levelId: string, movesUsed: number): SolvedOutcome;
}
