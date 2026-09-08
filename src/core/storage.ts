import type { StarMap } from './progression';

export interface Settings {
  sound: boolean;
  music: boolean;
  reducedMotion: boolean;
  colorBlind: boolean;
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

export interface SaveData {
  readonly saveVersion: 1;
  readonly stars: Readonly<Record<string, StarRecord>>;
  readonly daily: { readonly attempts: readonly DailyAttempt[]; readonly streak: number };
  readonly blitz: { readonly best: number };
  readonly settings: Settings;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const SAVE_KEY = 'palintris.save.v1';
export const LEGACY_SETTINGS_KEY = 'palintris_settings';

export const defaultSave = (): SaveData => ({
  saveVersion: 1,
  stars: {},
  daily: { attempts: [], streak: 0 },
  blitz: { best: 0 },
  settings: { sound: true, music: true, reducedMotion: false, colorBlind: false },
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
    },
  };
};

export const loadSave = (storage: StorageLike): SaveData => {
  const parsed = readJson(storage, SAVE_KEY);
  if (isRecord(parsed) && parsed['saveVersion'] === 1) {
    const base = defaultSave();
    return {
      saveVersion: 1,
      stars: isRecord(parsed['stars']) ? (parsed['stars'] as Record<string, StarRecord>) : base.stars,
      daily: isRecord(parsed['daily']) ? (parsed['daily'] as SaveData['daily']) : base.daily,
      blitz: isRecord(parsed['blitz']) ? (parsed['blitz'] as SaveData['blitz']) : base.blitz,
      settings: isRecord(parsed['settings']) ? { ...base.settings, ...(parsed['settings'] as Partial<Settings>) } : base.settings,
    };
  }
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
