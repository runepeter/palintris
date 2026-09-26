import { CAMPAIGN, getCampaignLevel } from '../content/campaign';
import type { Level } from '../core/level';
import { introductionsSolved, isWorldMastered, isWorldUnlocked, levelId, parseLevelId } from '../core/progression';
import { campaignProgress, starMap, type FirstAttempt, type SaveData } from '../core/storage';

export type Family = 'adjacent' | 'rotation' | 'mirror' | 'locked' | 'hand' | 'combination';
const FAMILIES: readonly Family[] = ['adjacent', 'rotation', 'mirror', 'locked', 'hand', 'combination'];

export const familyFor = (id: string): Family | null => {
  const parsed = parseLevelId(id);
  return parsed === null || parsed.n === 15 ? null : FAMILIES[parsed.world - 1] ?? null;
};

export const classify = (attempt: FirstAttempt, level: Level): 'strong' | 'ordinary' | 'struggling' => {
  if (attempt.contentVersion !== level.contentVersion) return 'ordinary';
  const end = attempt.end;
  if (end === undefined) return 'ordinary';
  if ((end.reason === 'reset' || end.reason === 'exhausted') && attempt.movesMade > 0) return 'struggling';
  if (end.reason !== 'solved' || !level.targetExact || attempt.undoCount > 0) return 'ordinary';
  return end.movesUsed <= level.target ||
    (end.movesUsed === level.target + 1 && attempt.activeMs <= 15000 * Math.max(1, level.target)) ? 'strong' : 'ordinary';
};

export const recentFirstAttempts = (data: SaveData, family: Family): readonly FirstAttempt[] =>
  Object.values(campaignProgress(data).firstAttempts)
    .filter((a) => a.end !== undefined && familyFor(a.levelId) === family)
    .sort((a, b) => b.ordinal - a.ordinal).slice(0, 5);

export const masteryCount = (data: SaveData, world: number, kind: 'strong' | 'struggling' = 'strong'): number => {
  const family = FAMILIES[world - 1];
  if (family === undefined) return 0;
  return recentFirstAttempts(data, family).filter((a) => {
    const level = getCampaignLevel(a.levelId);
    return level !== undefined && classify(a, level) === kind;
  }).length;
};

export const masteryOffer = (data: SaveData, world: number): string | null => {
  const stars = starMap(data);
  const access = campaignProgress(data).access;
  if (!isWorldUnlocked(world, stars, access) || !introductionsSolved(world, stars) || isWorldMastered(world, stars, access)) return null;
  const checkpoint = levelId(world, 15);
  return access.offeredCheckpoints.includes(checkpoint) || masteryCount(data, world) >= 3 ? checkpoint : null;
};

export const practiceDestination = (data: SaveData, world: number): string | null => {
  if (masteryCount(data, world, 'struggling') < 3) return null;
  const family = FAMILIES[world - 1];
  return CAMPAIGN.levels.filter((l) => familyFor(l.id) === family && (data.stars[l.id]?.stars ?? 0) > 0)
    .sort((a, b) => a.target - b.target || a.tiles.length - b.tiles.length || a.id.localeCompare(b.id))[0]?.id ?? null;
};

export class ActivePlayClock {
  private eligible = false;

  tick(delta: number, eligible: boolean): number {
    const elapsed = eligible && this.eligible && Number.isFinite(delta) && delta > 0 ? delta : 0;
    this.eligible = eligible;
    return elapsed;
  }

  suspend(): void { this.eligible = false; }
}
