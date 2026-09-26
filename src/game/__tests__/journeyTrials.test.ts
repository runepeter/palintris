import { describe, expect, it } from 'vitest';
import { JOURNEY_TRIALS, journeyTrial, journeyTrialUnlocked, journeyTrialsForWorld } from '../../content/journeyTrials';
import { defaultSave, parseSave, recordJourneyBadge, type SaveData } from '../../core/storage';
import { journeyDestination, journeyNextLevel } from '../journey';

const completed = (...ids: string[]): SaveData => ({ ...defaultSave(), stars: Object.fromEntries(ids.map((id) => [id, { stars: 1, contentVersion: 1 }])) });
const twelve = Array.from({ length: 12 }, (_, i) => `w2-${String(i + 1).padStart(2, '0')}`);

describe('nye reiseprøver', () => {
  it('har tre eksplisitte ID-er og avviser ukjente uten å tolke legacy-ID-er', () => {
    expect(JOURNEY_TRIALS.map((trial) => trial.id)).toEqual(['journey-quota-01', 'journey-quota-02', 'journey-center-01']);
    expect(journeyTrial('w2-01')).toBeUndefined();
    expect(journeyTrial('journey-quota-03')).toBeUndefined();
  });
  it('krever faktisk rotasjonsintro og mestring eller tolv ekte nivåer', () => {
    expect(journeyTrialUnlocked('journey-quota-01', completed(...twelve))).toBe(true);
    expect(journeyTrialUnlocked('journey-quota-01', completed(...twelve.slice(1)))).toBe(false);
    const mastered = { ...completed('w2-01', 'w2-15'), campaign: { firstAttempts: {}, access: { offeredCheckpoints: [], masteredWorlds: [2] } } };
    expect(journeyTrialUnlocked('journey-quota-01', mastered)).toBe(true);
    expect(journeyTrialUnlocked('journey-quota-01', { ...mastered, stars: {} })).toBe(false);
    expect(journeyTrialUnlocked('unknown', mastered)).toBe(false);
  });
  it('krever ekte kvoteseier og speilintro for center, men ikke valgfri kvote02', () => {
    expect(journeyTrialUnlocked('journey-quota-02', completed('journey-quota-01'))).toBe(true);
    expect(journeyTrialUnlocked('journey-center-01', completed('journey-quota-01'))).toBe(false);
    const save = completed('journey-quota-01', 'w3-01');
    expect(journeyTrialUnlocked('journey-center-01', save)).toBe(true);
    expect(journeyTrialsForWorld(3, save).map((trial) => trial.id)).toEqual(['journey-center-01']);
    expect(journeyTrialUnlocked('journey-center-01', { ...save, stars: {}, journeyBadges: ['journey-center-01'], introsSeen: ['journey-quota-01', 'w3-01'] })).toBe(false);
  });
  it('prioriterer ekte uløst legacy-intro før ny kvote og center før repetisjon', () => {
    const stars = Object.fromEntries([...twelve, ...Array.from({ length: 12 }, (_, i) => `w1-${String(i + 1).padStart(2, '0')}`)].map((id) => [id, 1]));
    expect(journeyDestination(stars)).toBe('w3-01');
    expect(journeyDestination({ ...stars, 'w3-01': 1 })).toBe('journey-quota-01');
    expect(journeyDestination({ ...stars, 'w3-01': 1, 'journey-quota-01': 1 })).toBe('journey-center-01');
    expect(journeyDestination({ ...stars, 'w3-01': 1, 'journey-quota-01': 1, 'journey-center-01': 1 })).toBe('w3-02');
    expect(journeyNextLevel({ ...stars, 'w3-01': 1 })).toBe('journey-quota-01');
  });
  it('bevarer gammel lagring og renser valgfritt merkefelt uten å koste stjerner', () => {
    const save = completed('w1-01');
    expect(parseSave(save)).toEqual(save);
    expect(parseSave({ ...save, journeyBadges: ['journey-center-01', 'evil', 'journey-center-01', 4] })?.journeyBadges).toEqual(['journey-center-01']);
    expect(parseSave({ ...save, journeyBadges: { bad: true } })?.stars).toEqual(save.stars);
    const earned = recordJourneyBadge(save, 'journey-center-01');
    expect(recordJourneyBadge(earned, 'journey-center-01')).toEqual(earned);
    expect(recordJourneyBadge(earned, 'unknown')).toEqual(earned);
  });
});

import { CampaignMode } from '../modes/campaign';
import { SaveStore } from '../saveStore';
import { tilesFromString } from '../../core/tiles';
const modeWith = (save: SaveData) => {
  let value = JSON.stringify(save);
  const store = new SaveStore({ getItem: () => value, setItem: (_key, next) => { value = next; } });
  return { store, mode: new CampaignMode(store) };
};
const centerFinal = (bonus: boolean) => {
  const tiles = tilesFromString('AABAB');
  return (bonus ? [2, 1, 0, 3, 4] : [2, 0, 1, 3, 4]).map((id) => tiles[id]!);
};

it('laster trial metadata og holder forsøk utenfor mestring', () => {
  const { mode, store } = modeWith(completed(...twelve));
  expect(mode.load('journey-quota-01')).toMatchObject({ displayTitle: 'To flytt', world: 2, target: 2 });
  expect(mode.isUnlocked('journey-quota-01')).toBe(true);
  mode.beginAttempt('journey-quota-01');
  mode.tickAttempt('journey-quota-01', 2000);
  mode.recordCommand('journey-quota-01', { type: 'swap', a: 1, b: 2 }, { movesUsed: 1, solved: false, budgetLeft: 5 });
  mode.flushAttempt('journey-quota-01');
  expect(store.data.campaign).toBeUndefined();
  expect(store.data.stars['journey-quota-01']).toBeUndefined();
});

it('gir vanlige stjerner og separat identitetsbonus som aldri slettes av replay', () => {
  const { mode, store } = modeWith(completed('journey-quota-01', 'w3-01'));
  const ordinary = mode.onSolved('journey-center-01', 2, { timeMs: 0, finalTiles: centerFinal(false) });
  expect(ordinary).toMatchObject({ stars: 3, bonusEarned: false, worldJustUnlocked: null });
  expect(store.data.journeyBadges).toBeUndefined();
  const bonus = mode.onSolved('journey-center-01', 3, { timeMs: 0, finalTiles: centerFinal(true) });
  expect(bonus.stars).toBeLessThan(3);
  expect(bonus.bonusEarned).toBe(true);
  expect(store.data.journeyBadges).toEqual(['journey-center-01']);
  mode.onSolved('journey-center-01', 2, { timeMs: 0, finalTiles: centerFinal(false) });
  expect(store.data.journeyBadges).toEqual(['journey-center-01']);
  expect(store.data.stars['journey-center-01']?.stars).toBe(3);
});

it('gir ingen trialstjerner eller merke uten tilgjengelig, faktisk sluttbrett', () => {
  const { mode, store } = modeWith(defaultSave());
  expect(mode.onSolved('journey-center-01', 3, { timeMs: 0, finalTiles: centerFinal(true) }).stars).toBe(0);
  expect(store.data.journeyBadges).toBeUndefined();
  const open = modeWith(completed('journey-quota-01', 'w3-01'));
  expect(open.mode.onSolved('journey-center-01', 3).stars).toBe(0);
  expect(open.mode.onSolved('journey-center-01', 3, { timeMs: 0, finalTiles: tilesFromString('AABAB') }).stars).toBe(0);
  expect(open.store.data.stars['journey-center-01']).toBeUndefined();
});

import { solve } from '../../core/solver';
import { applyMove } from '../../core/step';
import { makeSnapshot } from '../../core/tiles';
import { isPalindrome } from '../../core/palindrome';
import { hasCenterBonus } from '../../core/goals';

for (const trial of JOURNEY_TRIALS) {
  it(`verifiserer faktisk lovlig løsningsspor og eksakt minimum for ${trial.id}`, () => {
    let state = makeSnapshot(trial.tiles, trial.hand);
    for (const command of trial.solution) {
      expect(isPalindrome(state.tiles)).toBe(false);
      const result = applyMove(trial.rules, state, command);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.reason);
      state = result.value;
    }
    expect(isPalindrome(state.tiles)).toBe(true);
    const request = { rules: trial.rules, tiles: trial.tiles, hand: trial.hand, maxMoves: trial.budget, limits: { states: 50000 } };
    expect(solve(request)).toMatchObject({ status: 'solved', moves: trial.target });
    if (trial.bonusGoal !== undefined) {
      expect(hasCenterBonus(state.tiles, trial.bonusGoal)).toBe(false);
      expect(solve({ ...request, objective: { kind: 'centerBonus', tileId: trial.bonusGoal.tileId } })).toMatchObject({ status: 'solved', moves: trial.bonusTarget });
      state = makeSnapshot(trial.tiles, trial.hand);
      for (const command of trial.bonusSolution ?? []) {
        expect(isPalindrome(state.tiles)).toBe(false);
        const result = applyMove(trial.rules, state, command);
        if (!result.ok) throw new Error(result.reason);
        state = result.value;
      }
      expect(hasCenterBonus(state.tiles, trial.bonusGoal)).toBe(true);
    } else expect(state.tiles.find((tile) => tile.movesLeft !== undefined)?.movesLeft).toBe(0);
  });
}

import { validJourneyTrial } from '../../content/journeyTrials';
it('validerer kvoter, identiteter og avgrenset mekanikk før innhold kan lastes', () => {
  const quota = journeyTrial('journey-quota-01')!;
  const center = journeyTrial('journey-center-01')!;
  expect(JOURNEY_TRIALS.every(validJourneyTrial)).toBe(true);
  expect(validJourneyTrial({ ...quota, tiles: quota.tiles.map((tile) => ({ ...tile, movesLeft: 2 ** 54 })) })).toBe(false);
  for (const movesLeft of [-1, .5, Infinity]) expect(validJourneyTrial({ ...quota, tiles: quota.tiles.map((tile) => ({ ...tile, movesLeft })) })).toBe(false);
  expect(validJourneyTrial({ ...quota, hand: { wild: 1, remove: 0 } })).toBe(false);
  for (const flag of [{ locked: true }, { wild: true }, { sticky: true }, { bondedTo: 3 }]) {
    expect(validJourneyTrial({ ...quota, tiles: quota.tiles.map((tile) => ({ ...tile, ...flag })) })).toBe(false);
  }
  expect(validJourneyTrial({ ...center, bonusGoal: { kind: 'centerTile', tileId: 99 } })).toBe(false);
  expect(validJourneyTrial({ ...center, tiles: center.tiles.map((tile) => ({ ...tile, id: 0 })) })).toBe(false);
  expect(validJourneyTrial({ ...center, tiles: tilesFromString('ABCBD') })).toBe(false);
});

it('avviser endrede sluttflagg og ugyldig eller påført kvote uten stjerner', () => {
  const trial = journeyTrial('journey-quota-01')!;
  let state = makeSnapshot(trial.tiles, trial.hand);
  for (const command of trial.solution) {
    const next = applyMove(trial.rules, state, command);
    if (!next.ok) throw new Error(next.reason);
    state = next.value;
  }
  const badFinals = [
    trial.tiles.map((tile) => ({ ...tile, wild: true })),
    ...[{ locked: true }, { sticky: true }, { bondedTo: 3 }].map((flag) => state.tiles.map((tile) => ({ ...tile, ...flag }))),
    ...[-1, .5, 3, 2 ** 54, undefined].map((movesLeft) => state.tiles.map((tile) => tile.id === 2 ? { ...tile, movesLeft } : tile)),
    state.tiles.map((tile) => tile.id === 0 ? { ...tile, movesLeft: 0 } : tile),
  ];
  for (const finalTiles of badFinals) {
    const { mode, store } = modeWith(completed(...twelve));
    expect(mode.onSolved(trial.id, 2, { timeMs: 0, finalTiles }).stars).toBe(0);
    expect(store.data.stars[trial.id]).toBeUndefined();
  }
  expect(modeWith(completed(...twelve)).mode.onSolved(trial.id, 2, { timeMs: 0, finalTiles: state.tiles }).stars).toBe(3);
});

it('gir ingen bonus eller stjerner for bonusbrett under det eksakte bonusminimumet', () => {
  const { mode, store } = modeWith(completed('journey-quota-01', 'w3-01'));
  expect(mode.onSolved('journey-center-01', 2, { timeMs: 0, finalTiles: centerFinal(true) })).toMatchObject({ stars: 0, bonusEarned: false });
  expect(store.data.journeyBadges).toBeUndefined();
  expect(store.data.stars['journey-center-01']).toBeUndefined();
});
