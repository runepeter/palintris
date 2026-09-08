import { describe, expect, it } from 'vitest';
import type { KeyEvt } from '../keyboard';
import { KeyboardController } from '../keyboard';

const kb = (opts: Partial<{ count: number; locked: number[]; wild: boolean; remove: boolean }> = {}): KeyboardController =>
  new KeyboardController({
    count: () => opts.count ?? 6,
    isLocked: (i) => (opts.locked ?? []).includes(i),
    hasWild: () => opts.wild ?? true,
    canRemove: () => opts.remove ?? true,
  });

const key = (code: KeyEvt['code'], shift = false): KeyEvt => ({ code, shift });

describe('markør', () => {
  it('starter på 0 og klemmes', () => {
    const k = kb();
    expect(k.state.cursor).toBe(0);
    k.handle(key('ArrowLeft'));
    expect(k.state.cursor).toBe(0);
    k.handle(key('ArrowRight'));
    k.handle(key('ArrowDown'));
    expect(k.state.cursor).toBe(2);
    for (let i = 0; i < 10; i++) k.handle(key('ArrowRight'));
    expect(k.state.cursor).toBe(5);
    k.handle(key('ArrowUp'));
    expect(k.state.cursor).toBe(4);
  });
});

describe('valg og swap', () => {
  it('space velger, pil mot nabo gir swap', () => {
    const k = kb();
    k.handle(key('ArrowRight'));
    expect(k.handle(key('Space'))).toEqual([]);
    expect(k.state.selected).toBe(1);
    expect(k.handle(key('ArrowRight'))).toEqual([{ type: 'swap', a: 1, b: 2 }]);
    expect(k.state.selected).toBeNull();
    expect(k.state.cursor).toBe(2);
  });
  it('space på valgt avvelger, space på låst gir hint', () => {
    const k = kb({ locked: [0] });
    expect(k.handle(key('Space'))).toEqual([{ type: 'hint', reason: 'locked' }]);
    k.handle(key('ArrowRight'));
    k.handle(key('Space'));
    expect(k.handle(key('Space'))).toEqual([]);
    expect(k.state.selected).toBeNull();
  });
  it('space med valg og markør på nabo gir swap', () => {
    const k = kb();
    k.handle(key('Space'));
    k.state = { ...k.state, cursor: 1 };
    expect(k.handle(key('Space'))).toEqual([{ type: 'swap', a: 0, b: 1 }]);
  });
});

describe('segment', () => {
  it('shift+pil utvider og Q/W/E utfører', () => {
    const k = kb();
    k.handle(key('ArrowRight'));
    k.handle(key('ArrowRight', true));
    k.handle(key('ArrowRight', true));
    expect(k.state.segment).toEqual({ anchor: 1, end: 3 });
    expect(k.state.cursor).toBe(3);
    expect(k.handle(key('KeyE'))).toEqual([{ type: 'segment', from: 1, to: 3, action: 'rotateRight' }]);
    expect(k.state.segment).toBeNull();
  });
  it('utvidelse stopper ved låst brikke', () => {
    const k = kb({ locked: [3] });
    k.handle(key('ArrowRight'));
    k.handle(key('ArrowRight', true));
    k.handle(key('ArrowRight', true));
    expect(k.state.segment).toEqual({ anchor: 1, end: 2 });
  });
  it('W på segment på 2 gir hint, Q gir rotateLeft', () => {
    const k = kb();
    k.handle(key('ArrowRight', true));
    expect(k.handle(key('KeyW'))).toEqual([{ type: 'hint', reason: 'segmentTooShort' }]);
    expect(k.state.segment).toEqual({ anchor: 0, end: 1 });
    expect(k.handle(key('KeyQ'))).toEqual([{ type: 'segment', from: 0, to: 1, action: 'rotateLeft' }]);
  });
  it('shift bakover fra anker', () => {
    const k = kb();
    k.state = { ...k.state, cursor: 3 };
    k.handle(key('ArrowLeft', true));
    k.handle(key('ArrowLeft', true));
    expect(k.state.segment).toEqual({ anchor: 3, end: 1 });
    expect(k.handle(key('KeyW'))).toEqual([{ type: 'segment', from: 1, to: 3, action: 'mirror' }]);
  });
  it('Q uten segment gir ingenting', () => {
    expect(kb().handle(key('KeyQ'))).toEqual([]);
  });
});

describe('hånd, undo, reset, escape', () => {
  it('J og X ved markør', () => {
    const k = kb();
    k.handle(key('ArrowRight'));
    expect(k.handle(key('KeyJ'))).toEqual([{ type: 'insertWild', at: 1 }]);
    expect(k.handle(key('KeyX'))).toEqual([{ type: 'remove', index: 1 }]);
  });
  it('J uten joker og X uten fjern gir hint', () => {
    const k = kb({ wild: false, remove: false });
    expect(k.handle(key('KeyJ'))).toEqual([{ type: 'hint', reason: 'handEmpty' }]);
    expect(k.handle(key('KeyX'))).toEqual([{ type: 'hint', reason: 'handEmpty' }]);
  });
  it('X på låst gir hint locked', () => {
    expect(kb({ locked: [0] }).handle(key('KeyX'))).toEqual([{ type: 'hint', reason: 'locked' }]);
  });
  it('Z og R', () => {
    const k = kb();
    expect(k.handle(key('KeyZ'))).toEqual([{ type: 'undo' }]);
    expect(k.handle(key('KeyR'))).toEqual([{ type: 'reset' }]);
  });
  it('Escape nullstiller valg og segment, beholder markør', () => {
    const k = kb();
    k.handle(key('ArrowRight'));
    k.handle(key('Space'));
    k.handle(key('Escape'));
    expect(k.state).toEqual({ cursor: 1, selected: null, segment: null });
  });
  it('clampCursor etter at brettet krympet', () => {
    const k = kb({ count: 3 });
    k.state = { cursor: 5, selected: 4, segment: null };
    k.clampCursor();
    expect(k.state).toEqual({ cursor: 2, selected: null, segment: null });
  });
});
