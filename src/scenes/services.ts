import type Phaser from 'phaser';
import { SolverClient } from '../core/solverClient';
import type { WorkerLike, WorkerOut } from '../core/solverProtocol';
import type { Settings } from '../core/storage';
import { CampaignMode } from '../game/modes/campaign';
import { SaveStore } from '../game/saveStore';
import type { SolverPort } from '../game/session';

export interface Services {
  readonly store: SaveStore;
  readonly mode: CampaignMode;
  readonly solver: SolverPort;
  readonly settings: () => Settings;
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

export const createServices = (): Services => {
  const store = new SaveStore(window.localStorage);
  const worker = new Worker(new URL('../core/solver.worker.ts', import.meta.url), { type: 'module' });
  return {
    store,
    mode: new CampaignMode(store),
    solver: createSolverPort(worker),
    settings: () => store.data.settings,
  };
};

export const installServices = (game: Phaser.Game, s: Services): void => {
  game.registry.set(REGISTRY_KEY, s);
};

export const services = (scene: Phaser.Scene): Services => scene.registry.get(REGISTRY_KEY) as Services;
