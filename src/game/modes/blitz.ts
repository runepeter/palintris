import { rulesFor } from '../../core/level';
import { starsFor } from '../../core/scoring';
import type { BlitzQueue } from '../blitz';
import type { SaveStore } from '../saveStore';
import type { BoardMode, ModeLevel, SolvedOutcome } from './types';

/** Blitz har ingen trekkgrense; tiden er begrensningen. */
const BLITZ_BUDGET = 999;

/** Id-en scenen ber om når den vil ha et nytt brett fra køen. */
export const BLITZ_NEXT = 'next';

const NO_WORLD = 0;

export class BlitzMode implements BoardMode {
  readonly kind = 'blitz' as const;

  private readonly seen = new Map<string, ModeLevel>();
  private count = 0;

  constructor(
    private readonly store: SaveStore,
    private readonly queue: BlitzQueue
  ) {}

  get solved(): number {
    return this.count;
  }

  load(levelId: string): ModeLevel {
    const level = levelId === BLITZ_NEXT ? this.queue.next() : this.queue.peek();
    const mode: ModeLevel = {
      id: level.id,
      world: NO_WORLD,
      n: this.count + 1,
      tiles: level.tiles,
      hand: level.hand,
      rules: rulesFor(level),
      target: level.target,
      targetExact: level.targetExact,
      budget: BLITZ_BUDGET,
      contentVersion: level.contentVersion,
      showBudget: false,
    };
    this.seen.set(level.id, mode);
    return mode;
  }

  /** Alle brett i køen er åpne. */
  isUnlocked(): boolean {
    return true;
  }

  onSolved(levelId: string, movesUsed: number): SolvedOutcome {
    const level = this.seen.get(levelId);
    if (level === undefined) {
      return { stars: 0, previousStars: 0, nextLevelId: null, nextUnlocked: false, worldJustUnlocked: null };
    }
    this.count++;
    return {
      stars: starsFor(movesUsed, level.target, BLITZ_BUDGET),
      previousStars: 0,
      nextLevelId: BLITZ_NEXT,
      nextUnlocked: true,
      worldJustUnlocked: null,
    };
  }

  /** Kalles når klokken er ute. Skriver ny rekord og sier om den var ny. */
  finish(): { solved: number; best: number; isNewBest: boolean } {
    const previous = this.store.data.blitz.best;
    const isNewBest = this.count > previous;
    if (isNewBest) this.store.update((d) => ({ ...d, blitz: { best: this.count } }));
    return { solved: this.count, best: Math.max(previous, this.count), isNewBest };
  }
}
