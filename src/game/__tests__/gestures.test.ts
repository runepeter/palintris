import { describe, expect, it } from 'vitest';
import type { PointerEvt, Target } from '../gestures';
import { DRAG_THRESHOLD, GestureMachine, HOLD_MS } from '../gestures';

const tile = (index: number): Target => ({ kind: 'tile', index });
const gap = (at: number): Target => ({ kind: 'gap', at });
const hand = (item: 'wild' | 'remove'): Target => ({ kind: 'hand', item });
const none: Target = { kind: 'none' };
const menu = (action: 'rotateLeft' | 'mirror' | 'rotateRight'): Target => ({ kind: 'menu', action });

const ev = (type: PointerEvt['type'], target: Target, x = 0, y = 0, t = 0): PointerEvt => ({ type, target, x, y, t });

const machine = (opts: Partial<{ count: number; locked: number[]; wild: boolean; remove: boolean; segments: boolean }> = {}): GestureMachine =>
  new GestureMachine({
    count: () => opts.count ?? 8,
    isLocked: (i) => (opts.locked ?? []).includes(i),
    hasWild: () => opts.wild ?? true,
    canRemove: () => opts.remove ?? true,
    canSegment: () => opts.segments ?? true,
  });

describe('drag swap', () => {
  it('drag til sekvensnabo gir swap', () => {
    const m = machine();
    expect(m.handle(ev('down', tile(2), 100, 100, 0))).toEqual([]);
    expect(m.state.name).toBe('pending');
    expect(m.handle(ev('move', tile(2), 100 + DRAG_THRESHOLD + 1, 100, 50))).toEqual([]);
    expect(m.state.name).toBe('dragTile');
    expect(m.handle(ev('up', tile(3), 160, 100, 120))).toEqual([{ type: 'swap', a: 2, b: 3 }]);
    expect(m.state.name).toBe('idle');
  });

  it('drag over folden (nabo i sekvens) gir swap uansett retning', () => {
    const m = machine();
    m.handle(ev('down', tile(3), 100, 100, 0));
    m.handle(ev('move', tile(3), 100, 120, 40));
    expect(m.handle(ev('up', tile(4), 100, 160, 100))).toEqual([{ type: 'swap', a: 3, b: 4 }]);
  });

  it('slipp på ikke-nabo eller utenfor gir ingenting', () => {
    const m = machine();
    m.handle(ev('down', tile(2), 100, 100, 0));
    m.handle(ev('move', tile(2), 130, 100, 40));
    expect(m.handle(ev('up', tile(5), 300, 100, 100))).toEqual([]);
    m.handle(ev('down', tile(2), 100, 100, 200));
    m.handle(ev('move', tile(2), 130, 100, 240));
    expect(m.handle(ev('up', none, 300, 300, 300))).toEqual([]);
    expect(m.state.name).toBe('idle');
  });

  it('slipp på hånden gir remove når fjern er tilgjengelig', () => {
    const m = machine({ remove: true });
    m.handle(ev('down', tile(1), 100, 100, 0));
    m.handle(ev('move', tile(1), 100, 140, 40));
    expect(m.handle(ev('up', hand('remove'), 100, 400, 100))).toEqual([{ type: 'remove', index: 1 }]);
  });

  it('slipp på hånden uten fjern gir hint', () => {
    const m = machine({ remove: false });
    m.handle(ev('down', tile(1), 100, 100, 0));
    m.handle(ev('move', tile(1), 100, 140, 40));
    expect(m.handle(ev('up', hand('remove'), 100, 400, 100))).toEqual([{ type: 'hint', reason: 'handEmpty' }]);
  });

  it('slipp på låst nabo gir hint i stedet for swap', () => {
    const m = machine({ locked: [3] });
    m.handle(ev('down', tile(2), 100, 100, 0));
    m.handle(ev('move', tile(2), 100 + DRAG_THRESHOLD + 1, 100, 50));
    expect(m.handle(ev('up', tile(3), 160, 100, 120))).toEqual([{ type: 'hint', reason: 'locked' }]);
    expect(m.state.name).toBe('idle');
  });

  it('låst brikke kan ikke startes', () => {
    const m = machine({ locked: [2] });
    expect(m.handle(ev('down', tile(2), 0, 0, 0))).toEqual([{ type: 'hint', reason: 'locked' }]);
    expect(m.state.name).toBe('idle');
  });

  it('langt hold blir fortsatt nabobytte når segmentoperasjoner ikke finnes', () => {
    const m = machine({ segments: false });
    m.handle(ev('down', tile(3), 100, 100, 0));
    m.tick(HOLD_MS);
    expect(m.state.name).toBe('pending');
    m.handle(ev('move', tile(3), 100 + DRAG_THRESHOLD + 1, 100, HOLD_MS + 20));
    expect(m.state.name).toBe('dragTile');
    expect(m.handle(ev('up', tile(2), 50, 100, HOLD_MS + 80))).toEqual([{ type: 'swap', a: 3, b: 2 }]);
  });
});

describe('hold og segment', () => {
  it('hold 250 ms uten bevegelse gir segment, drag utvider langs sekvens, slipp gir meny', () => {
    const m = machine();
    m.handle(ev('down', tile(2), 100, 100, 0));
    m.tick(HOLD_MS);
    expect(m.state).toEqual({ name: 'segment', anchor: 2, end: 2 });
    m.handle(ev('move', tile(3), 150, 100, 300));
    m.handle(ev('move', tile(4), 200, 100, 320));
    expect(m.state).toEqual({ name: 'segment', anchor: 2, end: 4 });
    m.handle(ev('move', tile(3), 150, 100, 340));
    expect(m.state).toEqual({ name: 'segment', anchor: 2, end: 3 });
    expect(m.handle(ev('up', tile(3), 150, 100, 360))).toEqual([]);
    expect(m.state).toEqual({ name: 'menu', from: 2, to: 3 });
  });

  it('segment kan utvides bakover fra anker', () => {
    const m = machine();
    m.handle(ev('down', tile(4), 0, 0, 0));
    m.tick(HOLD_MS);
    m.handle(ev('move', tile(3), 0, 0, 300));
    m.handle(ev('move', tile(2), 0, 0, 310));
    expect(m.state).toEqual({ name: 'segment', anchor: 4, end: 2 });
    m.handle(ev('up', tile(2), 0, 0, 320));
    expect(m.state).toEqual({ name: 'menu', from: 2, to: 4 });
  });

  it('hopp over ikke-nabo og låst brikke ignoreres', () => {
    const m = machine({ locked: [4] });
    m.handle(ev('down', tile(2), 0, 0, 0));
    m.tick(HOLD_MS);
    m.handle(ev('move', tile(5), 0, 0, 300));
    expect(m.state).toEqual({ name: 'segment', anchor: 2, end: 2 });
    m.handle(ev('move', tile(3), 0, 0, 310));
    m.handle(ev('move', tile(4), 0, 0, 320));
    expect(m.state).toEqual({ name: 'segment', anchor: 2, end: 3 });
  });

  it('hold uten utvidelse slippes tilbake til idle', () => {
    const m = machine();
    m.handle(ev('down', tile(2), 0, 0, 0));
    m.tick(HOLD_MS);
    m.handle(ev('up', tile(2), 0, 0, 300));
    expect(m.state.name).toBe('idle');
  });

  it('meny: valg gir segment-intent, trykk utenfor avbryter, speil på 2 gir hint', () => {
    const m = machine();
    m.handle(ev('down', tile(2), 0, 0, 0));
    m.tick(HOLD_MS);
    m.handle(ev('move', tile(3), 0, 0, 300));
    m.handle(ev('up', tile(3), 0, 0, 320));
    expect(m.handle(ev('down', menu('mirror'), 0, 0, 400))).toEqual([{ type: 'hint', reason: 'segmentTooShort' }]);
    expect(m.state).toEqual({ name: 'menu', from: 2, to: 3 });
    expect(m.handle(ev('down', menu('rotateRight'), 0, 0, 420))).toEqual([{ type: 'segment', from: 2, to: 3, action: 'rotateRight' }]);
    expect(m.state.name).toBe('idle');

    m.handle(ev('down', tile(1), 0, 0, 500));
    m.tick(500 + HOLD_MS);
    m.handle(ev('move', tile(2), 0, 0, 800));
    m.handle(ev('up', tile(2), 0, 0, 820));
    expect(m.handle(ev('down', none, 0, 0, 900))).toEqual([]);
    expect(m.state.name).toBe('idle');
  });

  it('ett trekk som både er hold og over terskel gir segment', () => {
    const m = machine();
    m.handle(ev('down', tile(2), 100, 100, 0));
    m.handle(ev('move', tile(2), 100 + DRAG_THRESHOLD + 1, 100, HOLD_MS));
    expect(m.state).toEqual({ name: 'segment', anchor: 2, end: 2 });
  });

  it('bevegelse over terskel før hold gir drag, ikke segment', () => {
    const m = machine();
    m.handle(ev('down', tile(2), 100, 100, 0));
    m.handle(ev('move', tile(2), 120, 100, 100));
    m.tick(HOLD_MS + 10);
    expect(m.state.name).toBe('dragTile');
  });
});

describe('trykkalternativ', () => {
  it('trykk velger, trykk nabo gir swap', () => {
    const m = machine();
    m.handle(ev('down', tile(2), 0, 0, 0));
    expect(m.handle(ev('up', tile(2), 0, 0, 80))).toEqual([]);
    expect(m.state).toEqual({ name: 'selected', index: 2 });
    expect(m.handle(ev('down', tile(1), 0, 0, 200))).toEqual([{ type: 'swap', a: 2, b: 1 }]);
    expect(m.state.name).toBe('idle');
  });

  it('trykk samme brikke avvelger', () => {
    const m = machine();
    m.handle(ev('down', tile(2), 0, 0, 0));
    m.handle(ev('up', tile(2), 0, 0, 80));
    expect(m.handle(ev('down', tile(2), 0, 0, 200))).toEqual([]);
    expect(m.state.name).toBe('idle');
  });

  it('trykk annen brikke gir segment-meny i sekvensrekkefølge', () => {
    const m = machine();
    m.handle(ev('down', tile(5), 0, 0, 0));
    m.handle(ev('up', tile(5), 0, 0, 80));
    expect(m.handle(ev('down', tile(2), 0, 0, 200))).toEqual([]);
    expect(m.state).toEqual({ name: 'menu', from: 2, to: 5 });
  });

  it('trykk på ikke-nabo forklares uten segmentmeny når segmentoperasjoner ikke finnes', () => {
    const m = machine({ segments: false });
    m.handle(ev('down', tile(0), 0, 0, 0));
    m.handle(ev('up', tile(0), 0, 0, 80));
    expect(m.handle(ev('down', tile(3), 0, 0, 200))).toEqual([{ type: 'hint', reason: 'notAdjacent' }]);
    expect(m.state.name).toBe('idle');
  });

  it('trykk-segment med låst brikke i mellom gir hint', () => {
    const m = machine({ locked: [3] });
    m.handle(ev('down', tile(5), 0, 0, 0));
    m.handle(ev('up', tile(5), 0, 0, 80));
    expect(m.handle(ev('down', tile(2), 0, 0, 200))).toEqual([{ type: 'hint', reason: 'segmentContainsLocked' }]);
    expect(m.state.name).toBe('idle');
  });

  it('valgt brikke og trykk på låst nabo gir hint', () => {
    const m = machine({ locked: [3] });
    m.handle(ev('down', tile(2), 0, 0, 0));
    m.handle(ev('up', tile(2), 0, 0, 80));
    expect(m.state).toEqual({ name: 'selected', index: 2 });
    expect(m.handle(ev('down', tile(3), 0, 0, 200))).toEqual([{ type: 'hint', reason: 'locked' }]);
    expect(m.state.name).toBe('idle');
  });

  it('valgt brikke og trykk på fjern i hånden gir remove', () => {
    const m = machine();
    m.handle(ev('down', tile(2), 0, 0, 0));
    m.handle(ev('up', tile(2), 0, 0, 80));
    expect(m.handle(ev('down', hand('remove'), 0, 0, 200))).toEqual([{ type: 'remove', index: 2 }]);
  });

  it('trykk joker i hånden så mellomrom gir insertWild', () => {
    const m = machine();
    m.handle(ev('down', hand('wild'), 0, 0, 0));
    m.handle(ev('up', hand('wild'), 0, 0, 80));
    expect(m.state.name).toBe('wildArmed');
    expect(m.handle(ev('down', gap(3), 0, 0, 200))).toEqual([{ type: 'insertWild', at: 3 }]);
    expect(m.state.name).toBe('idle');
  });

  it('joker uten hånd gir hint', () => {
    const m = machine({ wild: false });
    expect(m.handle(ev('down', hand('wild'), 0, 0, 0))).toEqual([{ type: 'hint', reason: 'handEmpty' }]);
  });
});

describe('drag joker', () => {
  it('dra joker fra hånd til mellomrom gir insertWild', () => {
    const m = machine();
    m.handle(ev('down', hand('wild'), 0, 300, 0));
    m.handle(ev('move', none, 0, 200, 40));
    expect(m.state.name).toBe('dragWild');
    expect(m.handle(ev('up', gap(0), 0, 100, 100))).toEqual([{ type: 'insertWild', at: 0 }]);
  });
  it('slipp utenfor mellomrom gir ingenting', () => {
    const m = machine();
    m.handle(ev('down', hand('wild'), 0, 300, 0));
    m.handle(ev('move', none, 0, 200, 40));
    expect(m.handle(ev('up', tile(2), 0, 100, 100))).toEqual([]);
    expect(m.state.name).toBe('idle');
  });
});

describe('cancel', () => {
  it('cancel går alltid til idle', () => {
    const m = machine();
    m.handle(ev('down', tile(2), 0, 0, 0));
    m.tick(HOLD_MS);
    m.handle(ev('cancel', none, 0, 0, 300));
    expect(m.state.name).toBe('idle');
  });
});
