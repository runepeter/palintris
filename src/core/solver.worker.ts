import type { WorkerIn, WorkerOut } from './solverProtocol';
import { createSolverHandler } from './solverProtocol';

const handle = createSolverHandler(
  (msg: WorkerOut) => self.postMessage(msg),
  (fn) => setTimeout(fn, 0)
);

self.onmessage = (ev: MessageEvent<WorkerIn>): void => handle(ev.data);
