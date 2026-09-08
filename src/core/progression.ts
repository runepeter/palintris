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

export const isWorldUnlocked = (world: number, stars: StarMap): boolean =>
  world === 1 || (world <= WORLD_COUNT && solvedInWorld(world - 1, stars) >= WORLD_GATE);

export const isLevelUnlocked = (id: string, stars: StarMap): boolean => {
  const parsed = parseLevelId(id);
  if (parsed === null) return false;
  if (!isWorldUnlocked(parsed.world, stars)) return false;
  if (parsed.n === 1) return true;
  return (stars[levelId(parsed.world, parsed.n - 1)] ?? 0) > 0;
};

export const nextLevelId = (id: string): string | null => {
  const parsed = parseLevelId(id);
  if (parsed === null) return null;
  if (parsed.n < LEVELS_PER_WORLD) return levelId(parsed.world, parsed.n + 1);
  if (parsed.world < WORLD_COUNT) return levelId(parsed.world + 1, 1);
  return null;
};
