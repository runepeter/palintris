import { rulesFor } from '../../core/level';
import { starsFor } from '../../core/scoring';
import type { DailyAttempt } from '../../core/storage';
import { setDailyProgress } from '../../core/storage';
import { bestAttempt, DAILY_BUDGET, dailyLevel, dailyPuzzleId, parseDailyPuzzleId, streakAfter, utcDateKey } from '../daily';
import type { SaveStore } from '../saveStore';
import type { BoardMode, ModeLevel, SolvedInfo, SolvedOutcome } from './types';

const NOTHING: SolvedOutcome = {
  stars: 0,
  previousStars: 0,
  nextLevelId: null,
  nextUnlocked: false,
  worldJustUnlocked: null,
};

/** Dagens brett hører ikke til noen verden; brettet bruker feltene bare til visning. */
const NO_WORLD = 0;

export class DailyMode implements BoardMode {
  readonly kind = 'daily' as const;

  constructor(
    private readonly store: SaveStore,
    private readonly contentVersion: number,
    private readonly now: () => Date
  ) {}

  todayId(): string {
    return dailyPuzzleId(utcDateKey(this.now()), this.contentVersion);
  }

  load(levelId: string): ModeLevel | null {
    const parsed = parseDailyPuzzleId(levelId);
    if (parsed === null) return null;
    const level = dailyLevel(parsed.dateKey, parsed.contentVersion);
    if (level === null) return null;
    return {
      id: levelId,
      world: NO_WORLD,
      n: NO_WORLD,
      tiles: level.tiles,
      hand: level.hand,
      rules: rulesFor(level),
      target: level.target,
      targetExact: level.targetExact,
      budget: DAILY_BUDGET,
      contentVersion: parsed.contentVersion,
      showBudget: false,
    };
  }

  /** Dagens brett er alltid åpent; det er ingen progresjon å låse opp. */
  isUnlocked(): boolean {
    return true;
  }

  onSolved(levelId: string, movesUsed: number, info?: SolvedInfo): SolvedOutcome {
    const parsed = parseDailyPuzzleId(levelId);
    if (parsed === null) return NOTHING;
    const level = dailyLevel(parsed.dateKey, parsed.contentVersion);
    if (level === null) return NOTHING;

    const attempts = this.store.data.daily.attempts;
    const earlier = attempts.filter((a) => a.puzzleId === levelId);
    const best = bestAttempt(attempts, levelId);
    const previousStars = best === undefined ? 0 : starsFor(best.moves, level.target, DAILY_BUDGET);
    const stars = starsFor(movesUsed, level.target, DAILY_BUDGET);

    const record: DailyAttempt = {
      puzzleId: levelId,
      attempt: earlier.length + 1,
      moves: movesUsed,
      timeMs: info?.timeMs ?? 0,
      target: level.target,
      completedAt: this.now().toISOString(),
    };

    this.store.update((d) => {
      const next = [...d.daily.attempts, record];
      // Streaken endrer seg bare av dagens første fullførte forsøk.
      const streak = earlier.length === 0 ? streakAfter(next, parsed.dateKey) : d.daily.streak;
      return setDailyProgress({ ...d, daily: { ...d.daily, attempts: next, streak } }, undefined);
    });

    return { stars, previousStars, nextLevelId: null, nextUnlocked: false, worldJustUnlocked: null };
  }
}
