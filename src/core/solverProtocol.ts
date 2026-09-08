import type { OpName } from './rules';
import type { SolveRequest, SolveResult } from './solver';
import { BfsSearch } from './solver';
import type { Hand, Tile } from './tiles';

export interface SolveRequestJson {
  readonly rules: { readonly allowedOps: readonly OpName[]; readonly minLength: number; readonly maxLength: number };
  readonly tiles: readonly Tile[];
  readonly hand: Hand;
  readonly maxMoves: number;
  readonly limits: { readonly states: number; readonly ms?: number };
}

export type WorkerIn =
  | { readonly kind: 'solve'; readonly requestId: string; readonly req: SolveRequestJson }
  | { readonly kind: 'cancel'; readonly requestId: string };

export interface WorkerOut {
  readonly requestId: string;
  readonly result: SolveResult;
}

export interface WorkerLike {
  postMessage(msg: WorkerIn): void;
  onmessage: ((ev: { data: WorkerOut }) => void) | null;
}

export const toRequestJson = (req: SolveRequest): SolveRequestJson => ({
  rules: { allowedOps: [...req.rules.allowedOps], minLength: req.rules.minLength, maxLength: req.rules.maxLength },
  tiles: req.tiles,
  hand: req.hand,
  maxMoves: req.maxMoves,
  limits: req.limits,
});

export const fromRequestJson = (j: SolveRequestJson): SolveRequest => ({
  rules: { allowedOps: new Set(j.rules.allowedOps), minLength: j.rules.minLength, maxLength: j.rules.maxLength },
  tiles: j.tiles,
  hand: j.hand,
  maxMoves: j.maxMoves,
  limits: j.limits,
});

const CHUNK_STATES = 2000;

/**
 * Lager meldingshåndterer for worker. `schedule` brukes til å yielde mellom biter,
 * slik at cancel-meldinger kan behandles midt i et søk.
 */
export const createSolverHandler = (
  post: (msg: WorkerOut) => void,
  schedule: (fn: () => void) => void
): ((msg: WorkerIn) => void) => {
  const active = new Map<string, BfsSearch>();

  const run = (requestId: string): void => {
    const search = active.get(requestId);
    if (search === undefined) return;
    const result = search.step(CHUNK_STATES);
    if (result === null) {
      schedule(() => run(requestId));
      return;
    }
    active.delete(requestId);
    post({ requestId, result });
  };

  return (msg: WorkerIn): void => {
    if (msg.kind === 'cancel') {
      active.delete(msg.requestId);
      return;
    }
    active.set(msg.requestId, new BfsSearch(fromRequestJson(msg.req)));
    schedule(() => run(msg.requestId));
  };
};
