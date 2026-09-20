import type Phaser from 'phaser';
import { CONTENT_VERSION } from '../content/recipes';
import { createRng, hashString } from '../core/rng';
import { SolverClient } from '../core/solverClient';
import type { WorkerLike, WorkerOut } from '../core/solverProtocol';
import type { Settings } from '../core/storage';
import { BlitzQueue } from '../game/blitz';
import { BlitzMode } from '../game/modes/blitz';
import { CampaignMode } from '../game/modes/campaign';
import { DailyMode } from '../game/modes/daily';
import { FreeMode } from '../game/modes/free';
import { StickyMode } from '../game/modes/sticky';
import { SaveStore } from '../game/saveStore';
import type { SolverPort } from '../game/session';

/** Nøklene er modusenes kind, så en scene kan slå opp modusen sin direkte. */
export interface Modes {
  readonly campaign: CampaignMode;
  readonly daily: DailyMode;
  /** Byttes ut ved hver ny blitz-omgang; se restartBlitz. */
  blitz: BlitzMode;
  readonly free: FreeMode;
  readonly sticky: StickyMode;
}

export interface Services {
  readonly store: SaveStore;
  readonly modes: Modes;
  readonly solver: SolverPort;
  readonly settings: () => Settings;
  /** Blitz teller løste brett per omgang, så en ny omgang trenger fersk modus og kø. */
  restartBlitz: () => void;
}

const REGISTRY_KEY = 'services';

/** DOM Worker er ikke direkte tilordnbar til WorkerLike under strictFunctionTypes. */
export const createSolverPort = (worker: Worker): SolverPort => {
  const like: WorkerLike = {
    postMessage: (msg) => worker.postMessage(msg),
    onmessage: null,
  };
  worker.onmessage = (ev: MessageEvent<WorkerOut>): void => {
    like.onmessage?.({ data: ev.data });
  };
  return new SolverClient(like);
};

const newBlitz = (store: SaveStore): BlitzMode =>
  new BlitzMode(store, new BlitzQueue(hashString(String(Date.now())), CONTENT_VERSION));

export const createServices = (): Services => {
  const store = new SaveStore(window.localStorage);
  const worker = new Worker(new URL('../core/solver.worker.ts', import.meta.url), { type: 'module' });
  const modes: Modes = {
    campaign: new CampaignMode(store),
    daily: new DailyMode(store, CONTENT_VERSION, () => new Date()),
    blitz: newBlitz(store),
    free: new FreeMode(CONTENT_VERSION, createRng(Date.now() >>> 0)),
    sticky: new StickyMode(),
  };
  return {
    store,
    modes,
    solver: createSolverPort(worker),
    settings: () => store.data.settings,
    restartBlitz: (): void => {
      modes.blitz = newBlitz(store);
    },
  };
};

export const installServices = (game: Phaser.Game, s: Services): void => {
  game.registry.set(REGISTRY_KEY, s);
};

export const services = (scene: Phaser.Scene): Services => scene.registry.get(REGISTRY_KEY) as Services;
