import { describe, expect, it } from 'vitest';
import { CAMPAIGN, getCampaignLevel } from '../../content/campaign';
import { campaignProgress, defaultSave, parseSave, type FirstAttempt, type SaveData } from '../../core/storage';
import { classify, masteryOffer, masteryProgressCount } from '../mastery';
import { CampaignMode } from '../modes/campaign';
import { SaveStore } from '../saveStore';
import { canUseSpeilglimt, debitSpeilglimt, earnedSpeilglimt, speilglimtBalance } from '../tools';

const won = (ids: readonly string[]): SaveData => ({ ...defaultSave(), stars: Object.fromEntries(ids.map(id => [id, { stars: 3, contentVersion: 1 }])) });
const attempt = (id = 'w1-04'): FirstAttempt => ({ levelId: id, contentVersion: 1, ordinal: 1, activeMs: 0, movesMade: 0, undoCount: 0 });
const setup = (data = won(['w1-01', 'w1-02', 'w1-03'])) => {
  let saved = JSON.stringify(data);
  let fail = false;
  let writes = 0;
  const storage = { getItem: () => saved, setItem: (_key: string, value: string) => { writes++; if (fail) throw new Error('full'); saved = value; } };
  const store = new SaveStore(storage);
  return { store, mode: new CampaignMode(store), storage, fail: (value: boolean) => { fail = value; }, writes: () => writes };
};

describe('Speilglimt', () => {
  it('counts distinct actual campaign wins, including intro and checkpoint, up to 30', () => {
    expect(earnedSpeilglimt(won(['w1-01', 'w1-15', 'w2-01']))).toBe(1);
    expect(earnedSpeilglimt(won(['w1-01', 'journey-quota-01', 'unknown']))).toBe(0);
    expect(earnedSpeilglimt(won(CAMPAIGN.levels.map(l => l.id)))).toBe(30);
    expect(speilglimtBalance({ ...won(['w1-01']), tools: { speilglimtSpent: 20 } })).toBe(0);
    expect(earnedSpeilglimt({ ...defaultSave(), stars: { 'w1-01': { stars: 0, contentVersion: 1 } } })).toBe(0);
  });
  it('debits without mutation and cannot farm replay or overdraw', () => {
    const data = won(['w1-01', 'w1-02', 'w1-03']);
    const spent = debitSpeilglimt(data);
    expect(data.tools).toBeUndefined();
    expect(speilglimtBalance(spent)).toBe(0);
    expect(earnedSpeilglimt(spent)).toBe(1);
    expect(debitSpeilglimt(spent)).toBe(spent);
  });
  it('uses the exact intro list and rejects checkpoints/trials/unknown ids', () => {
    for (const id of ['w1-01', 'w2-01', 'w3-01', 'w4-01', 'w5-01', 'w5-02', 'w6-15', 'journey-quota-01', 'unknown']) expect(canUseSpeilglimt(id)).toBe(false);
    expect(canUseSpeilglimt('w6-01')).toBe(true);
    expect(canUseSpeilglimt('w1-04')).toBe(true);
  });
  it.each([undefined, null, [], false, 'bad', {}, { speilglimtSpent: -1 }, { speilglimtSpent: 0.5 }, { speilglimtSpent: 31 }, { speilglimtSpent: 2 ** 54 }, { speilglimtSpent: '1' }, { speilglimtSpent: true }, { speilglimtSpent: null }, { speilglimtSpent: Number.NaN }, { speilglimtSpent: Infinity }])('fails closed for malformed tools %j', tools => {
    const parsed = parseSave({ ...won(['w1-01']), tools });
    expect(parsed?.tools?.speilglimtSpent).toBe(30);
    expect(parsed?.stars['w1-01']?.stars).toBe(3);
  });
  it('preserves legacy absence and every valid debit including unearned debt', () => {
    expect(parseSave(defaultSave())).toEqual(defaultSave());
    for (let spent = 0; spent <= 30; spent++) expect(parseSave({ ...defaultSave(), tools: { speilglimtSpent: spent } })?.tools?.speilglimtSpent).toBe(spent);
  });
  it.each([true, null, 'false', 0, {}, []])('parses present assisted conservatively: %j', assisted => {
    const data = parseSave({ ...defaultSave(), campaign: { firstAttempts: { 'w1-04': { ...attempt(), assisted } }, access: {} } });
    expect(data?.campaign?.firstAttempts['w1-04']?.assisted).toBe(true);
  });
  it('keeps absent/false assisted clean', () => {
    for (const extra of [{}, { assisted: false }]) {
      const data = parseSave({ ...defaultSave(), campaign: { firstAttempts: { 'w1-04': { ...attempt(), ...extra } }, access: {} } });
      expect(data?.campaign?.firstAttempts['w1-04']?.assisted).not.toBe(true);
    }
  });
  it('commits memory only after actual persistence, and leaves normal update policy intact', () => {
    const s = setup();
    const old = s.store.data;
    s.fail(true);
    expect(s.store.tryUpdate(d => ({ ...d, tools: { speilglimtSpent: 1 } }))).toBe(false);
    expect(s.store.data).toBe(old);
    expect(new SaveStore(s.storage).data).toEqual(old);
    s.fail(false);
    expect(s.store.tryUpdate(d => ({ ...d, tools: { speilglimtSpent: 1 } }))).toBe(true);
    expect(new SaveStore(s.storage).data).toEqual(s.store.data);
    s.fail(true);
    s.store.update(d => ({ ...d, blitz: { best: 9 } }));
    expect(s.store.data.blitz.best).toBe(9);
    expect(new SaveStore(s.storage).data.blitz.best).toBe(0);
  });
  it('persists debit, active time and assistance in one write; failed debit preserves pending time', () => {
    const s = setup();
    s.mode.beginAttempt('w1-04');
    s.mode.tickAttempt('w1-04', 420);
    const before = s.store.data;
    s.fail(true);
    expect(s.mode.useSpeilglimt('w1-04')).toBe(false);
    expect(s.store.data).toBe(before);
    s.fail(false);
    const writes = s.writes();
    expect(s.mode.useSpeilglimt('w1-04')).toBe(true);
    expect(s.writes()).toBe(writes + 1);
    s.mode.flushAttempt('w1-04');
    const fresh = new SaveStore(s.storage).data;
    expect(fresh.tools?.speilglimtSpent).toBe(1);
    expect(fresh.campaign?.firstAttempts['w1-04']).toMatchObject({ assisted: true, activeMs: 420 });
    expect(s.mode.useSpeilglimt('w1-04')).toBe(false);
    s.mode.recordCommand('w1-04', { type: 'reset' }, { movesUsed: 0, budgetLeft: 10, solved: false });
    expect(s.store.data.campaign?.firstAttempts['w1-04']?.assisted).toBe(true);
    expect(s.mode.onSolved('w1-04', 1).assisted).toBe(true);
    s.mode.beginAttempt('w1-04');
    expect(s.mode.onSolved('w1-04', 1).assisted).toBeUndefined();
  });
  it('keeps assisted through a real command, undo, flush and reload without creating a clean retry', () => {
    const s = setup(); s.mode.beginAttempt('w1-04');
    expect(s.mode.useSpeilglimt('w1-04')).toBe(true);
    s.mode.tickAttempt('w1-04', 330);
    s.mode.recordCommand('w1-04', { type: 'swap', a: 0, b: 1 }, { movesUsed: 1, budgetLeft: 8, solved: false });
    s.mode.recordCommand('w1-04', { type: 'undo' }, { movesUsed: 0, budgetLeft: 9, solved: false });
    const reloaded = new SaveStore(s.storage);
    const resumed = new CampaignMode(reloaded); resumed.beginAttempt('w1-04');
    expect(reloaded.data.campaign?.firstAttempts['w1-04']).toMatchObject({ assisted: true, activeMs: 330, undoCount: 1, end: { reason: 'interrupted' } });
    expect(resumed.onSolved('w1-04', 1).assisted).toBeUndefined();
  });
  it('debits a legacy replay without inventing a first attempt', () => {
    const s = setup(won(['w1-01', 'w1-02', 'w1-03', 'w1-04']));
    s.mode.beginAttempt('w1-04');
    expect(s.mode.useSpeilglimt('w1-04')).toBe(true);
    expect(s.store.data.campaign).toBeUndefined();
    expect(s.store.data.tools?.speilglimtSpent).toBe(1);
    expect(s.mode.onSolved('w1-04', 1).assisted).toBe(true);
  });
  it('leaves pending time available to an ordinary flush after a failed purchase', () => {
    const s = setup(); s.mode.beginAttempt('w1-04'); s.mode.tickAttempt('w1-04', 725);
    s.fail(true); expect(s.mode.useSpeilglimt('w1-04')).toBe(false);
    s.fail(false); s.mode.flushAttempt('w1-04');
    expect(new SaveStore(s.storage).data.campaign?.firstAttempts['w1-04']).toMatchObject({ activeMs: 725 });
    expect(s.store.data.tools).toBeUndefined();
    expect(s.mode.onSolved('w1-04', 1).assisted).toBeUndefined();
  });
  it('does not expose new memory while the debit is being persisted', () => {
    const storage = { getItem: () => null, setItem: (_key: string, serialized: string) => {
      expect(store.data.tools).toBeUndefined();
      expect(JSON.parse(serialized)).toMatchObject({ tools: { speilglimtSpent: 1 } });
    } };
    const store = new SaveStore(storage);
    expect(store.tryUpdate(data => ({ ...data, tools: { speilglimtSpent: 1 } }))).toBe(true);
    expect(store.data.tools?.speilglimtSpent).toBe(1);
  });
  it('rejects nonactive, preview, locked, introductory and empty-balance purchases without writes', () => {
    for (const [id, preview] of [['w1-01', false], ['w2-04', false], ['w1-15', false], ['w1-04', true], ['unknown', false]] as const) {
      const s = setup(); s.mode.beginAttempt(id, preview); const writes = s.writes();
      expect(s.mode.useSpeilglimt(id)).toBe(false); expect(s.writes()).toBe(writes);
    }
    const s = setup(); s.mode.beginAttempt('w1-04');
    expect(s.mode.useSpeilglimt('w1-03')).toBe(false);
    const empty = setup(defaultSave()); empty.mode.beginAttempt('w1-02');
    expect(empty.mode.useSpeilglimt('w1-02')).toBe(false);
  });
  it('assisted replay preserves historical strong and durable offer; a new replay is unaided', () => {
    const level = getCampaignLevel('w1-04')!;
    const historical: FirstAttempt = { ...attempt(), movesMade: level.target, end: { reason: 'solved', movesUsed: level.target } };
    const data: SaveData = { ...won(['w1-01', 'w1-02', 'w1-03', 'w1-04']), campaign: { firstAttempts: { 'w1-04': historical }, access: { offeredCheckpoints: ['w1-15'], masteredWorlds: [] } } };
    const s = setup(data); s.mode.beginAttempt('w1-04');
    expect(s.mode.useSpeilglimt('w1-04')).toBe(true);
    expect(s.store.data.campaign?.firstAttempts['w1-04']).toEqual(historical);
    expect(classify(historical, level)).toBe('strong');
    expect(masteryOffer(s.store.data, 1)).toBe('w1-15');
    expect(s.mode.onSolved('w1-04', level.target).assisted).toBe(true);
    s.mode.beginAttempt('w1-04'); expect(s.mode.onSolved('w1-04', level.target).assisted).toBeUndefined();
  });
  it('excludes assisted solved and open attempts from mastery', () => {
    const level = getCampaignLevel('w1-04')!;
    expect(classify({ ...attempt(), assisted: true, movesMade: level.target, end: { reason: 'solved', movesUsed: level.target } }, level)).toBe('ordinary');
    const data: SaveData = { ...won(CAMPAIGN.levels.filter(l => !['w1-04', 'w1-05', 'w1-06'].includes(l.id)).map(l => l.id)), campaign: { firstAttempts: { 'w1-04': { ...attempt(), assisted: true } }, access: { offeredCheckpoints: [], masteredWorlds: [] } } };
    expect(masteryProgressCount(data, 1)).toBeNull();
    expect(campaignProgress(data).firstAttempts['w1-04']?.end).toBeUndefined();
  });
});
