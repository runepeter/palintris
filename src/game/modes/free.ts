import { rampedRecipe, WORLD_RECIPES } from '../../content/recipes';
import { makeLevel, rulesFor } from '../../core/level';
import { WORLD_COUNT } from '../../core/progression';
import type { Rng } from '../../core/rng';
import { randInt } from '../../core/rng';
import { starsFor } from '../../core/scoring';
import { CLIENT_SOLVER_STATES } from '../session';
import type { BoardMode, ModeLevel, SolvedOutcome } from './types';

/**
 * Fri lek sikter mot midten av vanskelighetskurven, men faller ned trinnet når
 * generatoren ikke finner noe der. På nivå 8 kollapser movesRange til én verdi i
 * flere verdener, og et eksakt minimum på så korte brett er for sjeldent til at
 * en runtime-generator treffer det.
 */
const FREE_RAMPS = [8, 4, 1] as const;
const FREE_ID = /^free-w(\d+)-(\d+)$/;
/** Generatoren kan bomme på en oppskrift; noen forsøk per trinn holder i praksis. */
const TRIES_PER_RAMP = 4;

export const freeLevelId = (world: number, n: number): string => `free-w${world}-${n}`;

export const parseFreeLevelId = (id: string): { world: number; n: number } | null => {
  const m = FREE_ID.exec(id);
  if (m === null) return null;
  const world = Number(m[1]);
  const n = Number(m[2]);
  if (world < 1 || world > WORLD_COUNT || n < 1) return null;
  return { world, n };
};

/**
 * Endeløs lek uten lagring: hver lasting gir et nytt brett fra verdenens oppskrift,
 * så id-en er en vanskelighetsadresse og ikke et bestemt brett.
 */
export class FreeMode implements BoardMode {
  readonly kind = 'free' as const;

  private readonly loaded = new Map<string, ModeLevel>();

  constructor(
    private readonly contentVersion: number,
    private readonly rng: Rng
  ) {}

  load(levelId: string): ModeLevel | null {
    const parsed = parseFreeLevelId(levelId);
    if (parsed === null) return null;
    const base = WORLD_RECIPES[parsed.world - 1];
    if (base === undefined) return null;

    for (const ramp of FREE_RAMPS) {
      // Kampanjens tak er bygget offline; her går genereringen i spilltråden.
      const recipe = { ...rampedRecipe(base, ramp), solverStates: CLIENT_SOLVER_STATES };
      for (let i = 0; i < TRIES_PER_RAMP; i++) {
        const level = makeLevel(recipe, {
          id: `${levelId}#${randInt(this.rng, 0, 0xffffff)}`,
          contentVersion: this.contentVersion,
          requireExact: false,
        });
        if (level === null) continue;
        const mode: ModeLevel = {
          id: levelId,
          world: parsed.world,
          n: parsed.n,
          tiles: level.tiles,
          hand: level.hand,
          rules: rulesFor(level),
          target: level.target,
          targetExact: level.targetExact,
          budget: level.budget,
          contentVersion: this.contentVersion,
          timed: false,
          showBudget: true,
        };
        this.loaded.set(levelId, mode);
        return mode;
      }
    }
    return null;
  }

  /** Fri lek har ingen progresjon; alt er åpent. */
  isUnlocked(): boolean {
    return true;
  }

  onSolved(levelId: string, movesUsed: number): SolvedOutcome {
    const parsed = parseFreeLevelId(levelId);
    const level = this.loaded.get(levelId);
    const next = parsed === null ? null : freeLevelId(parsed.world, parsed.n + 1);
    return {
      stars: level === undefined ? 0 : starsFor(movesUsed, level.target, level.budget),
      previousStars: 0,
      nextLevelId: next,
      nextUnlocked: next !== null,
      worldJustUnlocked: null,
    };
  }
}
