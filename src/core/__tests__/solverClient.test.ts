import { describe, expect, it } from 'vitest';
import { makeRules, ALL_OPS } from '../rules';
import { SolverClient } from '../solverClient';
import type { WorkerIn, WorkerLike, WorkerOut } from '../solverProtocol';
import { createSolverHandler } from '../solverProtocol';
import { tilesFromString } from '../tiles';

/** Fake worker som kjører handleren synkront i samme tråd. */
const fakeWorker = (): WorkerLike & { sent: WorkerIn[] } => {
  const w: WorkerLike & { sent: WorkerIn[] } = {
    sent: [],
    onmessage: null,
    postMessage(msg: WorkerIn): void {
      w.sent.push(msg);
      handle(msg);
    },
  };
  const handle = createSolverHandler(
    (out: WorkerOut) => w.onmessage?.({ data: out }),
    (fn) => queueMicrotask(fn)
  );
  return w;
};

const req = (s: string) => ({ rules: makeRules(ALL_OPS), tiles: tilesFromString(s), hand: { wild: 0, remove: 0 }, maxMoves: 5, limits: { states: 20000 } });

describe('SolverClient', () => {
  it('løser via worker', async () => {
    const client = new SolverClient(fakeWorker());
    await expect(client.solve(req('AAB'))).resolves.toEqual({ status: 'solved', moves: 1 });
  });

  it('ny forespørsel avbryter forrige og forrige løfte får unknown', async () => {
    const w = fakeWorker();
    const client = new SolverClient(w);
    const first = client.solve(req('ABCDEFGHIJ'));
    const second = client.solve(req('AAB'));
    await expect(first).resolves.toEqual({ status: 'cancelled' });
    await expect(second).resolves.toEqual({ status: 'solved', moves: 1 });
    expect(w.sent.some((m) => m.kind === 'cancel')).toBe(true);
  });
});
