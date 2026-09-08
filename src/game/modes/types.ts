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
  /** Usant når målet bare er en øvre grense, så modusen kan vise «mål ukjent». */
  readonly targetExact: boolean;
  readonly budget: number;
  readonly contentVersion: number;
  /** Sant når tiden er en del av resultatet, så brettet viser en klokke. */
  readonly timed: boolean;
  /** Usant når budsjettet bare er en teknisk øvre grense og ikke skal vises. */
  readonly showBudget: boolean;
}

/** nextLevelId, nextUnlocked og worldJustUnlocked er null/false for moduser uten progresjon. */
export interface SolvedOutcome {
  readonly stars: Stars;
  readonly previousStars: number;
  readonly nextLevelId: string | null;
  readonly nextUnlocked: boolean;
  readonly worldJustUnlocked: number | null;
}

/** Ekstra tall fra brettet som bare tidsbaserte moduser bryr seg om. */
export interface SolvedInfo {
  readonly timeMs: number;
}

/** Brettet vet ingenting om modus. Modusen leverer brett og avgjør hva som skjer ved løsning. */
export interface BoardMode {
  readonly kind: 'campaign' | 'daily' | 'blitz' | 'free';
  load(levelId: string): ModeLevel | null;
  isUnlocked(levelId: string): boolean;
  onSolved(levelId: string, movesUsed: number, info?: SolvedInfo): SolvedOutcome;
}
