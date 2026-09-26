import { journeyTrial } from '../content/journeyTrials';
import type { Command } from './commands';
import { EMPTY_ACCESS, introductionsSolved, levelId, parseLevelId, WORLD_COUNT, type CampaignAccess, type StarMap } from './progression';

export interface Settings {
  sound: boolean;
  music: boolean;
  reducedMotion: boolean;
  colorBlind: boolean;
  clearAnimations: boolean;
}

export interface StarRecord {
  readonly stars: number;
  readonly contentVersion: number;
}

export interface DailyAttempt {
  readonly puzzleId: string;
  readonly attempt: number;
  readonly moves: number;
  readonly timeMs: number;
  readonly target: number;
  readonly completedAt: string;
}

export interface DailyProgress {
  readonly puzzleId: string;
  readonly startedAt: string;
  readonly elapsedMs: number;
  readonly commands: readonly Command[];
}

export interface FirstAttempt {
  readonly assisted?: true;
  readonly levelId: string;
  readonly contentVersion: number;
  readonly ordinal: number;
  readonly activeMs: number;
  readonly movesMade: number;
  readonly undoCount: number;
  readonly end?: { readonly reason: 'solved' | 'reset' | 'exhausted' | 'interrupted' | 'invalid'; readonly movesUsed: number };
}

export interface CampaignProgress {
  readonly firstAttempts: Readonly<Record<string, FirstAttempt>>;
  readonly access: CampaignAccess;
}

export const campaignProgress = (data: SaveData): CampaignProgress =>
  data.campaign ?? { firstAttempts: {}, access: EMPTY_ACCESS };

export interface SaveData {
  readonly tools?: { readonly speilglimtSpent: number };
  readonly journeyBadges?: readonly string[];
  readonly campaign?: CampaignProgress;
  readonly saveVersion: 1;
  readonly contentVersion: number;
  readonly stars: Readonly<Record<string, StarRecord>>;
  readonly daily: { readonly attempts: readonly DailyAttempt[]; readonly streak: number; readonly inProgress?: DailyProgress };
  readonly blitz: { readonly best: number };
  readonly settings: Settings;
  readonly introsSeen: readonly string[];
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const SAVE_KEY = 'palintris.save.v1';
export const LEGACY_SETTINGS_KEY = 'palintris_settings';

export const defaultSave = (): SaveData => ({
  saveVersion: 1,
  contentVersion: 1,
  stars: {},
  daily: { attempts: [], streak: 0 },
  blitz: { best: 0 },
  settings: { sound: true, music: true, reducedMotion: false, colorBlind: false, clearAnimations: true },
  introsSeen: [],
});

const readJson = (storage: StorageLike, key: string): unknown => {
  try {
    const raw = storage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isNumber = (v: unknown): v is number => typeof v === 'number' && !Number.isNaN(v);
const isString = (v: unknown): v is string => typeof v === 'string';
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';

const parseStars = (raw: unknown): Record<string, StarRecord> | null => {
  if (!isRecord(raw)) return null;
  const result: Record<string, StarRecord> = {};
  for (const [id, value] of Object.entries(raw)) {
    if (!isRecord(value)) return null;
    const stars = value['stars'];
    const contentVersion = value['contentVersion'];
    if (!isNumber(stars) || !Number.isInteger(stars) || stars < 0 || stars > 3) return null;
    if (!isNumber(contentVersion)) return null;
    result[id] = { stars, contentVersion };
  }
  return result;
};

const parseDailyAttempt = (raw: unknown): DailyAttempt | null => {
  if (!isRecord(raw)) return null;
  const { puzzleId, attempt, moves, timeMs, target, completedAt } = raw;
  if (!isString(puzzleId)) return null;
  if (!isNumber(attempt) || !isNumber(moves) || !isNumber(timeMs) || !isNumber(target)) return null;
  if (!isString(completedAt)) return null;
  return { puzzleId, attempt, moves, timeMs, target, completedAt };
};

const parseCommands = (raw: unknown): readonly Command[] | null => {
  if (!Array.isArray(raw)) return null;
  for (const item of raw) {
    if (!isRecord(item) || !isString(item['type'])) return null;
  }
  return raw as readonly Command[];
};

const parseDailyProgress = (raw: unknown): DailyProgress | null | undefined => {
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) return null;
  const { puzzleId, startedAt, elapsedMs, commands } = raw;
  if (!isString(puzzleId) || !isString(startedAt) || !isNumber(elapsedMs)) return null;
  const parsedCommands = parseCommands(commands);
  if (parsedCommands === null) return null;
  return { puzzleId, startedAt, elapsedMs, commands: parsedCommands };
};

const parseDaily = (raw: unknown): SaveData['daily'] | null => {
  if (!isRecord(raw)) return null;
  const attemptsRaw = raw['attempts'];
  const streak = raw['streak'];
  if (!Array.isArray(attemptsRaw) || !isNumber(streak)) return null;
  const attempts: DailyAttempt[] = [];
  for (const item of attemptsRaw) {
    const parsed = parseDailyAttempt(item);
    if (parsed === null) return null;
    attempts.push(parsed);
  }
  // inProgress skrives etter hvert trekk og er derfor det mest utsatte feltet. Den er
  // valgfri, så en ødelagt verdi kastes som om den manglet i stedet for å velte hele
  // lagringen og dermed stjernene.
  const inProgress = parseDailyProgress(raw['inProgress']);
  return inProgress === null || inProgress === undefined ? { attempts, streak } : { attempts, streak, inProgress };
};

const parseBlitz = (raw: unknown): SaveData['blitz'] | null => {
  if (!isRecord(raw)) return null;
  const best = raw['best'];
  if (!isNumber(best)) return null;
  return { best };
};

const parseSettings = (raw: unknown): Settings => {
  const base = defaultSave().settings;
  if (!isRecord(raw)) return base;
  return {
    sound: isBoolean(raw['sound']) ? raw['sound'] : base.sound,
    music: isBoolean(raw['music']) ? raw['music'] : base.music,
    reducedMotion: isBoolean(raw['reducedMotion']) ? raw['reducedMotion'] : base.reducedMotion,
    colorBlind: isBoolean(raw['colorBlind']) ? raw['colorBlind'] : base.colorBlind,
    clearAnimations: isBoolean(raw['clearAnimations']) ? raw['clearAnimations'] : base.clearAnimations,
  };
};

/** Valgfritt felt: en ødelagt liste koster bare at introene vises igjen. */
const parseIntrosSeen = (raw: unknown): readonly string[] => {
  if (!Array.isArray(raw) || !raw.every(isString)) return [];
  return raw;
};

const nonnegativeInteger = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;

const parseCampaign = (raw: unknown, stars: StarMap): CampaignProgress | undefined => {
  if (raw === undefined) return undefined;
  const source = isRecord(raw) ? raw : {};
  const attempts = isRecord(source['firstAttempts']) && !Array.isArray(source['firstAttempts']) ? source['firstAttempts'] : {};
  const firstAttempts: Record<string, FirstAttempt> = {};
  const ordinals = new Set<number>();
  const conflictingIds = new Set<string>();
  let nextOrdinal = Object.values(attempts).reduce<number>((max, v) => isRecord(v) && nonnegativeInteger(v['ordinal']) && v['ordinal'] < Number.MAX_SAFE_INTEGER - 100 ? Math.max(max, v['ordinal']) : max, 0);
  for (const [key, value] of Object.entries(attempts)) {
    const r = isRecord(value) ? value : {};
    const declaredId = typeof r['levelId'] === 'string' ? r['levelId'] : '';
    if (declaredId !== key) {
      for (const candidate of [key, declaredId]) {
        const parsedId = parseLevelId(candidate);
        if (parsedId !== null && parsedId.n !== 15) conflictingIds.add(candidate);
      }
    }
    const id = parseLevelId(key) !== null ? key : declaredId;
    const parsed = parseLevelId(id);
    if (parsed === null || parsed.n === 15) continue;
    const end = r['end'];
    const validEnd = end === undefined || (isRecord(end) &&
      ['solved', 'reset', 'exhausted', 'interrupted', 'invalid'].includes(String(end['reason'])) && nonnegativeInteger(end['movesUsed']) &&
      (end['reason'] !== 'solved' || (nonnegativeInteger(r['movesMade']) && end['movesUsed'] > 0 && end['movesUsed'] <= r['movesMade'])));
    if (key === id && firstAttempts[id] === undefined && r['levelId'] === id && nonnegativeInteger(r['contentVersion']) &&
      nonnegativeInteger(r['ordinal']) && r['ordinal'] > 0 && r['ordinal'] < Number.MAX_SAFE_INTEGER - 100 && !ordinals.has(r['ordinal']) &&
      nonnegativeInteger(r['activeMs']) && nonnegativeInteger(r['movesMade']) && nonnegativeInteger(r['undoCount']) && validEnd) {
      firstAttempts[id] = { levelId: id, contentVersion: r['contentVersion'], ordinal: r['ordinal'],
        activeMs: r['activeMs'], movesMade: r['movesMade'], undoCount: r['undoCount'],
        ...(Object.prototype.hasOwnProperty.call(r, 'assisted') && r['assisted'] !== false ? { assisted: true as const } : {}),
        ...(end === undefined ? {} : { end: end as FirstAttempt['end'] }) };
    } else {
      firstAttempts[id] = { levelId: id, contentVersion: 1, ordinal: ++nextOrdinal, activeMs: 0, movesMade: 0, undoCount: 0,
        end: { reason: 'invalid', movesUsed: 0 } };
    }
    ordinals.add(firstAttempts[id].ordinal);
  }
  for (const id of conflictingIds) {
    firstAttempts[id] = { levelId: id, contentVersion: 1, ordinal: ++nextOrdinal, activeMs: 0, movesMade: 0, undoCount: 0,
      end: { reason: 'invalid', movesUsed: 0 } };
  }
  const access = isRecord(source['access']) ? source['access'] : {};
  const offers = access['offeredCheckpoints'];
  const mastered = access['masteredWorlds'];
  const offeredCheckpoints = Array.isArray(offers) ? [...new Set(offers.filter((id): id is string => {
    if (typeof id !== 'string') return false;
    const parsed = parseLevelId(id);
    return parsed?.n === 15 && introductionsSolved(parsed.world, stars);
  }))] : [];
  const masteredWorlds = Array.isArray(mastered) ? [...new Set(mastered.filter((w): w is number =>
    nonnegativeInteger(w) && w >= 1 && w <= WORLD_COUNT && (stars[levelId(w, 15)] ?? 0) > 0 && introductionsSolved(w, stars)))] : [];
  return { firstAttempts, access: { offeredCheckpoints, masteredWorlds } };
};

export const parseSave = (raw: unknown): SaveData | null => {
  if (!isRecord(raw) || raw['saveVersion'] !== 1) return null;

  const stars = parseStars(raw['stars']);
  if (stars === null) return null;

  const daily = parseDaily(raw['daily']);
  if (daily === null) return null;

  const blitz = parseBlitz(raw['blitz']);
  if (blitz === null) return null;

  // Valgfritt felt med en trygg default; en ødelagt verdi skal ikke koste stjernene.
  const contentVersionRaw = raw['contentVersion'];
  const contentVersion = isNumber(contentVersionRaw) ? contentVersionRaw : 1;

  const campaign = parseCampaign(raw['campaign'], Object.fromEntries(Object.entries(stars).map(([id, r]) => [id, r.stars])));
  return {
    ...(campaign === undefined ? {} : { campaign }),
    ...(Object.prototype.hasOwnProperty.call(raw, 'tools') ? { tools: { speilglimtSpent:
      isRecord(raw['tools']) && !Array.isArray(raw['tools']) && nonnegativeInteger(raw['tools']['speilglimtSpent']) && raw['tools']['speilglimtSpent'] <= 30
        ? raw['tools']['speilglimtSpent'] : 30 } } : {}),
    ...(Array.isArray(raw['journeyBadges']) ? { journeyBadges: [...new Set(raw['journeyBadges'].filter((id): id is string =>
      typeof id === 'string' && journeyTrial(id) !== undefined))] } : {}),
    saveVersion: 1,
    contentVersion,
    stars,
    daily,
    blitz,
    settings: parseSettings(raw['settings']),
    introsSeen: parseIntrosSeen(raw['introsSeen']),
  };
};

const migrateLegacy = (storage: StorageLike): SaveData => {
  const base = defaultSave();
  const legacy = readJson(storage, LEGACY_SETTINGS_KEY);
  if (!isRecord(legacy)) return base;
  const bool = (key: string, fallback: boolean): boolean =>
    typeof legacy[key] === 'boolean' ? (legacy[key] as boolean) : fallback;
  return {
    ...base,
    settings: {
      sound: bool('soundEnabled', true),
      music: bool('musicEnabled', true),
      reducedMotion: !bool('particlesEnabled', true),
      colorBlind: bool('colorBlindMode', false),
      clearAnimations: true,
    },
  };
};

export const loadSave = (storage: StorageLike): SaveData => {
  const parsed = parseSave(readJson(storage, SAVE_KEY));
  if (parsed !== null) return parsed;
  return migrateLegacy(storage);
};

export const persistSave = (storage: StorageLike, data: SaveData): void => {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Lagring kan være full eller avslått; spillet fortsetter uten.
  }
};

export const recordStars = (data: SaveData, levelId: string, stars: number, contentVersion: number): SaveData => {
  const existing = data.stars[levelId];
  if (existing !== undefined && existing.stars > stars) return data;
  return { ...data, stars: { ...data.stars, [levelId]: { stars, contentVersion } } };
};

export const starMap = (data: SaveData): StarMap =>
  Object.fromEntries(Object.entries(data.stars).map(([id, rec]) => [id, rec.stars]));

export const markIntroSeen = (data: SaveData, id: string): SaveData =>
  data.introsSeen.includes(id) ? data : { ...data, introsSeen: [...data.introsSeen, id] };

export const setDailyProgress = (data: SaveData, progress: DailyProgress | undefined): SaveData => {
  if (progress === undefined) {
    return { ...data, daily: { attempts: data.daily.attempts, streak: data.daily.streak } };
  }
  return { ...data, daily: { ...data.daily, inProgress: progress } };
};

export const recordJourneyBadge = (data: SaveData, id: string): SaveData => {
  if (journeyTrial(id) === undefined || data.journeyBadges?.includes(id) === true) return data;
  return { ...data, journeyBadges: [...(data.journeyBadges ?? []), id] };
};
