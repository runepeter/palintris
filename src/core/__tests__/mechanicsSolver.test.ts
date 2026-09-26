import { describe, expect, it } from 'vitest';
import { isPalindrome } from '../palindrome';
import { makeRules } from '../rules';
import { solve, stateKey } from '../solver';
import type { SolveRequest } from '../solver';
import { createSolverHandler, fromRequestJson, toRequestJson } from '../solverProtocol';
import type { SolveRequestJson, WorkerOut } from '../solverProtocol';
import { applyMove } from '../step';
import { makeSnapshot, tilesFromString } from '../tiles';
import type { Tile } from '../tiles';

const hand = { wild: 0, remove: 0 };
const rules = makeRules(['swap']);
const objective = { kind: 'centerBonus', tileId: 0 } as const;
const request = (tiles: readonly Tile[]): SolveRequest => ({ rules, tiles, hand, maxMoves: 8, limits: { states: 50000 } });
const trace = (tiles: readonly Tile[], swaps: readonly (readonly [number, number])[]) => {
  let snap = makeSnapshot(tiles, hand);
  for (const [a, b] of swaps) {
    expect(isPalindrome(snap.tiles)).toBe(false);
    const next = applyMove(rules, snap, { type: 'swap', a, b });
    expect(next.ok).toBe(true);
    if (!next.ok) throw new Error(next.reason);
    snap = next.value;
  }
  return snap;
};

describe('kvote og bonus i løseren', () => {
  it('skiller kvote, identitet og ubegrenset fra null, beholder gammel ordinær nøkkel', () => {
    const plain = tilesFromString('AABAB');
    const limited = plain.map((t) => t.id === 2 ? { ...t, movesLeft: 2 } : t);
    expect(stateKey(plain, hand)).toBe('AABAB|0|0');
    expect(stateKey(limited, hand)).not.toBe(stateKey(plain, hand));
    expect(stateKey(limited, hand)).not.toBe(stateKey(limited.map((t) => ({ ...t, id: t.id + 10 })), hand));
    expect(stateKey(limited, hand)).not.toBe(stateKey(limited.map((t) => t.id === 2 ? { ...t, movesLeft: 1 } : t), hand));
    expect(stateKey(plain, hand)).not.toBe(stateKey(plain.map((t) => t.id === 2 ? { ...t, movesLeft: 0 } : t), hand));
  });

  it('kvotefikstur1 har eksakt minimum2 og kan låses ute med to feilflytt', () => {
    const tiles = tilesFromString('AABAB').map((t) => t.id === 2 ? { ...t, movesLeft: 2 } : t);
    expect(solve(request(tiles))).toEqual({ status: 'solved', moves: 2 });
    const win = trace(tiles, [[1, 2], [0, 1]]);
    expect(isPalindrome(win.tiles)).toBe(true);
    expect(win.tiles[0]?.movesLeft).toBe(0);
    const trapped = trace(tiles, [[1, 2], [1, 2]]);
    expect(solve(request(trapped.tiles))).toEqual({ status: 'unreachableWithinBudget' });
  });

  it('kvotefikstur2 har eksakt minimum3 og lar tom brikke stå', () => {
    const tiles = tilesFromString('ABCABC').map((t) => t.id === 0 ? { ...t, movesLeft: 2 } : t);
    expect(solve(request(tiles))).toEqual({ status: 'solved', moves: 3 });
    const win = trace(tiles, [[0, 1], [1, 2], [0, 1]]);
    expect(isPalindrome(win.tiles)).toBe(true);
    expect(win.tiles[2]).toMatchObject({ id: 0, movesLeft: 0 });
  });

  it('midtbonus krever3 selv om vanlig minimum er2, og identisk symbolbytte beholdes', () => {
    const tiles = tilesFromString('AABAB');
    expect(solve(request(tiles))).toEqual({ status: 'solved', moves: 2 });
    expect(solve({ ...request(tiles), objective })).toEqual({ status: 'solved', moves: 3 });
    expect(solve({ ...request(tiles), objective, maxMoves: 2 })).toEqual({ status: 'unreachableWithinBudget' });
    expect(trace(tiles, [[1, 2], [0, 1]]).tiles[2]?.id).toBe(1);
    expect(trace(tiles, [[0, 1], [1, 2], [0, 1]]).tiles[2]?.id).toBe(0);
  });

  it('utvider ikke ferdige palindrom med feil midtidentitet', () => {
    const tiles = tilesFromString('AAA');
    expect(solve({ ...request(tiles), objective })).toEqual({ status: 'unreachableWithinBudget' });
    expect(solve({ ...request(tiles), objective: { ...objective, tileId: 1 } })).toEqual({ status: 'solved', moves: 0 });
    const start = tilesFromString('AAB');
    expect(solve({ ...request(start), objective })).toEqual({ status: 'unreachableWithinBudget' });
    const shortcut = tilesFromString('ABAAB');
    expect(solve({ ...request(shortcut), objective, maxMoves: 2 })).toEqual({ status: 'unreachableWithinBudget' });
    expect(solve({ ...request(shortcut), objective })).toEqual({ status: 'solved', moves: 4 });
  });

  it('JSON og worker beholder kvote og bonusmål', () => {
    const tiles = tilesFromString('AABAB').map((t) => t.id === 0 ? { ...t, movesLeft: 2 } : t);
    const req = { ...request(tiles), objective };
    const json = JSON.parse(JSON.stringify(toRequestJson(req))) as SolveRequestJson;
    const roundtrip = fromRequestJson(json);
    expect(roundtrip).toEqual(req);
    const out: WorkerOut[] = [];
    const pending: Array<() => void> = [];
    const handle = createSolverHandler((value) => out.push(value), (fn) => pending.push(fn));
    handle({ kind: 'solve', requestId: 'center', req: json });
    while (pending.length > 0) pending.shift()!();
    expect(out).toEqual([{ requestId: 'center', result: { status: 'solved', moves: 3 } }]);
  });
});
