import { CAMPAIGN, getCampaignLevel } from '../content/campaign';
import { parseLevelId } from '../core/progression';
import type { SaveData } from '../core/storage';
import { introFor } from './intro';

export const earnedSpeilglimt = (data: SaveData): number =>
  Math.floor(CAMPAIGN.levels.filter(level => (data.stars[level.id]?.stars ?? 0) > 0).length / 3);

export const speilglimtBalance = (data: SaveData): number =>
  Math.max(0, earnedSpeilglimt(data) - (data.tools?.speilglimtSpent ?? 0));

export const canUseSpeilglimt = (levelId: string): boolean =>
  getCampaignLevel(levelId) !== undefined && parseLevelId(levelId)?.n !== 15 && introFor(levelId) === null;

export const debitSpeilglimt = (data: SaveData): SaveData =>
  speilglimtBalance(data) <= 0 ? data : { ...data, tools: { speilglimtSpent: (data.tools?.speilglimtSpent ?? 0) + 1 } };
