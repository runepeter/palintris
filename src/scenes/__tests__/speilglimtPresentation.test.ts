import { describe, expect, it } from 'vitest';
import { makeTile } from '../../core/tiles';
import { rotationControlsLayout } from '../../game/moveAnimation';
import { resultInfoRows, speilglimtHandLayout, speilglimtInstruction, speilglimtResultLines } from '../speilglimtPresentation';

for (const [width, height] of [[360, 640], [360, 500], [844, 390]] as const) {
  for (const [wild, remove] of [[false, false], [true, false], [false, true], [true, true]] as const) {
    it(`holder hånd og rotasjon atskilt på ${width}x${height}, kort ${wild}/${remove}`, () => {
      const hand = speilglimtHandLayout(width, height, wild, remove);
      const boxes = [hand.glimt, hand.undo, hand.reset, ...hand.cards.map((card) => card.box)];
      expect(hand.cards.map((card) => card.kind)).toEqual([...(wild ? ['wild'] : []), ...(remove ? ['remove'] : [])]);
      const rotations = rotationControlsLayout(width, height);
      for (const [index, box] of boxes.entries()) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBe(44);
        expect(box.x - box.width / 2).toBeGreaterThanOrEqual(8);
        expect(box.x + box.width / 2).toBeLessThanOrEqual(width - 8);
        expect(box.y - box.height / 2).toBeGreaterThanOrEqual(height - 120);
        expect(box.y + box.height / 2).toBeLessThanOrEqual(height - 8);
        for (const other of boxes.slice(index + 1)) {
          expect(Math.abs(box.x - other.x) >= (box.width + other.width) / 2 + 7 || Math.abs(box.y - other.y) >= (box.height + other.height) / 2 + 7).toBe(true);
        }
        for (const rotation of [rotations.left, rotations.right]) {
          expect(Math.abs(box.x - rotation.x) >= (box.width + rotations.width) / 2 || Math.abs(box.y - rotation.y) >= (box.height + rotations.height) / 2).toBe(true);
        }
      }
    });
  }
}

describe('konkret hjelp uten å utføre kommandoen', () => {
  const tiles = [makeTile(70, 'A'), makeTile(10, 'B'), makeTile(90, 'A'), makeTile(20, 'C')];
  it('markerer naboene som faktisk skal byttes', () => {
    expect(speilglimtInstruction({ type: 'swap', a: 1, b: 2 }, tiles)).toMatchObject({ text: 'Bytt de to markerte brikkene.', indices: [1, 2], gap: null, glyph: '⇄' });
  });
  it('bruker segmentmenyens glyfer og retning for utsnitt', () => {
    expect(speilglimtInstruction({ type: 'rotate', from: 1, to: 3, dir: 'left' }, tiles)).toMatchObject({ short: 'Roter markert: ⟲ Venstre', indices: [1, 2, 3], glyph: '⟲', wholeBoard: null });
    expect(speilglimtInstruction({ type: 'rotate', from: 0, to: 2, dir: 'right' }, tiles).text).toContain('⟳ Høyre');
  });
  it('peker på helbrettknappen bare når den finnes', () => {
    expect(speilglimtInstruction({ type: 'rotate', from: 0, to: 3, dir: 'right' }, tiles, true)).toMatchObject({ wholeBoard: 'right', indices: [], short: 'Trykk Hele brettet →' });
    expect(speilglimtInstruction({ type: 'rotate', from: 0, to: 3, dir: 'left' }, tiles, false)).toMatchObject({ wholeBoard: null, indices: [0, 1, 2, 3] });
  });
  it('beskriver speiling og jokerens gap', () => {
    expect(speilglimtInstruction({ type: 'mirror', from: 1, to: 3 }, tiles)).toMatchObject({ indices: [1, 2, 3], glyph: '⇋' });
    expect(speilglimtInstruction({ type: 'insertWild', at: 2 }, tiles)).toMatchObject({ indices: [], gap: 2 });
  });
  it('finner fjernbrikken på ID, ikke posisjon', () => {
    expect(speilglimtInstruction({ type: 'remove', tileId: 90 }, tiles)).toMatchObject({ text: 'Dra den markerte brikken til Fjern.', indices: [2], gap: null });
  });
});

describe('resultatopptjening', () => {
  it('viser restfremdrift og separat saldo etter bruk', () => {
    expect(speilglimtResultLines(5, 0, true)).toEqual({ balance: 'Speilglimt · 0 · løst med hjelp', progress: '2/3 speil til neste glimt',
      compact: 'Speilglimt · 0 · løst med hjelp · 2/3 til neste' });
  });
  it('lover ikke et glimt nummer31', () => {
    expect(speilglimtResultLines(90, 7, false)).toMatchObject({ balance: 'Speilglimt · 7', progress: 'Alle 30 glimt er opptjent' });
    expect(speilglimtResultLines(89, 7, false).progress).toBe('2/3 speil til neste glimt');
  });
});

// Plass fra seglets sentrum til primærknappen (portrett) eller skjermkanten (landskap), som i ResultScene.
const spaceFor = (w: number, h: number): number => w > h ? h - 16 - h * 0.52 : h * 0.66 - 29 - 4 - h * 0.31;

describe('resultatlinjer etter faktisk plass', () => {
  for (const [w, h] of [[360, 500], [360, 640], [390, 844], [844, 390], [1440, 900]] as const) {
    for (const best of [false, true]) for (const unlock of [false, true]) {
      it(`${w}x${h} beste=${best} åpning=${unlock}`, () => {
        const space = spaceFor(w, h);
        const rows = resultInfoRows(space, best, unlock);
        expect(rows.unlock !== null).toBe(unlock);
        const bottoms = [rows.best === null ? 0 : rows.best + 8, rows.unlock === null ? 0 : rows.unlock + 24, ...rows.glimt.map((y) => y + 8)];
        expect(Math.max(...bottoms)).toBeLessThanOrEqual(space);
        const tops = [rows.best, rows.unlock === null ? null : rows.unlock - 24, ...rows.glimt].filter((y): y is number => y !== null);
        expect(Math.min(...tops, Infinity)).toBeGreaterThan(90);
        if (!unlock) expect(rows.glimt.length).toBeGreaterThan(0);
      });
    }
  }
  it('beholder verdensåpning, glimt og beste på vanlige telefoner', () => {
    expect(resultInfoRows(spaceFor(390, 844), true, true).best).not.toBeNull();
    expect(resultInfoRows(spaceFor(390, 844), true, true).unlock).not.toBeNull();
    expect(resultInfoRows(spaceFor(390, 844), true, true).glimt).toHaveLength(2);
    expect(resultInfoRows(spaceFor(360, 640), true, false).glimt).toHaveLength(2);
    expect(resultInfoRows(spaceFor(844, 390), true, false).best).not.toBeNull();
  });
});
