import { describe, expect, it } from 'vitest';
import { getCampaignLevel } from '../../content/campaign';
import { defaultSave, type FirstAttempt, type SaveData } from '../../core/storage';
import { ActivePlayClock, classify, familyFor, masteryOffer, masteryProgressCount, practiceDestination, recentFirstAttempts } from '../mastery';

const attempt = (id: string, ordinal: number, patch: Partial<FirstAttempt> = {}): FirstAttempt => ({
  levelId: id, contentVersion: 1, ordinal, activeMs: 1000, movesMade: 2, undoCount: 0,
  end: { reason: 'solved', movesUsed: getCampaignLevel(id)!.target }, ...patch,
});
const dataWith = (attempts: FirstAttempt[]): SaveData => ({ ...defaultSave(),
  stars: Object.fromEntries(attempts.filter((a) => a.end?.reason === 'solved').map((a) => [a.levelId, { stars: 3, contentVersion: 1 }])),
  campaign: { firstAttempts: Object.fromEntries(attempts.map((a) => [a.levelId, a])), access: { offeredCheckpoints: [], masteredWorlds: [] } },
});

describe('mestringssignaler', () => {
  it('holder optimale løsninger sterke uansett tid og bruker tid bare nær målet', () => {
    const level = getCampaignLevel('w2-03')!;
    for (const activeMs of [1, 3_600_000]) expect(classify(attempt(level.id, 1, { activeMs }), level)).toBe('strong');
    expect(classify(attempt(level.id, 1, { activeMs: level.target * 15000, end: { reason: 'solved', movesUsed: level.target + 1 } }), level)).toBe('strong');
    expect(classify(attempt(level.id, 1, { activeMs: level.target * 15000 + 1, end: { reason: 'solved', movesUsed: level.target + 1 } }), level)).toBe('ordinary');
    expect(classify(attempt(level.id, 1, { undoCount: 1 }), level)).toBe('ordinary');
    expect(classify(attempt(level.id, 1), { ...level, targetExact: false })).toBe('ordinary');
  });
  it('tolker avbrudd som nøytralt, bare reset og brukt budsjett som problemer', () => {
    const level = getCampaignLevel('w1-02')!;
    for (const reason of ['interrupted', 'invalid'] as const) expect(classify(attempt(level.id, 1, { end: { reason, movesUsed: 1 } }), level)).toBe('ordinary');
    for (const reason of ['reset', 'exhausted'] as const) expect(classify(attempt(level.id, 1, { end: { reason, movesUsed: 1 } }), level)).toBe('struggling');
    expect(classify(attempt(level.id, 1, { contentVersion: 99 }), level)).toBe('ordinary');
  });
  it('velger fem sist påbegynte fullførte nivåer i samme familie, uten prøven', () => {
    const data = dataWith([attempt('w1-01', 6), attempt('w1-02', 1), attempt('w1-03', 5), attempt('w1-04', 4), attempt('w1-05', 3), attempt('w1-06', 2), attempt('w1-15', 9), attempt('w2-01', 10)]);
    expect(recentFirstAttempts(data, 'adjacent').map((a) => a.levelId)).toEqual(['w1-01', 'w1-03', 'w1-04', 'w1-05', 'w1-06']);
    expect(familyFor('w6-03')).not.toBe(familyFor('w5-03'));
  });
  it('tilbyr prøve ved tre sterke og aldri ved bare to eller ulærte introer', () => {
    expect(masteryOffer(dataWith([attempt('w1-01', 1), attempt('w1-02', 2)]), 1)).toBeNull();
    expect(masteryOffer(dataWith([attempt('w1-01', 1), attempt('w1-02', 2), attempt('w1-03', 3)]), 1)).toBe('w1-15');
    const data = dataWith([attempt('w5-01', 1), attempt('w5-03', 2), attempt('w5-04', 3)]);
    const stars = { ...data.stars, ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`w4-${String(i + 1).padStart(2, '0')}`, { stars: 1, contentVersion: 1 }])) };
    expect(masteryOffer({ ...data, stars, introsSeen: ['w5-01', 'w5-02'] }, 5)).toBeNull();
    expect(masteryOffer({ ...data, stars: { ...stars, 'w5-02': { stars: 1, contentVersion: 1 } } }, 5)).toBe('w5-15');
  });
  it('tilbyr bare frivillig allerede løst øving etter tre problemforsøk', () => {
    const data = dataWith([attempt('w1-02', 1, { end: { reason: 'reset', movesUsed: 1 } }), attempt('w1-03', 2, { end: { reason: 'exhausted', movesUsed: 6 } }), attempt('w1-04', 3, { end: { reason: 'reset', movesUsed: 1 } })]);
    expect(practiceDestination(data, 1)).toBeNull();
    expect(practiceDestination({ ...data, stars: { 'w1-01': { stars: 1, contentVersion: 1 } } }, 1)).toBe('w1-01');
    expect(practiceDestination(data, 2)).toBeNull();
  });
});

describe('aktiv spilletid', () => {
  it('teller tenketid og forkaster pauser og første delta ved gjenopptak', () => {
    const clock = new ActivePlayClock();
    expect(clock.tick(5000, true)).toBe(0);
    expect(clock.tick(1000, true)).toBe(1000);
    expect(clock.tick(60000, false)).toBe(0);
    expect(clock.tick(60000, true)).toBe(0);
    expect(clock.tick(500, true)).toBe(500);
    clock.suspend();
    expect(clock.tick(9000, true)).toBe(0);
    expect(clock.tick(100, true)).toBe(100);
  });
});


describe('oppnåelig mestringsteller', () => {
  const remaining = (ids: string[], attempts: FirstAttempt[] = []): SaveData => ({ ...dataWith(attempts),
    stars: Object.fromEntries(Array.from({ length: 15 }, (_, i) => `w1-${String(i + 1).padStart(2, '0')}`)
      .filter((id) => !ids.includes(id)).map((id) => [id, { stars: 1, contentVersion: 1 }])),
  });
  const ordinary = (id: string, ordinal: number): FirstAttempt => attempt(id, ordinal, { undoCount: 1 });
  const pending = (id: string, ordinal: number, patch: Partial<FirstAttempt> = {}): FirstAttempt =>
    attempt(id, ordinal, { end: undefined, movesMade: 0, ...patch });

  it('beholder telleren for ny reise, men skjuler den for gammel gjennomspilt verden', () => {
    expect(masteryProgressCount(defaultSave(), 1)).toBe(0);
    expect(masteryProgressCount(dataWith([attempt('w1-01', 1)]), 1)).toBe(1);
    expect(masteryProgressCount(remaining([]), 1)).toBeNull();
  });
  it('trenger minst tre mulige sterke når ingen allerede teller', () => {
    expect(masteryProgressCount(remaining(['w1-13']), 1)).toBeNull();
    expect(masteryProgressCount(remaining(['w1-13', 'w1-14']), 1)).toBeNull();
    expect(masteryProgressCount(remaining(['w1-12', 'w1-13', 'w1-14']), 1)).toBe(0);
    expect(masteryProgressCount(remaining(['w1-13', 'w1-14', 'w1-15']), 1)).toBeNull();
  });
  it('lar gamle sterke falle ut av femvinduet og beholder nyere sterke', () => {
    const oldStrong = [attempt('w1-01', 1), attempt('w1-02', 2), ordinary('w1-03', 3), ordinary('w1-04', 4), ordinary('w1-05', 5)];
    expect(masteryProgressCount(remaining(['w1-14'], oldStrong), 1)).toBeNull();
    const newStrong = [ordinary('w1-01', 1), ordinary('w1-02', 2), ordinary('w1-03', 3), attempt('w1-04', 4), attempt('w1-05', 5)];
    expect(masteryProgressCount(remaining(['w1-14'], newStrong), 1)).toBe(2);
  });
  it('bruker opprinnelig ordinal for påbegynt nulltrekksforsøk', () => {
    const finished = [ordinary('w1-02', 2), ordinary('w1-03', 3), ordinary('w1-04', 4), ordinary('w1-05', 5), ordinary('w1-06', 6)];
    expect(masteryProgressCount(remaining(['w1-01', 'w1-13', 'w1-14'], [pending('w1-01', 1), ...finished]), 1)).toBeNull();
    expect(masteryProgressCount(remaining(['w1-01', 'w1-13', 'w1-14'], [pending('w1-01', 7), ...finished]), 1)).toBe(0);
  });
  it('regner ikke brukte, angrede, gamle eller terminale forsøk som ferske muligheter', () => {
    for (const patch of [{ movesMade: 1 }, { undoCount: 1 }, { contentVersion: 99 }, { end: { reason: 'invalid' as const, movesUsed: 0 } }]) {
      expect(masteryProgressCount(remaining(['w1-12', 'w1-13', 'w1-14'], [pending('w1-12', 1, patch)]), 1)).toBeNull();
    }
    expect(masteryProgressCount(remaining(['w1-13', 'w1-14'], [pending('w1-12', 1)]), 1)).toBeNull();
  });
  it('lar opptjente prøve- og øvingstilbud være uendret', () => {
    const data = remaining([], [attempt('w1-01', 1), attempt('w1-02', 2), attempt('w1-03', 3)]);
    const before = JSON.stringify(data);
    expect(masteryOffer(data, 1)).toBe('w1-15');
    expect(masteryProgressCount(data, 1)).toBe(3);
    expect(masteryOffer(data, 1)).toBe('w1-15');
    expect(JSON.stringify(data)).toBe(before);
    expect(masteryProgressCount(data, 0)).toBeNull();
    const earned = remaining([]);
    const durable = { ...earned, campaign: { firstAttempts: {}, access: { offeredCheckpoints: ['w1-15'], masteredWorlds: [] } } };
    expect(masteryProgressCount(durable, 1)).toBeNull();
    expect(masteryOffer(durable, 1)).toBe('w1-15');
    const struggling = remaining([], ['w1-01', 'w1-02', 'w1-03'].map((id, i) => attempt(id, i + 1, { end: { reason: 'reset', movesUsed: 1 } })));
    expect(masteryProgressCount(struggling, 1)).toBeNull();
    expect(practiceDestination(struggling, 1)).toBe('w1-01');
  });
});
