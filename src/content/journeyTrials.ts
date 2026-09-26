import type { MoveCommand } from '../core/commands';
import { EMPTY_ACCESS, isWorldMastered, solvedInWorld, type CampaignAccess, type StarMap } from '../core/progression';
import { makeRules } from '../core/rules';
import type { SaveData } from '../core/storage';
import { tilesFromString } from '../core/tiles';
import type { ModeLevel } from '../game/modes/types';

export interface JourneyTrial extends ModeLevel {
  readonly displayTitle: string;
  readonly solution: readonly MoveCommand[];
  readonly bonusSolution?: readonly MoveCommand[];
}

const swap = (a: number, b: number): MoveCommand => ({ type: 'swap', a, b });
const common = { hand: { wild: 0, remove: 0 }, rules: makeRules(['swap']), targetExact: true, contentVersion: 1, showBudget: true, n: 0 } as const;
export const JOURNEY_TRIALS: readonly JourneyTrial[] = [
  { ...common, id: 'journey-quota-01', world: 2, displayTitle: 'To flytt', target: 2, budget: 6,
    tiles: tilesFromString('AABAB').map((tile) => tile.id === 2 ? { ...tile, movesLeft: 2 } : tile),
    solution: [swap(1, 2), swap(0, 1)] },
  { ...common, id: 'journey-quota-02', world: 2, displayTitle: 'Spar flyttene', target: 3, budget: 7,
    tiles: tilesFromString('ABCABC').map((tile) => tile.id === 0 ? { ...tile, movesLeft: 2 } : tile),
    solution: [swap(0, 1), swap(1, 2), swap(0, 1)] },
  { ...common, id: 'journey-center-01', world: 3, displayTitle: 'Din midtbrikke', target: 2, budget: 6,
    tiles: tilesFromString('AABAB'), bonusGoal: { kind: 'centerTile', tileId: 0 }, bonusTarget: 3,
    solution: [swap(1, 2), swap(0, 1)], bonusSolution: [swap(0, 1), swap(1, 2), swap(0, 1)] },
];

export const journeyTrial = (id: string): JourneyTrial | undefined => JOURNEY_TRIALS.find((trial) => trial.id === id);

export const isJourneyTrialUnlocked = (id: string, stars: StarMap, access: CampaignAccess = EMPTY_ACCESS): boolean => {
  switch (id) {
    case 'journey-quota-01': return (stars['w2-01'] ?? 0) > 0 && (isWorldMastered(2, stars, access) || solvedInWorld(2, stars) >= 12);
    case 'journey-quota-02': return (stars['journey-quota-01'] ?? 0) > 0;
    case 'journey-center-01': return (stars['journey-quota-01'] ?? 0) > 0 && (stars['w3-01'] ?? 0) > 0;
    default: return false;
  }
};

export const journeyTrialUnlocked = (id: string, save: SaveData): boolean => isJourneyTrialUnlocked(id,
  Object.fromEntries(Object.entries(save.stars).map(([levelId, record]) => [levelId, record.stars])), save.campaign?.access);

export const journeyTrialsForWorld = (world: number, save: SaveData): readonly JourneyTrial[] =>
  JOURNEY_TRIALS.filter((trial) => trial.world === world && journeyTrialUnlocked(trial.id, save));

export const validJourneyTrial = (trial: JourneyTrial): boolean => {
  if (trial.hand.wild !== 0 || trial.hand.remove !== 0 || trial.rules.allowedOps.size !== 1 || !trial.rules.allowedOps.has('swap') ||
    !Number.isInteger(trial.target) || trial.target < 1 || !Number.isInteger(trial.budget) || trial.budget < trial.target ||
    new Set(trial.tiles.map((tile) => tile.id)).size !== trial.tiles.length ||
    trial.tiles.some((tile) => tile.locked || tile.wild || tile.sticky === true || tile.bondedTo !== undefined ||
      (tile.movesLeft !== undefined && (!Number.isSafeInteger(tile.movesLeft) || tile.movesLeft < 0)))) return false;
  if (trial.bonusGoal === undefined) return trial.tiles.some((tile) => tile.movesLeft !== undefined);
  const marked = trial.tiles.find((tile) => tile.id === trial.bonusGoal?.tileId);
  return trial.tiles.length % 2 === 1 && marked !== undefined && trial.tiles.filter((tile) => tile.symbol === marked.symbol).length >= 3 &&
    trial.bonusTarget !== undefined && Number.isInteger(trial.bonusTarget) && trial.bonusTarget >= trial.target && trial.bonusTarget <= trial.budget;
};

for (const trial of JOURNEY_TRIALS) if (!validJourneyTrial(trial)) throw new Error(`Ugyldig reiseprøve: ${trial.id}`);
