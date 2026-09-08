import { matches } from '../core/palindrome';
import { levelId, LEVELS_PER_WORLD, parseLevelId, WORLD_COUNT, type StarMap } from '../core/progression';
import type { Stars } from '../core/scoring';
import type { Tile } from '../core/tiles';

export interface HarmonyProgress {
  readonly matched: number;
  readonly total: number;
}

export interface MoveFeedback {
  readonly harmony: HarmonyProgress;
  readonly gained: number;
  readonly flow: number;
  readonly newMatchedIndexes: readonly number[];
}

export const harmonyProgress = (tiles: readonly Tile[]): HarmonyProgress => {
  const total = Math.floor(tiles.length / 2);
  let matched = 0;
  for (let i = 0; i < total; i++) {
    const left = tiles[i];
    const right = tiles[tiles.length - 1 - i];
    if (left !== undefined && right !== undefined && matches(left, right)) matched++;
  }
  return { matched, total };
};

export const moveFeedback = (before: readonly Tile[], after: readonly Tile[], previousFlow: number): MoveFeedback => {
  const prior = harmonyProgress(before);
  const harmony = harmonyProgress(after);
  const gained = Math.max(0, harmony.matched - prior.matched);
  const newMatchedIndexes: number[] = [];
  const pairs = Math.min(prior.total, harmony.total);

  if (gained > 0) {
    for (let i = 0; i < pairs; i++) {
      const opposite = after.length - 1 - i;
      const beforeLeft = before[i];
      const beforeRight = before[before.length - 1 - i];
      const afterLeft = after[i];
      const afterRight = after[opposite];
      const wasMatched = beforeLeft !== undefined && beforeRight !== undefined && matches(beforeLeft, beforeRight);
      const isMatched = afterLeft !== undefined && afterRight !== undefined && matches(afterLeft, afterRight);
      if (!wasMatched && isMatched) newMatchedIndexes.push(i, opposite);
    }
  }

  newMatchedIndexes.sort((a, b) => a - b);
  return { harmony, gained, flow: gained > 0 ? previousFlow + 1 : 0, newMatchedIndexes };
};

const RESULT_TITLES: Readonly<Record<Stars, string>> = {
  0: 'Speilet venter',
  1: 'Speilet er åpnet',
  2: 'Strålende speiling',
  3: 'Perfekt harmoni',
};

export const resultPresentation = (stars: Stars, previousStars: number): { readonly title: string; readonly isPersonalBest: boolean } => ({
  title: RESULT_TITLES[stars],
  isPersonalBest: stars > previousStars,
});

export interface CampaignSummary {
  readonly solved: number;
  readonly total: number;
  readonly stars: number;
  readonly blitzBest: number;
  readonly hasProgress: boolean;
}

export const campaignSummary = (starMap: StarMap, blitzBest: number): CampaignSummary => {
  let solved = 0;
  let stars = 0;
  for (const [id, value] of Object.entries(starMap)) {
    if (parseLevelId(id) === null || value <= 0) continue;
    solved++;
    stars += value;
  }
  return { solved, total: WORLD_COUNT * LEVELS_PER_WORLD, stars, blitzBest, hasProgress: solved > 0 };
};

export const blitzUrgency = (remainingMs: number): boolean => remainingMs <= 10_000;

export const activeLevelInWorld = (world: number, starMap: StarMap): number | null => {
  for (let n = 1; n <= LEVELS_PER_WORLD; n++) {
    if ((starMap[levelId(world, n)] ?? 0) <= 0) return n;
  }
  return null;
};
