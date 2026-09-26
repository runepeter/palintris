export const WORLD_COUNT = 6;
export const LEVELS_PER_WORLD = 15;
export const WORLD_GATE = 12;

export type StarMap = Readonly<Record<string, number>>;

export const levelId = (world: number, n: number): string => `w${world}-${String(n).padStart(2, '0')}`;

export const parseLevelId = (id: string): { world: number; n: number } | null => {
  const m = /^w(\d)-(\d{2})$/.exec(id);
  if (m === null) return null;
  const world = Number(m[1]);
  const n = Number(m[2]);
  if (world < 1 || world > WORLD_COUNT || n < 1 || n > LEVELS_PER_WORLD) return null;
  return { world, n };
};

export const solvedInWorld = (world: number, stars: StarMap): number => {
  let count = 0;
  for (let n = 1; n <= LEVELS_PER_WORLD; n++) {
    if ((stars[levelId(world, n)] ?? 0) > 0) count++;
  }
  return count;
};

export interface CampaignAccess {
  readonly offeredCheckpoints: readonly string[];
  readonly masteredWorlds: readonly number[];
}

export const EMPTY_ACCESS: CampaignAccess = { offeredCheckpoints: [], masteredWorlds: [] };

export const mandatoryIntroIds = (world: number): readonly string[] =>
  world === 5 ? ['w5-01', 'w5-02'] : world >= 1 && world <= 4 ? [levelId(world, 1)] : [];

export const introductionsSolved = (world: number, stars: StarMap): boolean =>
  mandatoryIntroIds(world).every((id) => (stars[id] ?? 0) > 0);

export const isWorldMastered = (world: number, stars: StarMap, access: CampaignAccess = EMPTY_ACCESS): boolean =>
  world >= 1 && world <= WORLD_COUNT && access.masteredWorlds.includes(world) &&
  (stars[levelId(world, LEVELS_PER_WORLD)] ?? 0) > 0 && introductionsSolved(world, stars);

export const isWorldUnlocked = (world: number, stars: StarMap, access: CampaignAccess = EMPTY_ACCESS): boolean =>
  Number.isInteger(world) && world >= 1 && world <= WORLD_COUNT &&
  (world === 1 || solvedInWorld(world - 1, stars) >= WORLD_GATE || isWorldMastered(world - 1, stars, access));

export const isLevelUnlocked = (id: string, stars: StarMap, access: CampaignAccess = EMPTY_ACCESS): boolean => {
  const parsed = parseLevelId(id);
  if (parsed === null) return false;
  if ((stars[id] ?? 0) > 0) return true;
  if (!isWorldUnlocked(parsed.world, stars, access)) return false;
  if (parsed.n === 1 || (stars[levelId(parsed.world, parsed.n - 1)] ?? 0) > 0) return true;
  if (!introductionsSolved(parsed.world, stars)) return false;
  return (parsed.n === LEVELS_PER_WORLD && access.offeredCheckpoints.includes(id)) ||
    (!mandatoryIntroIds(parsed.world).includes(id) && isWorldMastered(parsed.world, stars, access));
};

export const nextLevelId = (id: string): string | null => {
  const parsed = parseLevelId(id);
  if (parsed === null) return null;
  if (parsed.n < LEVELS_PER_WORLD) return levelId(parsed.world, parsed.n + 1);
  if (parsed.world < WORLD_COUNT) return levelId(parsed.world + 1, 1);
  return null;
};
