import type { Level, Recipe } from '../core/level';
import { makeLevel } from '../core/level';
import type { DailyAttempt } from '../core/storage';
import { symbolKey } from '../core/tiles';

/**
 * Dagens brett er likt på alle enheter, så alt her er rent deterministisk:
 * ingen ms-grense i løseren og ingen avhengighet til lokal tidssone.
 */
export const DAILY_RECIPE: Recipe = {
  id: 'daily',
  lengthRange: [7, 9],
  alphabet: 4,
  allowedOps: ['swap', 'rotate', 'mirror'],
  movesRange: [2, 4],
  slack: 4,
  hand: { wild: 0, remove: 0 },
  lockedRange: [0, 0],
  scrambleRange: [2, 5],
  solverStates: 50000,
};

/** Dagens brett har ingen reell trekkgrense; budsjettet er bare stjernegrunnlag. */
export const DAILY_BUDGET = 999;

const DAILY_ATTEMPTS = 60;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const PUZZLE_ID = /^daily-(\d{4}-\d{2}-\d{2})-v(\d+)$/;
const DAY_MS = 86_400_000;

export const utcDateKey = (d: Date): string => d.toISOString().slice(0, 10);

export const dailyPuzzleId = (dateKey: string, contentVersion: number): string =>
  `daily-${dateKey}-v${contentVersion}`;

const dateFromKey = (dateKey: string): Date | null => {
  if (!DATE_KEY.test(dateKey)) return null;
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  // Fanger overflyt som '2026-02-30', der Date ruller videre til neste måned.
  return utcDateKey(d) === dateKey ? d : null;
};

export const parseDailyPuzzleId = (id: string): { dateKey: string; contentVersion: number } | null => {
  const m = PUZZLE_ID.exec(id);
  if (m === null) return null;
  const dateKey = m[1];
  const version = m[2];
  if (dateKey === undefined || version === undefined) return null;
  if (dateFromKey(dateKey) === null) return null;
  return { dateKey, contentVersion: Number(version) };
};

const shiftDays = (dateKey: string, days: number): string | null => {
  const d = dateFromKey(dateKey);
  return d === null ? null : utcDateKey(new Date(d.getTime() + days * DAY_MS));
};

/** Datoene fra mandag i ISO-uken til og med `dateKey`. Tom liste for ugyldig dato. */
export const isoWeekDates = (dateKey: string): string[] => {
  const d = dateFromKey(dateKey);
  if (d === null) return [];
  const isoWeekday = (d.getUTCDay() + 6) % 7;
  const out: string[] = [];
  for (let i = isoWeekday; i >= 0; i--) {
    out.push(utcDateKey(new Date(d.getTime() - i * DAY_MS)));
  }
  return out;
};

const levelCache = new Map<string, Level | null>();

/**
 * Ukens dager genereres i rekkefølge slik at hver dag kan avvise brett som
 * allerede er brukt tidligere i samme uke. Rekkefølgen er den samme uansett
 * hvilken dag som spørres om, så resultatet er stabilt og caches.
 */
export const dailyLevel = (dateKey: string, contentVersion: number): Level | null => {
  const days = isoWeekDates(dateKey);
  if (days.length === 0) return null;

  const previousKeys: string[] = [];
  let result: Level | null = null;
  for (const day of days) {
    const id = dailyPuzzleId(day, contentVersion);
    let level = levelCache.get(id);
    if (level === undefined) {
      level = makeLevel(DAILY_RECIPE, {
        id,
        contentVersion,
        previousKeys,
        attempts: DAILY_ATTEMPTS,
        requireExact: false,
      });
      levelCache.set(id, level);
    }
    if (level !== null) previousKeys.push(symbolKey(level.tiles));
    result = level;
  }
  return result;
};

export const mmss = (timeMs: number): string => {
  const total = Math.max(0, Math.floor(timeMs / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

export const dailyShareText = (a: DailyAttempt): string => {
  const green = '🟩'.repeat(Math.min(a.moves, a.target));
  const yellow = '🟨'.repeat(Math.max(0, a.moves - a.target));
  return [
    `Palintris ${a.puzzleId}`,
    `${a.moves} trekk · mål ${a.target} · ${mmss(a.timeMs)} · forsøk ${a.attempt}`,
    green + yellow,
  ].join('\n');
};

/** Antall sammenhengende dager til og med `dateKey` med minst ett fullført forsøk. */
export const streakAfter = (attempts: readonly DailyAttempt[], dateKey: string): number => {
  const done = new Set<string>();
  for (const a of attempts) {
    const parsed = parseDailyPuzzleId(a.puzzleId);
    if (parsed !== null) done.add(parsed.dateKey);
  }
  let count = 0;
  let cursor: string | null = dateKey;
  while (cursor !== null && done.has(cursor)) {
    count++;
    cursor = shiftDays(cursor, -1);
  }
  return count;
};

/** Dagens resultat er første fullførte forsøk; senere forsøk er trening og deles ikke. */
export const sharedAttempt = (
  attempts: readonly DailyAttempt[],
  puzzleId: string
): DailyAttempt | undefined => attempts.find((a) => a.puzzleId === puzzleId && a.attempt === 1);

/** Færrest trekk vinner, deretter minst tid. */
export const bestAttempt = (
  attempts: readonly DailyAttempt[],
  puzzleId: string
): DailyAttempt | undefined => {
  let best: DailyAttempt | undefined;
  for (const a of attempts) {
    if (a.puzzleId !== puzzleId) continue;
    if (best === undefined || a.moves < best.moves || (a.moves === best.moves && a.timeMs < best.timeMs)) {
      best = a;
    }
  }
  return best;
};
