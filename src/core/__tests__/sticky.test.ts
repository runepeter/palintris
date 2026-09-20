import { describe, expect, it } from 'vitest';
import { apply, createBoard } from '../board';
import { makeRules, ALL_OPS } from '../rules';
import { bindStickyPairs, planSwap } from '../sticky';
import { applyMove } from '../step';
import { legalMoves, solve, stateKey } from '../solver';
import { fromRequestJson, toRequestJson, type SolveRequestJson } from '../solverProtocol';
import { makeSnapshot, makeTile, symbolKey, tilesFromString } from '../tiles';

const hand = { wild: 1, remove: 1 };
const rules = makeRules(['swap']);
const stickyTiles = (symbols: string, indices: number[]) =>
  tilesFromString(symbols).map((t, i) => indices.includes(i) ? { ...t, sticky: true } : t);

describe('sticky-par', () => {
  it('beholder vanlige brikker og snapshots uendret', () => {
    const tiles = tilesFromString('ABA');
    expect(bindStickyPairs(tiles)).toBe(tiles);
    expect(makeSnapshot(tiles, hand).tiles).toBe(tiles);
    expect(makeTile(0, 'A')).toEqual({ id: 0, symbol: 'A', locked: false, wild: false });
    expect(makeTile(0, 'A', { sticky: true }).sticky).toBe(true);
  });

  it('binder bare like ulåste speilpartnere, aldri midten eller jokere', () => {
    const tiles = stickyTiles('ABCBA', [0, 2]);
    const bound = bindStickyPairs(tiles);
    expect(bound.map((t) => t.bondedTo)).toEqual([4, undefined, undefined, undefined, 0]);
    expect(tiles.every((t) => t.bondedTo === undefined)).toBe(true);
    expect(bindStickyPairs(bound)).toBe(bound);
    for (const s of ['ABa', '*B*', 'ABC']) {
      expect(bindStickyPairs(stickyTiles(s, [0])).every((t) => t.bondedTo === undefined)).toBe(true);
    }
  });

  it('binder etter trekk og flytter partneren med ett speilet nabobytte', () => {
    const snap = makeSnapshot(stickyTiles('ABCCBA', [0]), hand);
    expect(planSwap(snap.tiles, 0, 1)).toEqual({ ok: true, value: [{ a: 0, b: 1 }, { a: 5, b: 4 }] });
    const moved = applyMove(rules, snap, { type: 'swap', a: 0, b: 1 });
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    expect(symbolKey(moved.value.tiles)).toBe('BACCAB');
    expect(moved.value.movesUsed).toBe(1);
    expect(moved.value.tiles.map((t) => t.id)).toEqual([1, 0, 2, 3, 5, 4]);
    expect(moved.value.tiles[1]?.bondedTo).toBe(5);
    const back = applyMove(rules, moved.value, { type: 'swap', a: 4, b: 5 });
    expect(back.ok && symbolKey(back.value.tiles)).toBe('ABCCBA');
  });

  it('angre og reset gjenoppretter også nye koblinger', () => {
    const initial = createBoard(stickyTiles('AABC', [0]), hand);
    const first = apply(rules, initial, { type: 'swap', a: 1, b: 2 });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = apply(rules, first.value, { type: 'swap', a: 2, b: 3 });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value.tiles[0]?.bondedTo).toBe(1);
    const undo = apply(rules, second.value, { type: 'undo' });
    expect(undo.ok && undo.value.tiles).toEqual(first.value.tiles);
    const reset = apply(rules, second.value, { type: 'reset' });
    expect(reset.ok && reset.value.tiles).toEqual(initial.tiles);
  });

  it('validerer begge bytter, avviser overlapp og tillater ett bytte over midten', () => {
    const locked = makeSnapshot(stickyTiles('ABCbA', [0]), hand).tiles;
    expect(planSwap(locked, 0, 1)).toEqual({ ok: false, reason: 'locked' });
    const odd = makeSnapshot(stickyTiles('BACAB', [1]), hand).tiles;
    expect(planSwap(odd, 1, 2)).toEqual({ ok: false, reason: 'stickyConflict' });
    expect(planSwap(odd, -1, 0)).toEqual({ ok: false, reason: 'outOfRange' });
    expect(planSwap(odd, 0, 2)).toEqual({ ok: false, reason: 'notAdjacent' });
    const even = makeSnapshot(stickyTiles('BAAB', [1]), hand).tiles;
    const result = applyMove(rules, makeSnapshot(even, hand), { type: 'swap', a: 1, b: 2 });
    expect(result.ok && result.value.tiles.map((t) => t.id)).toEqual([0, 2, 1, 3]);
  });

  it('flytter flere koblinger uten å bryte noen av dem', () => {
    const snap = makeSnapshot(stickyTiles('ABCCBA', [0, 1]), hand);
    const result = applyMove(rules, snap, { type: 'swap', a: 0, b: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const [i, t] of result.value.tiles.entries()) {
      if (t.bondedTo !== undefined) expect(result.value.tiles[5 - i]?.id).toBe(t.bondedTo);
    }
    const malformed = [...snap.tiles];
    malformed[0] = { ...malformed[0]!, bondedTo: 99 };
    expect(planSwap(malformed, 2, 3)).toEqual({ ok: false, reason: 'stickyConflict' });
  });

  it('avviser andre verktøy som flytter eller forskyver et koblet par', () => {
    const snap = makeSnapshot(stickyTiles('ABCCBA', [0]), hand);
    const all = makeRules(ALL_OPS);
    for (const cmd of [
      { type: 'rotate', from: 0, to: 2, dir: 'left' },
      { type: 'mirror', from: 0, to: 5 },
      { type: 'remove', tileId: 0 },
      { type: 'insertWild', at: 3 },
    ] as const) expect(applyMove(all, snap, cmd)).toEqual({ ok: false, reason: 'stickyConflict' });
    expect(applyMove(all, snap, { type: 'rotate', from: 1, to: 3, dir: 'left' }).ok).toBe(true);
  });

  it('skiller sticky og koblinger i søkenøkler uavhengig av id', () => {
    const tiles = stickyTiles('ABCCBA', [0]);
    const bound = bindStickyPairs(tiles);
    const renamed = bound.map((t) => ({ ...t, id: t.id + 20, ...(t.bondedTo === undefined ? {} : { bondedTo: t.bondedTo + 20 }) }));
    expect(stateKey(tilesFromString('ABCCBA'), hand)).toBe('ABCCBA|1|1');
    expect(stateKey(tiles, hand)).not.toBe(stateKey(tilesFromString('ABCCBA'), hand));
    expect(stateKey(bound, hand)).not.toBe(stateKey(tiles, hand));
    expect(stateKey(renamed, hand)).toBe(stateKey(bound, hand));
  });

  it('løser med parkoblinger og beholder metadata i worker-protokollen', () => {
    const req = { rules, tiles: bindStickyPairs(stickyTiles('ABBCCA', [0])), hand, maxMoves: 6, limits: { states: 50000 } };
    const roundtrip = fromRequestJson(JSON.parse(JSON.stringify(toRequestJson(req))) as SolveRequestJson);
    expect(roundtrip.tiles).toEqual(req.tiles);
    expect(roundtrip.tiles[0]?.bondedTo).toBe(5);
    expect(solve(roundtrip)).toEqual({ status: 'solved', moves: 2 });
    const odd = makeSnapshot(stickyTiles('BACAB', [1]), hand);
    expect(legalMoves(rules, odd)).not.toContainEqual({ type: 'swap', a: 1, b: 2 });
  });
});
