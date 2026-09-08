import { describe, expect, it } from 'vitest';
import type { DailyAttempt, StorageLike } from '../../core/storage';
import {
  bestAttempt,
  DAILY_BUDGET,
  dailyLevel,
  dailyPuzzleId,
  dailyShareText,
  isoWeekDates,
  parseDailyPuzzleId,
  sharedAttempt,
  streakAfter,
  utcDateKey,
} from '../daily';
import { DailyMode } from '../modes/daily';
import type { BoardMode } from '../modes/types';
import { SaveStore } from '../saveStore';

const mem = (): StorageLike => {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
};

const attempt = (over: Partial<DailyAttempt> = {}): DailyAttempt => ({
  puzzleId: dailyPuzzleId('2026-09-08', 1),
  attempt: 1,
  moves: 3,
  timeMs: 65000,
  target: 2,
  completedAt: '2026-09-08T10:00:00.000Z',
  ...over,
});

describe('datonøkler og puslespill-id', () => {
  it('utcDateKey gir YYYY-MM-DD i UTC', () => {
    expect(utcDateKey(new Date('2026-09-08T23:30:00.000Z'))).toBe('2026-09-08');
    expect(utcDateKey(new Date('2026-01-01T00:00:00.000Z'))).toBe('2026-01-01');
  });

  it('dailyPuzzleId og parseDailyPuzzleId er rundtur', () => {
    const id = dailyPuzzleId('2026-09-08', 3);
    expect(parseDailyPuzzleId(id)).toEqual({ dateKey: '2026-09-08', contentVersion: 3 });
  });

  it('parseDailyPuzzleId gir null for ugyldig id', () => {
    expect(parseDailyPuzzleId('w1-01')).toBeNull();
    expect(parseDailyPuzzleId('daily-2026-9-8-v1')).toBeNull();
    expect(parseDailyPuzzleId('')).toBeNull();
  });
});

describe('isoWeekDates', () => {
  it('tirsdag gir mandag og tirsdag', () => {
    expect(isoWeekDates('2026-09-08')).toEqual(['2026-09-07', '2026-09-08']);
  });

  it('mandag gir én dato', () => {
    expect(isoWeekDates('2026-09-07')).toEqual(['2026-09-07']);
  });

  it('søndag gir hele uken fra mandag', () => {
    expect(isoWeekDates('2026-09-13')).toEqual([
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
      '2026-09-13',
    ]);
  });

  it('krysser månedsskifte', () => {
    expect(isoWeekDates('2026-03-01')).toEqual([
      '2026-02-23',
      '2026-02-24',
      '2026-02-25',
      '2026-02-26',
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
    ]);
  });
});

describe('dailyLevel', () => {
  it('er deterministisk for samme dato', () => {
    const a = dailyLevel('2026-09-07', 1);
    const b = dailyLevel('2026-09-07', 1);
    expect(a).not.toBeNull();
    expect(a).toEqual(b);
    expect(a?.id).toBe(dailyPuzzleId('2026-09-07', 1));
  });

  it('gir ulike brett for to dager i samme uke', () => {
    const mon = dailyLevel('2026-09-07', 1);
    const tue = dailyLevel('2026-09-08', 1);
    expect(mon).not.toBeNull();
    expect(tue).not.toBeNull();
    expect(mon?.tiles.map((t) => t.symbol).join('')).not.toBe(tue?.tiles.map((t) => t.symbol).join(''));
  });

  it('gir null for ugyldig datonøkkel', () => {
    expect(dailyLevel('ikke-en-dato', 1)).toBeNull();
  });
});

describe('dailyShareText', () => {
  it('har tre linjer med trekk, mål, tid og ruter', () => {
    const text = dailyShareText(attempt());
    expect(text).toBe(
      [`Palintris ${dailyPuzzleId('2026-09-08', 1)}`, '3 trekk · mål 2 · 1:05 · forsøk 1', '🟩🟩🟨'].join('\n')
    );
  });

  it('gir bare grønne ruter når målet er nådd', () => {
    const lines = dailyShareText(attempt({ moves: 2, target: 2, timeMs: 9000, attempt: 2 })).split('\n');
    expect(lines[1]).toBe('2 trekk · mål 2 · 0:09 · forsøk 2');
    expect(lines[2]).toBe('🟩🟩');
  });
});

describe('streakAfter', () => {
  it('teller sammenhengende dager til og med datoen', () => {
    const attempts = ['2026-09-06', '2026-09-07', '2026-09-08'].map((d) =>
      attempt({ puzzleId: dailyPuzzleId(d, 1) })
    );
    expect(streakAfter(attempts, '2026-09-08')).toBe(3);
  });

  it('brytes av en dag uten forsøk', () => {
    const attempts = ['2026-09-05', '2026-09-07', '2026-09-08'].map((d) =>
      attempt({ puzzleId: dailyPuzzleId(d, 1) })
    );
    expect(streakAfter(attempts, '2026-09-08')).toBe(2);
  });

  it('er 0 når dagen selv mangler forsøk', () => {
    const attempts = [attempt({ puzzleId: dailyPuzzleId('2026-09-07', 1) })];
    expect(streakAfter(attempts, '2026-09-08')).toBe(0);
  });

  it('teller flere forsøk samme dag som én', () => {
    const attempts = [
      attempt({ puzzleId: dailyPuzzleId('2026-09-08', 1), attempt: 1 }),
      attempt({ puzzleId: dailyPuzzleId('2026-09-08', 1), attempt: 2 }),
    ];
    expect(streakAfter(attempts, '2026-09-08')).toBe(1);
  });
});

describe('bestAttempt', () => {
  it('velger færrest trekk, så minst tid', () => {
    const id = dailyPuzzleId('2026-09-08', 1);
    const attempts = [
      attempt({ puzzleId: id, attempt: 1, moves: 4, timeMs: 1000 }),
      attempt({ puzzleId: id, attempt: 2, moves: 3, timeMs: 9000 }),
      attempt({ puzzleId: id, attempt: 3, moves: 3, timeMs: 5000 }),
      attempt({ puzzleId: dailyPuzzleId('2026-09-07', 1), attempt: 1, moves: 1, timeMs: 100 }),
    ];
    expect(bestAttempt(attempts, id)?.attempt).toBe(3);
  });

  it('gir undefined uten forsøk på puslespillet', () => {
    expect(bestAttempt([], dailyPuzzleId('2026-09-08', 1))).toBeUndefined();
  });
});

describe('sharedAttempt', () => {
  it('velger første fullførte forsøk, ikke det beste', () => {
    const id = dailyPuzzleId('2026-09-08', 1);
    const attempts = [
      attempt({ puzzleId: id, attempt: 1, moves: 6, timeMs: 9000 }),
      attempt({ puzzleId: id, attempt: 2, moves: 3, timeMs: 1000 }),
    ];
    expect(sharedAttempt(attempts, id)?.moves).toBe(6);
  });

  it('gir undefined når dagen ikke er fullført', () => {
    expect(sharedAttempt([], dailyPuzzleId('2026-09-08', 1))).toBeUndefined();
  });
});

describe('DailyMode', () => {
  const now = (): Date => new Date('2026-09-07T12:00:00.000Z');

  it('todayId følger klokken og innholdsversjonen', () => {
    const mode = new DailyMode(new SaveStore(mem()), 1, now);
    expect(mode.todayId()).toBe(dailyPuzzleId('2026-09-07', 1));
  });

  it('load gir tidtaking uten budsjettvisning', () => {
    const mode = new DailyMode(new SaveStore(mem()), 1, now);
    const lvl = mode.load(mode.todayId());
    expect(lvl).not.toBeNull();
    if (lvl === null) return;
    expect(lvl.showBudget).toBe(false);
    expect(lvl.budget).toBe(DAILY_BUDGET);
    expect(lvl.id).toBe(mode.todayId());
    const asMode: BoardMode = mode;
    expect(asMode.isUnlocked(lvl.id)).toBe(true);
    expect(mode.load('w1-01')).toBeNull();
  });

  it('registrerer forsøk 1 og 2 og setter streak første dag', () => {
    const store = new SaveStore(mem());
    const mode = new DailyMode(store, 1, now);
    const id = mode.todayId();
    const lvl = mode.load(id)!;

    const first = mode.onSolved(id, lvl.target, { timeMs: 12000 });
    expect(first.stars).toBe(3);
    expect(first.previousStars).toBe(0);
    expect(first.nextLevelId).toBeNull();
    expect(store.data.daily.attempts).toHaveLength(1);
    expect(store.data.daily.attempts[0]?.attempt).toBe(1);
    expect(store.data.daily.attempts[0]?.timeMs).toBe(12000);
    expect(store.data.daily.attempts[0]?.target).toBe(lvl.target);
    expect(store.data.daily.streak).toBe(1);

    const second = mode.onSolved(id, lvl.target + 3, { timeMs: 30000 });
    expect(store.data.daily.attempts).toHaveLength(2);
    expect(store.data.daily.attempts[1]?.attempt).toBe(2);
    expect(second.previousStars).toBe(3);
    expect(store.data.daily.streak).toBe(1);
  });

  it('bruker 0 ms når info mangler og fjerner inProgress', () => {
    const store = new SaveStore(mem());
    const mode = new DailyMode(store, 1, now);
    const id = mode.todayId();
    store.update((d) => ({
      ...d,
      daily: {
        ...d.daily,
        inProgress: { puzzleId: id, startedAt: '2026-09-07T11:00:00.000Z', elapsedMs: 1, commands: [] },
      },
    }));
    expect(store.data.daily.inProgress).toBeDefined();

    const lvl = mode.load(id)!;
    mode.onSolved(id, lvl.target);
    expect(store.data.daily.inProgress).toBeUndefined();
    expect(store.data.daily.attempts[0]?.timeMs).toBe(0);
  });

  it('ukjent id gir null-utfall uten lagring', () => {
    const store = new SaveStore(mem());
    const mode = new DailyMode(store, 1, now);
    const out = mode.onSolved('tull', 2);
    expect(out.stars).toBe(0);
    expect(store.data.daily.attempts).toHaveLength(0);
  });
});
