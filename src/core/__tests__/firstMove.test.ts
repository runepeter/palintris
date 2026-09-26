import { describe, expect, it } from 'vitest';
import { makeRules } from '../rules';
import type { OpName } from '../rules';
import { solve } from '../solver';
import type { SolveRequest } from '../solver';
import { createSolverHandler, fromRequestJson, toRequestJson } from '../solverProtocol';
import type { SolveRequestJson, WorkerOut } from '../solverProtocol';
import { applyMove } from '../step';
import { makeSnapshot, tilesFromString } from '../tiles';

const req = (symbols: string, ops: readonly OpName[], hand = { wild: 0, remove: 0 }): SolveRequest => ({
  rules: makeRules(ops), tiles: tilesFromString(symbols), hand, maxMoves: 6, limits: { states: 50000 },
});
const provesFirstMove = (request: SolveRequest) => {
  const plain = solve(request);
  const result = solve({ ...request, includeFirstMove: true });
  expect(result.status).toBe('solved');
  if (result.status !== 'solved') throw new Error(result.status);
  expect(plain).toEqual({ status: 'solved', moves: result.moves });
  expect(result.firstMove).toBeDefined();
  if (result.firstMove === undefined) throw new Error('missing first move');
  const next = applyMove(request.rules, makeSnapshot(request.tiles, request.hand), result.firstMove);
  expect(next.ok).toBe(true);
  if (!next.ok) throw new Error(next.reason);
  expect(solve({ ...request, tiles: next.value.tiles, hand: next.value.hand, maxMoves: result.moves - 1 }))
    .toEqual({ status: 'solved', moves: result.moves - 1 });
  return result.firstMove;
};

describe('løserens første trekk', () => {
  it.each([
    ['AABB', 'swap'], ['DOCRECORD', 'rotate'], ['CBACBA', 'mirror'],
    ['ABB', 'insertWild'], ['AABA', 'remove'],
  ] as const)('gir bevisbart %s-førstetrekk med %s', (symbols, op) => {
    const move = provesFirstMove(req(symbols, [op], { wild: 1, remove: 1 }));
    expect(move.type).toBe(op);
  });

  it('bevarer kvote og bonusidentitet på hele løsningen', () => {
    const quota = req('AABAB', ['swap']);
    provesFirstMove({ ...quota, tiles: quota.tiles.map((t) => t.id === 2 ? { ...t, movesLeft: 2 } : t) });
    expect(provesFirstMove({ ...quota, objective: { kind: 'centerBonus', tileId: 0 } }))
      .toEqual({ type: 'swap', a: 0, b: 1 });
  });

  it('gir ingen kommando for ferdig, ukjent eller umulig tilstand', () => {
    expect(solve({ ...req('ABA', ['swap']), includeFirstMove: true })).toEqual({ status: 'solved', moves: 0 });
    expect(solve({ ...req('ABCD', ['swap']), includeFirstMove: true })).toEqual({ status: 'unreachableWithinBudget' });
    expect(solve({ ...req('ABCDE', ['swap']), includeFirstMove: true, limits: { states: 1 } })).toEqual({ status: 'unknown' });
  });

  it('videresender opt-in og resultat gjennom workerens JSON-grense', () => {
    const request = { ...req('AABB', ['swap']), includeFirstMove: true };
    const json = JSON.parse(JSON.stringify(toRequestJson(request))) as SolveRequestJson;
    expect(fromRequestJson(json)).toEqual(request);
    const out: WorkerOut[] = [];
    const pending: Array<() => void> = [];
    const handle = createSolverHandler((value) => out.push(value), (fn) => pending.push(fn));
    handle({ kind: 'solve', requestId: 'hint', req: json });
    while (pending.length > 0) pending.shift()!();
    expect(JSON.parse(JSON.stringify(out))).toEqual([{ requestId: 'hint', result: solve(request) }]);
    expect(out[0]?.result).toHaveProperty('firstMove');
    expect(toRequestJson(req('AABB', ['swap']))).not.toHaveProperty('includeFirstMove');
  });

  it('publiserer ingen førstetrekk når workerforespørselen avbrytes', () => {
    const out: WorkerOut[] = [];
    const pending: Array<() => void> = [];
    const handle = createSolverHandler((value) => out.push(value), (fn) => pending.push(fn));
    handle({ kind: 'solve', requestId: 'cancelled-hint',
      req: toRequestJson({ ...req('AABB', ['swap']), includeFirstMove: true }) });
    handle({ kind: 'cancel', requestId: 'cancelled-hint' });
    while (pending.length > 0) pending.shift()!();
    expect(out).toEqual([]);
  });
});
