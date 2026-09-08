import { WORLD_RECIPES } from '../content/recipes';
import type { Level, Recipe } from '../core/level';
import { makeLevel } from '../core/level';
import type { Rng } from '../core/rng';
import { createRng, pick } from '../core/rng';

export const BLITZ = {
  startMs: 45000,
  capMs: 60000,
  baseBonusMs: 6000,
  minBonusMs: 3000,
  decayEvery: 5,
  targetBonusMs: 3000,
  skipCostMs: 5000,
} as const;

/** Ett trinn ned i grunnbonus for hver `decayEvery` løste brett. */
const DECAY_STEP_MS = 1000;

export const blitzBonusMs = (solvedBefore: number, atTarget: boolean): number => {
  const steps = Math.floor(Math.max(0, solvedBefore) / BLITZ.decayEvery);
  const base = Math.max(BLITZ.minBonusMs, BLITZ.baseBonusMs - steps * DECAY_STEP_MS);
  return base + (atTarget ? BLITZ.targetBonusMs : 0);
};

/**
 * Tidsagnostisk: scenen mater inn dt, så klokken kan testes uten fake timers
 * og pauses uten at et tapt requestAnimationFrame-kall gir hopp.
 */
export class BlitzClock {
  private remaining: number = BLITZ.startMs;
  private active = false;

  get remainingMs(): number {
    return this.remaining;
  }

  get running(): boolean {
    return this.active;
  }

  get over(): boolean {
    return this.remaining <= 0;
  }

  start(): void {
    this.remaining = BLITZ.startMs;
    this.active = true;
  }

  pause(): void {
    this.active = false;
  }

  resume(): void {
    if (!this.over) this.active = true;
  }

  tick(dtMs: number): void {
    if (!this.active) return;
    this.remaining = Math.max(0, this.remaining - dtMs);
    if (this.over) this.active = false;
  }

  onSolved(solvedBefore: number, atTarget: boolean): void {
    this.remaining = Math.min(BLITZ.capMs, this.remaining + blitzBonusMs(solvedBefore, atTarget));
  }

  skip(): void {
    this.remaining = Math.max(0, this.remaining - BLITZ.skipCostMs);
    if (this.over) this.active = false;
  }
}

/** Korte brett fra de tre første verdenene, med løsertak som tåler å kjøre i nettleseren. */
export const BLITZ_RECIPES: readonly Recipe[] = WORLD_RECIPES.slice(0, 3).map((r) => ({
  ...r,
  lengthRange: [4, 7] as const,
  solverStates: 50000,
}));

const BLITZ_ATTEMPTS = 40;
/** Generatoren kan bomme; uten tak ville en umulig oppskrift låst tråden. */
const MAX_GENERATIONS = 200;

/** Holder to ferdige brett så neste alltid er klart når tiden er knapp. */
export class BlitzQueue {
  private readonly rng: Rng;
  private readonly ready: Level[] = [];
  private issued = 0;

  constructor(seed: number, private readonly contentVersion: number) {
    this.rng = createRng(seed);
    this.fill();
  }

  peek(): Level {
    this.fill();
    const first = this.ready[0];
    if (first === undefined) throw new Error('BlitzQueue: fikk ikke laget brett');
    return first;
  }

  next(): Level {
    const level = this.peek();
    this.ready.shift();
    this.fill();
    return level;
  }

  private fill(): void {
    let guard = 0;
    while (this.ready.length < 2 && guard < MAX_GENERATIONS) {
      guard++;
      const level = makeLevel(pick(this.rng, BLITZ_RECIPES), {
        id: `blitz-${this.issued}`,
        contentVersion: this.contentVersion,
        requireExact: false,
        attempts: BLITZ_ATTEMPTS,
      });
      this.issued++;
      if (level !== null) this.ready.push(level);
    }
  }
}
