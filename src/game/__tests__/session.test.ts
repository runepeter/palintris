import { describe, expect, it } from 'vitest';
import { makeRules, ALL_OPS } from '../../core/rules';
import type { SolveRequest, SolveResult } from '../../core/solver';
import { tilesFromString, symbolKey } from '../../core/tiles';
import type { SessionView, SolverPort } from '../session';
import { BoardSession, CLIENT_SOLVER_STATES } from '../session';

/** Løser som besvares manuelt, i rekkefølge. */
const fakeSolver = (): SolverPort & { requests: SolveRequest[]; answer: (i: number, r: SolveResult) => void; cancelled: number } => {
  const resolvers: Array<(r: SolveResult) => void> = [];
  const port = {
    requests: [] as SolveRequest[],
    cancelled: 0,
    solve(req: SolveRequest): Promise<SolveResult> {
      port.requests.push(req);
      return new Promise<SolveResult>((resolve) => {
        resolvers.push(resolve);
      });
    },
    cancelAll(): void {
      port.cancelled++;
    },
    answer(i: number, r: SolveResult): void {
      resolvers[i]?.(r);
    },
  };
  return port;
};

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

const session = (s: string, opts: Partial<{ target: number; budget: number; hand: { wild: number; remove: number } }> = {}) => {
  const solver = fakeSolver();
  const views: SessionView[] = [];
  const sess = new BoardSession({
    rules: makeRules(ALL_OPS),
    tiles: tilesFromString(s),
    hand: opts.hand ?? { wild: 0, remove: 0 },
    target: opts.target ?? 1,
    budget: opts.budget ?? 5,
    solver,
    onChange: (v) => views.push(v),
  });
  return { sess, solver, views };
};

describe('BoardSession', () => {
  it('starter med løserforespørsel med maxMoves = budsjett og 50 000 tilstander, uten å emitte', () => {
    const { sess, solver, views } = session('AAB', { budget: 5 });
    expect(views).toHaveLength(0);
    expect(sess.view().solveStatus).toEqual({ kind: 'pending' });
    expect(solver.requests).toHaveLength(1);
    expect(solver.requests[0]?.maxMoves).toBe(5);
    expect(solver.requests[0]?.limits).toEqual({ states: CLIENT_SOLVER_STATES });
  });

  it('godtatt trekk oppdaterer view og sender ny forespørsel', async () => {
    const { sess, solver, views } = session('ABCD');
    const r = sess.dispatch({ type: 'swap', a: 0, b: 1 });
    expect(r.ok).toBe(true);
    expect(symbolKey(sess.view().tiles)).toBe('BACD');
    expect(sess.view().movesUsed).toBe(1);
    expect(sess.view().budgetLeft).toBe(4);
    expect(sess.view().canUndo).toBe(true);
    expect(views.at(-1)?.solveStatus).toEqual({ kind: 'pending' });
    expect(solver.requests).toHaveLength(2);
    expect(solver.requests[1]?.maxMoves).toBe(4);
    solver.answer(1, { status: 'solved', moves: 2 });
    await flush();
    expect(sess.view().solveStatus).toEqual({ kind: 'known', moves: 2 });
  });

  it('avvist trekk endrer ingenting og sender ingen forespørsel', () => {
    const { sess, solver, views } = session('ABCD');
    const before = views.length;
    const r = sess.dispatch({ type: 'swap', a: 0, b: 2 });
    expect(r.ok).toBe(false);
    expect(views).toHaveLength(before);
    expect(solver.requests).toHaveLength(1);
  });

  it('løsning gir solved, stjerner og avbryter løser', () => {
    const { sess, solver } = session('AAB', { target: 1, budget: 5 });
    sess.dispatch({ type: 'swap', a: 1, b: 2 });
    const v = sess.view();
    expect(v.solved).toBe(true);
    expect(v.stars).toBe(3);
    expect(v.solveStatus).toEqual({ kind: 'idle' });
    expect(solver.cancelled).toBeGreaterThanOrEqual(1);
    expect(solver.requests).toHaveLength(1);
  });

  it('stjerner følger mål og budsjett', () => {
    const { sess } = session('AAB', { target: 1, budget: 6 });
    sess.dispatch({ type: 'swap', a: 0, b: 1 });
    sess.dispatch({ type: 'swap', a: 0, b: 1 });
    sess.dispatch({ type: 'swap', a: 1, b: 2 });
    expect(sess.view().movesUsed).toBe(3);
    expect(sess.view().stars).toBe(2);
  });

  it('tomt budsjett uten løsning gir deadEnd uten løser', () => {
    const { sess, solver } = session('ABCD', { budget: 1 });
    sess.dispatch({ type: 'swap', a: 0, b: 1 });
    expect(sess.view().budgetLeft).toBe(0);
    expect(sess.view().solveStatus).toEqual({ kind: 'deadEnd' });
    expect(solver.requests).toHaveLength(1);
  });

  it('løser-svar mappes: unreachable → deadEnd, unknown → unknown, cancelled ignoreres', async () => {
    const { sess, solver } = session('ABCD');
    solver.answer(0, { status: 'unreachableWithinBudget' });
    await flush();
    expect(sess.view().solveStatus).toEqual({ kind: 'deadEnd' });
    sess.dispatch({ type: 'swap', a: 0, b: 1 });
    solver.answer(1, { status: 'unknown' });
    await flush();
    expect(sess.view().solveStatus).toEqual({ kind: 'unknown' });
    sess.dispatch({ type: 'swap', a: 0, b: 1 });
    solver.answer(2, { status: 'cancelled' });
    await flush();
    expect(sess.view().solveStatus).toEqual({ kind: 'pending' });
  });

  it('utdatert løser-svar ignoreres', async () => {
    const { sess, solver } = session('ABCD');
    sess.dispatch({ type: 'swap', a: 0, b: 1 });
    solver.answer(0, { status: 'solved', moves: 1 });
    await flush();
    expect(sess.view().solveStatus).toEqual({ kind: 'pending' });
    solver.answer(1, { status: 'solved', moves: 3 });
    await flush();
    expect(sess.view().solveStatus).toEqual({ kind: 'known', moves: 3 });
  });

  it('undo og reset går gjennom dispatch og oppdaterer view', () => {
    const { sess } = session('ABCD');
    sess.dispatch({ type: 'swap', a: 0, b: 1 });
    expect(sess.dispatch({ type: 'undo' }).ok).toBe(true);
    expect(symbolKey(sess.view().tiles)).toBe('ABCD');
    expect(sess.view().canUndo).toBe(false);
    sess.dispatch({ type: 'swap', a: 2, b: 3 });
    sess.dispatch({ type: 'reset' });
    expect(symbolKey(sess.view().tiles)).toBe('ABCD');
    expect(sess.view().movesUsed).toBe(0);
  });

  it('dispatch etter dispose avvises uten ny løserforespørsel', () => {
    const { sess, solver } = session('ABCD');
    sess.dispose();
    const r = sess.dispatch({ type: 'swap', a: 0, b: 1 });
    expect(r).toEqual({ ok: false, reason: 'disposed' });
    expect(symbolKey(sess.view().tiles)).toBe('ABCD');
    expect(solver.requests).toHaveLength(1);
  });

  it('løser som feiler gir unknown uten ubehandlet rejection', async () => {
    const views: SessionView[] = [];
    const sess = new BoardSession({
      rules: makeRules(ALL_OPS),
      tiles: tilesFromString('ABCD'),
      hand: { wild: 0, remove: 0 },
      target: 1,
      budget: 5,
      solver: { solve: () => Promise.reject(new Error('worker')), cancelAll: () => {} },
      onChange: (v) => views.push(v),
    });
    await flush();
    expect(sess.view().solveStatus).toEqual({ kind: 'unknown' });
    expect(views.at(-1)?.solveStatus).toEqual({ kind: 'unknown' });
  });

  it('dispose avbryter løser og stopper onChange', async () => {
    const { sess, solver, views } = session('ABCD');
    sess.dispose();
    const n = views.length;
    solver.answer(0, { status: 'solved', moves: 1 });
    await flush();
    expect(views).toHaveLength(n);
  });
});
