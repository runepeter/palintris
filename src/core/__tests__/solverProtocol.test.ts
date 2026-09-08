import { describe, expect, it } from 'vitest';
import { makeRules, ALL_OPS } from '../rules';
import type { WorkerOut } from '../solverProtocol';
import { createSolverHandler, fromRequestJson, toRequestJson } from '../solverProtocol';
import { tilesFromString } from '../tiles';

const reqJson = (s: string) =>
  toRequestJson({ rules: makeRules(ALL_OPS), tiles: tilesFromString(s), hand: { wild: 0, remove: 0 }, maxMoves: 5, limits: { states: 20000 } });

describe('request json', () => {
  it('rundtur beholder regler', () => {
    const j = reqJson('ABC');
    expect(j.rules.allowedOps).toEqual([...ALL_OPS]);
    expect(fromRequestJson(j).rules.allowedOps.has('mirror')).toBe(true);
  });
});

describe('createSolverHandler', () => {
  it('poster resultat med samme requestId', () => {
    const out: WorkerOut[] = [];
    const pending: Array<() => void> = [];
    const handle = createSolverHandler((m) => out.push(m), (fn) => pending.push(fn));
    handle({ kind: 'solve', requestId: 'r1', req: reqJson('AAB') });
    while (pending.length > 0) pending.shift()!();
    expect(out).toEqual([{ requestId: 'r1', result: { status: 'solved', moves: 1 } }]);
  });

  it('cancel før kjøring gir ingen melding', () => {
    const out: WorkerOut[] = [];
    const pending: Array<() => void> = [];
    const handle = createSolverHandler((m) => out.push(m), (fn) => pending.push(fn));
    handle({ kind: 'solve', requestId: 'r1', req: reqJson('ABCDEFGH') });
    handle({ kind: 'cancel', requestId: 'r1' });
    while (pending.length > 0) pending.shift()!();
    expect(out).toEqual([]);
  });

  it('kjører i biter så cancel midt i søk stopper det', () => {
    const out: WorkerOut[] = [];
    const pending: Array<() => void> = [];
    const handle = createSolverHandler((m) => out.push(m), (fn) => pending.push(fn));
    handle({ kind: 'solve', requestId: 'r1', req: { ...reqJson('ABCDEFGHIJ'), limits: { states: 10_000_000 } } });
    pending.shift()!();
    expect(pending.length).toBe(1);
    handle({ kind: 'cancel', requestId: 'r1' });
    while (pending.length > 0) pending.shift()!();
    expect(out).toEqual([]);
  });
});
