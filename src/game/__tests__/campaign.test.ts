import { describe, expect, it } from 'vitest';
import { CAMPAIGN } from '../../content/campaign';
import { levelId, LEVELS_PER_WORLD, WORLD_GATE } from '../../core/progression';
import type { StorageLike } from '../../core/storage';
import { CampaignMode } from '../modes/campaign';
import { SaveStore } from '../saveStore';
import { BoardSession } from '../session';
import { solve } from '../../core/solver';
import type { Command } from '../../core/commands';

const mem = (): StorageLike => {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
};

describe('CampaignMode', () => {
  it('laster nivå med regler, mål og budsjett fra kampanjen', () => {
    const mode = new CampaignMode(new SaveStore(mem()));
    const lvl = mode.load('w1-01');
    expect(lvl).not.toBeNull();
    if (lvl === null) return;
    const src = CAMPAIGN.levels[0]!;
    expect(lvl.world).toBe(1);
    expect(lvl.n).toBe(1);
    expect(lvl.target).toBe(src.target);
    expect(lvl.budget).toBe(src.budget);
    expect(lvl.targetExact).toBe(src.targetExact);
    expect(lvl.rules.allowedOps.has('swap')).toBe(true);
    expect(lvl.contentVersion).toBe(CAMPAIGN.contentVersion);
    expect(lvl.showBudget).toBe(true);
    expect(mode.load('w9-01')).toBeNull();
  });

  it('isUnlocked følger progresjonen', () => {
    const mode = new CampaignMode(new SaveStore(mem()));
    expect(mode.isUnlocked('w1-01')).toBe(true);
    expect(mode.isUnlocked('w1-02')).toBe(false);
    mode.onSolved('w1-01', 1);
    expect(mode.isUnlocked('w1-02')).toBe(true);
  });

  it('onSolved lagrer beste stjerner og gir neste nivå', () => {
    const store = new SaveStore(mem());
    const mode = new CampaignMode(store);
    const lvl = mode.load('w1-01')!;
    const first = mode.onSolved('w1-01', lvl.budget);
    expect(first.stars).toBe(1);
    expect(first.previousStars).toBe(0);
    expect(first.nextLevelId).toBe('w1-02');
    expect(first.nextUnlocked).toBe(true);
    expect(first.worldJustUnlocked).toBeNull();
    const second = mode.onSolved('w1-01', lvl.target);
    expect(second.stars).toBe(3);
    expect(second.previousStars).toBe(1);
    expect(store.stars()['w1-01']).toBe(3);
    const third = mode.onSolved('w1-01', lvl.budget);
    expect(store.stars()['w1-01']).toBe(3);
    expect(third.stars).toBe(1);
  });

  it('tolvte løste nivå i en verden låser opp neste verden', () => {
    const mode = new CampaignMode(new SaveStore(mem()));
    for (let n = 1; n < WORLD_GATE; n++) {
      const out = mode.onSolved(levelId(1, n), 1);
      expect(out.worldJustUnlocked).toBeNull();
    }
    const out = mode.onSolved(levelId(1, WORLD_GATE), 1);
    expect(out.worldJustUnlocked).toBe(2);
    expect(mode.isUnlocked('w2-01')).toBe(true);
    expect(mode.onSolved(levelId(1, WORLD_GATE + 1), 1).worldJustUnlocked).toBeNull();
  });

  it('siste nivå i verden 1 uten nok løste gir neste nivå låst', () => {
    const mode = new CampaignMode(new SaveStore(mem()));
    const out = mode.onSolved(levelId(1, LEVELS_PER_WORLD), 1);
    expect(out.nextLevelId).toBe('w2-01');
    expect(out.nextUnlocked).toBe(false);
  });

  it('over budsjett gir 0 stjerner og lagrer ingenting', () => {
    const store = new SaveStore(mem());
    const mode = new CampaignMode(store);
    const lvl = mode.load('w1-01')!;
    const out = mode.onSolved('w1-01', lvl.budget + 1);
    expect(out.stars).toBe(0);
    expect(store.stars()['w1-01']).toBeUndefined();
    expect(out.nextUnlocked).toBe(false);
  });
});

describe('førsteforsøk og mestring', () => {
  const fixture = (): { mode: CampaignMode; store: SaveStore; storage: StorageLike } => {
    const storage = mem();
    const store = new SaveStore(storage);
    const mode = new CampaignMode(store);
    expect(typeof mode.beginAttempt).toBe('function');
    return { mode, store, storage };
  };
  const move = (mode: CampaignMode, id: string, movesUsed = 1, solved = false): void =>
    mode.recordCommand(id, { type: 'swap', a: 0, b: 1 }, { movesUsed, solved, budgetLeft: solved ? 0 : 4 });

  it('holder samme førsteforsøk over omstart og teller avbrudd som vanlig', () => {
    const { mode, storage } = fixture();
    mode.beginAttempt('w1-01');
    mode.tickAttempt('w1-01', 800);
    mode.flushAttempt('w1-01');
    let store = new SaveStore(storage);
    let reload = new CampaignMode(store);
    reload.beginAttempt('w1-01');
    expect(store.data.campaign?.firstAttempts['w1-01']?.activeMs).toBe(800);
    move(reload, 'w1-01');
    store = new SaveStore(storage);
    reload = new CampaignMode(store);
    reload.beginAttempt('w1-01');
    expect(store.data.campaign?.firstAttempts['w1-01']?.end?.reason).toBe('interrupted');
    reload.onSolved('w1-01', 1);
    reload.beginAttempt('w1-01');
    expect(Object.keys(store.data.campaign!.firstAttempts)).toEqual(['w1-01']);
    expect(store.data.campaign?.firstAttempts['w1-01']?.end?.reason).toBe('interrupted');
  });

  it('reset og angre kan ikke slette tidligere observasjoner', () => {
    const { mode, store } = fixture();
    mode.beginAttempt('w1-01');
    move(mode, 'w1-01');
    mode.recordCommand('w1-01', { type: 'undo' }, { movesUsed: 0, solved: false, budgetLeft: 5 });
    mode.recordCommand('w1-01', { type: 'reset' }, { movesUsed: 0, solved: false, budgetLeft: 5 });
    move(mode, 'w1-01', 1, true);
    mode.onSolved('w1-01', 1);
    expect(store.data.campaign?.firstAttempts['w1-01']).toMatchObject({ movesMade: 1, undoCount: 1, end: { reason: 'reset' } });
    expect(store.stars()['w1-01']).toBe(3);
  });

  it('tre nye optimale løsninger åpner valgfri prøve og prøven gir bare tilgang', () => {
    const { mode, store, storage } = fixture();
    const paths: Record<string, readonly Command[]> = {
      'w1-01': [{ type: 'swap', a: 2, b: 3 }],
      'w1-02': [{ type: 'swap', a: 2, b: 3 }],
      'w1-03': [{ type: 'swap', a: 1, b: 2 }, { type: 'swap', a: 0, b: 1 }],
    };
    for (const [id, path] of Object.entries(paths)) {
      mode.beginAttempt(id);
      const level = mode.load(id)!;
      let pending: Command | null = null;
      const session = new BoardSession({ ...level, solver: { solve: (req) => Promise.resolve(solve(req)), cancelAll: () => undefined },
        onChange: (view) => {
          if (pending === null) return;
          mode.recordCommand(id, pending, view);
          if (view.solved) mode.onSolved(id, view.movesUsed);
        } });
      for (const command of path) {
        pending = command;
        expect(session.dispatch(command).ok).toBe(true);
        pending = null;
      }
      expect(session.view().solved).toBe(true);
      expect(new SaveStore(storage).data.campaign?.firstAttempts[id]?.end?.reason).toBe('solved');
      session.dispose();
    }
    expect(store.data.campaign?.access.offeredCheckpoints).toEqual(['w1-15']);
    expect(mode.isUnlocked('w1-15')).toBe(true);
    expect(mode.isUnlocked('w1-08')).toBe(false);
    mode.beginAttempt('w1-15');
    mode.onSolved('w1-15', mode.load('w1-15')!.target + 1);
    expect(mode.isUnlocked('w2-01')).toBe(true);
    expect(mode.isUnlocked('w1-08')).toBe(true);
    expect(store.stars()['w1-08']).toBeUndefined();
    expect(Object.keys(store.data.campaign!.firstAttempts)).toHaveLength(3);
    const restored = new CampaignMode(new SaveStore(storage));
    expect(restored.isUnlocked('w2-01')).toBe(true);
    expect(restored.isUnlocked('w2-02')).toBe(false);
  });

  it('preview, gamle stjerner og låste nivåer lager ikke nye mestringssignaler', () => {
    const { mode, store } = fixture();
    for (const id of ['w1-01', 'w1-02', 'w1-03']) {
      mode.beginAttempt(id, true);
      move(mode, id, 1, true);
      mode.tickAttempt(id, 1000);
      mode.onSolved(id, 1);
    }
    expect(store.data.campaign).toBeUndefined();
    mode.beginAttempt('w1-01');
    mode.beginAttempt('w5-03');
    expect(store.data.campaign).toBeUndefined();
  });

  it('fullføring på siste budsjett-trekk er solved, ikke exhausted', () => {
    const { mode, store } = fixture();
    mode.beginAttempt('w1-01');
    for (let n = 1; n <= 5; n++) move(mode, 'w1-01', n, n === 5);
    mode.onSolved('w1-01', 5);
    expect(store.data.campaign?.firstAttempts['w1-01']?.end?.reason).toBe('solved');
  });
});

it('endrer ikke tilbud under tenketid eller et pågående forsøk', () => {
  const store = new SaveStore(mem());
  store.update((d) => ({ ...d,
    stars: { 'w1-01': { stars: 3, contentVersion: 1 }, 'w1-02': { stars: 3, contentVersion: 1 }, 'w1-03': { stars: 3, contentVersion: 1 } },
    campaign: { access: { offeredCheckpoints: [], masteredWorlds: [] }, firstAttempts: Object.fromEntries(
      ['w1-01', 'w1-02', 'w1-03'].map((id, i) => [id, { levelId: id, contentVersion: 1, ordinal: i + 1, activeMs: 1000,
        movesMade: i === 2 ? 2 : 1, undoCount: 0, end: { reason: 'solved' as const, movesUsed: i === 2 ? 2 : 1 } }])
    ) },
  }));
  const mode = new CampaignMode(store);
  mode.beginAttempt('w1-04');
  mode.tickAttempt('w1-04', 2000);
  expect(store.data.campaign?.access.offeredCheckpoints).toEqual([]);
  mode.recordCommand('w1-04', { type: 'swap', a: 0, b: 1 }, { movesUsed: 1, solved: true, budgetLeft: 4 });
  expect(store.data.campaign?.access.offeredCheckpoints).toEqual([]);
  mode.onSolved('w1-04', 1);
  expect(store.data.campaign?.access.offeredCheckpoints).toEqual(['w1-15']);
});
