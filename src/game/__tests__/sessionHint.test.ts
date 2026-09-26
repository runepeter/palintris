import { describe, expect, it } from 'vitest';
import { makeRules } from '../../core/rules';
import { solve } from '../../core/solver';
import type { SolveRequest, SolveResult } from '../../core/solver';
import { tilesFromString } from '../../core/tiles';
import { BoardSession } from '../session';
import type { SessionHint, SolverPort } from '../session';

const pendingSolver = () => {
  const requests: SolveRequest[] = [];
  const resolve: Array<(result: SolveResult) => void> = [];
  const port: SolverPort = {
    solve: (request) => { requests.push(request); return new Promise((done) => resolve.push(done)); },
    cancelAll: () => {},
  };
  return { port, requests, answer: (index: number, result = solve(requests[index]!)) => resolve[index]!(result) };
};
const start = (includeFirstMove = true) => {
  const solver = pendingSolver();
  const session = new BoardSession({ rules: makeRules(['swap']), tiles: tilesFromString('AABB'),
    hand: { wild: 0, remove: 0 }, target: 2, budget: 6, solver: solver.port, includeFirstMove, onChange: () => {} });
  return { session, solver };
};
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
const hint = (session: BoardSession): SessionHint => {
  const quote = session.currentHint();
  expect(quote).not.toBeNull();
  if (quote === null) throw new Error('missing quote');
  return quote;
};

describe('sesjonsbundet hint', () => {
  it('gjenbruker én statusrequest og lar hintlesing beholde hele brettet', async () => {
    const { session, solver } = start();
    expect(solver.requests).toHaveLength(1);
    expect(solver.requests[0]?.includeFirstMove).toBe(true);
    expect(session.currentHint()).toBeNull();
    solver.answer(0); await flush();
    const before = session.state;
    const snapshot = structuredClone(before);
    const quote = hint(session);
    expect(session.currentHint()).toBe(quote);
    expect(Object.isFrozen(quote)).toBe(true);
    expect(Object.isFrozen(quote.move)).toBe(true);
    expect(session.isCurrentHint(quote)).toBe(true);
    expect(session.state).toBe(before);
    expect(session.state).toEqual(snapshot);
    expect(solver.requests).toHaveLength(1);
    expect(session.view().solveStatus).toMatchObject({ kind: 'known', moves: 2 });
  });

  it('avviser kopiert quote og quote fra en annen sesjon', async () => {
    const a = start(); const b = start();
    a.solver.answer(0); b.solver.answer(0); await flush();
    const quote = hint(a.session);
    expect(a.session.isCurrentHint({ move: quote.move })).toBe(false);
    expect(b.session.isCurrentHint(quote)).toBe(false);
    expect(b.session.isCurrentHint(hint(b.session))).toBe(true);
  });

  it.each(['swap', 'undo', 'reset'] as const)('akseptert %s ugyldiggjør straks også fortsatt lovlige gamle trekk', async (type) => {
    const { session, solver } = start();
    if (type !== 'swap') session.dispatch({ type: 'swap', a: 0, b: 1 });
    const latest = solver.requests.length - 1;
    solver.answer(latest); await flush();
    const quote = hint(session);
    const result = session.dispatch(type === 'swap' ? { type, a: 0, b: 1 } : { type });
    expect(result.ok).toBe(true);
    expect(session.currentHint()).toBeNull();
    expect(session.isCurrentHint(quote)).toBe(false);
    solver.answer(solver.requests.length - 1); await flush();
    expect(session.isCurrentHint(quote)).toBe(false);
    expect(hint(session)).not.toBe(quote);
  });

  it('avvist trekk beholder quote; seier og dispose ugyldiggjør', async () => {
    const { session, solver } = start();
    solver.answer(0); await flush();
    const quote = hint(session);
    expect(session.dispatch({ type: 'swap', a: 0, b: 3 }).ok).toBe(false);
    expect(session.currentHint()).toBe(quote);
    session.dispatch(quote.move);
    solver.answer(1); await flush();
    const final = hint(session);
    session.dispatch(final.move);
    expect(session.view().solved).toBe(true);
    expect(session.isCurrentHint(final)).toBe(false);
    expect(session.currentHint()).toBeNull();
    const other = start(); other.solver.answer(0); await flush();
    const disposed = hint(other.session); other.session.dispose();
    expect(other.session.currentHint()).toBeNull();
    expect(other.session.isCurrentHint(disposed)).toBe(false);
  });

  it('gammel quote kommer ikke tilbake når neste svar mangler førstetrekk', async () => {
    const { session, solver } = start();
    solver.answer(0); await flush();
    const quote = hint(session);
    session.dispatch({ type: 'swap', a: 1, b: 2 });
    solver.answer(1, { status: 'solved', moves: 1 }); await flush();
    expect(session.currentHint()).toBeNull();
    expect(session.isCurrentHint(quote)).toBe(false);
  });

  it('reset på urørt brett beholder quote og løserstatus uten ny request', async () => {
    const changes: number[] = [];
    const solver = pendingSolver();
    const session = new BoardSession({ rules: makeRules(['swap']), tiles: tilesFromString('AABB'),
      hand: { wild: 0, remove: 0 }, target: 2, budget: 6, solver: solver.port, includeFirstMove: true, onChange: (v) => changes.push(v.movesUsed) });
    solver.answer(0); await flush();
    const quote = hint(session);
    const before = changes.length;
    expect(session.dispatch({ type: 'reset' }).ok).toBe(true);
    expect(changes.length).toBe(before + 1);
    expect(solver.requests).toHaveLength(1);
    expect(session.currentHint()).toBe(quote);
    expect(session.view().solveStatus).toMatchObject({ kind: 'known', moves: 2 });
  });

  it('sen respons etter reset, nytt trekk eller dispose blir aldri en quote', async () => {
    for (const action of ['reset', 'swap', 'dispose'] as const) {
      const { session, solver } = start();
      if (action === 'dispose') session.dispose();
      else if (action === 'swap') session.dispatch({ type: 'swap', a: 0, b: 1 });
      else { session.dispatch({ type: 'swap', a: 0, b: 1 }); session.dispatch({ type: 'reset' }); }
      solver.answer(0); await flush();
      expect(session.currentHint()).toBeNull();
    }
  });

  it('ingen quote uten opt-in eller verifisert lovlig førstetrekk innen budsjett', async () => {
    const disabled = start(false); disabled.solver.answer(0); await flush();
    expect(disabled.session.currentHint()).toBeNull();
    for (const result of [
      { status: 'unknown' }, { status: 'cancelled' }, { status: 'unreachableWithinBudget' },
      { status: 'solved', moves: 0, firstMove: { type: 'swap', a: 1, b: 2 } },
      { status: 'solved', moves: 7, firstMove: { type: 'swap', a: 1, b: 2 } },
      { status: 'solved', moves: 2 },
      { status: 'solved', moves: 2, firstMove: { type: 'swap', a: 0, b: 3 } },
    ] as const) {
      const { session, solver } = start(); solver.answer(0, result); await flush();
      expect(session.currentHint()).toBeNull();
    }
  });
});
