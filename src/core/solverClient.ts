import type { SolveRequest, SolveResult } from './solver';
import type { WorkerLike, WorkerOut } from './solverProtocol';
import { toRequestJson } from './solverProtocol';

/** Én utestående forespørsel om gangen. Ny forespørsel avbryter forrige. */
export class SolverClient {
  private counter = 0;
  private pending: { requestId: string; resolve: (r: SolveResult) => void } | null = null;

  constructor(private readonly worker: WorkerLike) {
    worker.onmessage = (ev: { data: WorkerOut }): void => {
      if (this.pending === null || this.pending.requestId !== ev.data.requestId) return;
      const { resolve } = this.pending;
      this.pending = null;
      resolve(ev.data.result);
    };
  }

  solve(req: SolveRequest): Promise<SolveResult> {
    this.cancelAll();
    const requestId = `req-${++this.counter}`;
    return new Promise<SolveResult>((resolve) => {
      this.pending = { requestId, resolve };
      this.worker.postMessage({ kind: 'solve', requestId, req: toRequestJson(req) });
    });
  }

  cancelAll(): void {
    if (this.pending === null) return;
    const { requestId, resolve } = this.pending;
    this.pending = null;
    this.worker.postMessage({ kind: 'cancel', requestId });
    resolve({ status: 'unknown' });
  }
}
