import { CAMPAIGN, getCampaignLevel } from '../../content/campaign';
import { rulesFor } from '../../core/level';
import { isLevelUnlocked, isWorldUnlocked, nextLevelId, parseLevelId, WORLD_COUNT } from '../../core/progression';
import { starsFor } from '../../core/scoring';
import { recordStars } from '../../core/storage';
import type { SaveStore } from '../saveStore';
import type { BoardMode, ModeLevel, SolvedOutcome } from './types';

export class CampaignMode implements BoardMode {
  readonly kind = 'campaign' as const;

  constructor(private readonly store: SaveStore) {}

  load(levelId: string): ModeLevel | null {
    const parsed = parseLevelId(levelId);
    const level = getCampaignLevel(levelId);
    if (parsed === null || level === undefined) return null;
    return {
      id: level.id,
      world: parsed.world,
      n: parsed.n,
      tiles: level.tiles,
      hand: level.hand,
      rules: rulesFor(level),
      target: level.target,
      targetExact: level.targetExact,
      budget: level.budget,
      contentVersion: CAMPAIGN.contentVersion,
      showBudget: true,
    };
  }

  isUnlocked(levelId: string): boolean {
    return isLevelUnlocked(levelId, this.store.stars());
  }

  onSolved(levelId: string, movesUsed: number): SolvedOutcome {
    const level = getCampaignLevel(levelId);
    const parsed = parseLevelId(levelId);
    const previousStars = this.store.stars()[levelId] ?? 0;
    if (level === undefined || parsed === null) {
      return { stars: 0, previousStars, nextLevelId: null, nextUnlocked: false, worldJustUnlocked: null };
    }
    const stars = starsFor(movesUsed, level.target, level.budget);

    const unlockedBefore = this.unlockedWorlds();
    if (stars > 0) {
      this.store.update((d) => recordStars(d, levelId, stars, CAMPAIGN.contentVersion));
    }
    const unlockedAfter = this.unlockedWorlds();
    const worldJustUnlocked = unlockedAfter.find((w) => !unlockedBefore.includes(w)) ?? null;

    const next = nextLevelId(levelId);
    return {
      stars,
      previousStars,
      nextLevelId: next,
      nextUnlocked: next !== null && this.isUnlocked(next),
      worldJustUnlocked,
    };
  }

  private unlockedWorlds(): number[] {
    const stars = this.store.stars();
    const out: number[] = [];
    for (let w = 1; w <= WORLD_COUNT; w++) if (isWorldUnlocked(w, stars)) out.push(w);
    return out;
  }
}
