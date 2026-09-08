import { describe, expect, it } from 'vitest';
import { columnsFor, computeLayout, GAP, hitGap, hitTile, layoutKind, MARGIN, tileSize, TILE_MAX, TILE_MIN } from '../layout';

const lay = (count: number, width = 390, height = 400) => computeLayout({ count, width, height });

describe('layoutKind og columnsFor', () => {
  it('rad opp til 6, hårnål fra 7', () => {
    expect(layoutKind(6)).toBe('row');
    expect(layoutKind(7)).toBe('hairpin');
    expect(columnsFor(6)).toBe(6);
    expect(columnsFor(7)).toBe(4);
    expect(columnsFor(8)).toBe(4);
    expect(columnsFor(13)).toBe(7);
    expect(columnsFor(14)).toBe(7);
  });
});

describe('tileSize', () => {
  it('gir 7 brikker plass på 360 px og klemmer til 44–84', () => {
    expect(tileSize(360, 7)).toBeCloseTo((360 - 2 * MARGIN - 6 * GAP) / 7, 5);
    expect(tileSize(360, 7)).toBeGreaterThanOrEqual(TILE_MIN);
    expect(tileSize(800, 4)).toBe(TILE_MAX);
    expect(tileSize(200, 7)).toBe(TILE_MIN);
  });
});

describe('computeLayout rad', () => {
  it('legger brikkene på én linje, sentrert, med vertikal speillinje i midten', () => {
    const l = lay(5);
    expect(l.kind).toBe('row');
    expect(l.slots).toHaveLength(5);
    expect(new Set(l.slots.map((s) => s.y)).size).toBe(1);
    for (let i = 1; i < 5; i++) expect(l.slots[i]!.x).toBeGreaterThan(l.slots[i - 1]!.x);
    const first = l.slots[0]!;
    const last = l.slots[4]!;
    expect((first.x + last.x) / 2).toBeCloseTo(l.width / 2, 5);
    expect(l.mirror.x1).toBeCloseTo(l.width / 2, 5);
    expect(l.mirror.x1).toBe(l.mirror.x2);
  });
});

describe('computeLayout hårnål', () => {
  it.each([7, 8, 11, 14])('par står rett over hverandre for %i brikker', (n) => {
    const l = lay(n);
    expect(l.kind).toBe('hairpin');
    for (let i = 0; i < Math.floor(n / 2); i++) {
      const a = l.slots[i]!;
      const b = l.slots[n - 1 - i]!;
      expect(a.x).toBeCloseTo(b.x, 5);
      expect(a.row).toBe(0);
      expect(b.row).toBe(1);
      expect(b.y).toBeGreaterThan(a.y);
    }
    expect(l.mirror.y1).toBe(l.mirror.y2);
    expect(l.mirror.y1).toBeCloseTo(l.height / 2, 5);
  });

  it('midtbrikke ved oddetall står ytterst til høyre på speillinja', () => {
    const l = lay(7);
    const mid = l.slots[3]!;
    expect(mid.row).toBe('mid');
    expect(mid.y).toBeCloseTo(l.height / 2, 5);
    expect(mid.x).toBeGreaterThan(l.slots[2]!.x);
  });

  it('nederste rad leses høyre mot venstre', () => {
    const l = lay(8);
    expect(l.slots[4]!.x).toBeGreaterThan(l.slots[7]!.x);
  });

  it('slots er sortert på indeks', () => {
    const l = lay(9);
    expect(l.slots.map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('skalering', () => {
  it('bredde under 360 gir scale < 1 og layout regnet på 360', () => {
    const l = lay(7, 320);
    expect(l.width).toBe(360);
    expect(l.scale).toBeCloseTo(320 / 360, 5);
    expect(lay(7, 390).scale).toBe(1);
  });
});

describe('gaps', () => {
  it('har n+1 innsettingsplasser i sekvensrekkefølge', () => {
    const l = lay(5);
    expect(l.gaps.map((g) => g.at)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(l.gaps[0]!.x).toBeLessThan(l.slots[0]!.x);
    expect(l.gaps[5]!.x).toBeGreaterThan(l.slots[4]!.x);
    expect(l.gaps[2]!.x).toBeCloseTo((l.slots[1]!.x + l.slots[2]!.x) / 2, 5);
  });

  it('i hårnål ligger siste gap til venstre for nederste rads første brikke', () => {
    const l = lay(8);
    expect(l.gaps[8]!.x).toBeLessThan(l.slots[7]!.x);
    expect(l.gaps[8]!.y).toBeCloseTo(l.slots[7]!.y, 5);
    const fold = l.gaps[4]!;
    expect(fold.x).toBeCloseTo(l.slots[3]!.x, 5);
    expect(fold.y).toBeCloseTo((l.slots[3]!.y + l.slots[4]!.y) / 2, 5);
  });
});

describe('treff', () => {
  it('hitTile finner brikke innenfor kvadratet, ellers null', () => {
    const l = lay(6);
    const s = l.slots[2]!;
    expect(hitTile(l, s.x, s.y)).toBe(2);
    expect(hitTile(l, s.x + l.tile / 2 - 1, s.y)).toBe(2);
    expect(hitTile(l, 0, 0)).toBeNull();
  });
  it('hitGap finner nærmeste gap innen 0.6 brikke, ellers null', () => {
    const l = lay(6);
    const g = l.gaps[3]!;
    expect(hitGap(l, g.x + 2, g.y - 2)).toBe(3);
    expect(hitGap(l, g.x, g.y + l.tile)).toBeNull();
  });
});
