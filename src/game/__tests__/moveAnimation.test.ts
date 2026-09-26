import { describe, expect, it } from 'vitest';
import { moveAnimationFor } from '../moveAnimation';

describe('moveAnimationFor', () => {
  it('gir hvert verktøy en tydelig profil', () => {
    expect(moveAnimationFor('swap', { clear: true, reduced: false, timed: false })).toMatchObject({ detailed: true, moveMs: 520 });
    expect(moveAnimationFor('rotate', { clear: true, reduced: false, timed: false })).toMatchObject({ detailed: true, moveMs: 760 });
    expect(moveAnimationFor('mirror', { clear: true, reduced: false, timed: false })).toMatchObject({ detailed: true, moveMs: 820 });
    expect(moveAnimationFor('insertWild', { clear: true, reduced: false, timed: false })).toMatchObject({
      detailed: true,
      moveMs: 620,
      enterDelayMs: 220,
    });
    expect(moveAnimationFor('remove', { clear: true, reduced: false, timed: false })).toMatchObject({
      detailed: true,
      moveMs: 620,
      moveDelayMs: 200,
      exitMs: 360,
    });
  });

  it('beholder dagens raske profil når valget er av', () => {
    expect(moveAnimationFor('rotate', { clear: false, reduced: false, timed: false })).toEqual({
      detailed: false,
      moveMs: 220,
      moveDelayMs: 0,
      enterMs: 220,
      enterDelayMs: 0,
      exitMs: 120,
      totalMs: 220,
    });
  });

  it('redusert bevegelse og tidsmodus overstyrer tydelig profil', () => {
    expect(moveAnimationFor('mirror', { clear: true, reduced: true, timed: false }).totalMs).toBe(120);
    expect(moveAnimationFor('mirror', { clear: true, reduced: false, timed: true }).totalMs).toBe(220);
  });
});

import { computeLayout } from '../layout';
import { rotationControlsLayout, wholeRotationPath, rotationPoint } from '../moveAnimation';

for (const width of [360, 667, 844]) {
  const height = width === 360 ? 640 : 390;
  for (const count of [5, 7]) for (const dir of ['left', 'right'] as const) {
    it(`holder ${count}-brikkers ${dir}-bane innenfor ${width}×${height}`, () => {
      const controls = rotationControlsLayout(width, height);
      const areaHeight = height - 120 - controls.boardTop;
      const layout = computeLayout({ count, width: Math.min(width, 480), height: areaHeight });
      const origin = { x: (width - layout.width * layout.scale) / 2, y: controls.boardTop };
      const path = wholeRotationPath(layout, origin, dir, { left: 0, right: width, top: controls.boardTop, bottom: height - 120 });
      const first = layout.slots[dir === 'left' ? 0 : count - 1]!;
      const last = layout.slots[dir === 'left' ? count - 1 : 0]!;
      expect(rotationPoint(path, 0)).toEqual({ x: origin.x + first.x * layout.scale, y: origin.y + first.y * layout.scale });
      expect(rotationPoint(path, 1)).toEqual({ x: origin.x + last.x * layout.scale, y: origin.y + last.y * layout.scale });
      const midpoint = rotationPoint(path, .5);
      expect(count === 5 ? midpoint.y : midpoint.x).not.toBe(count === 5 ? path.start.y : path.start.x);
      const half = layout.tile * layout.scale / 2;
      for (let i = 0; i <= 100; i++) {
        const p = rotationPoint(path, i / 100);
        expect(p.x - half).toBeGreaterThanOrEqual(0);
        expect(p.x + half).toBeLessThanOrEqual(width);
        expect(p.y - half).toBeGreaterThanOrEqual(controls.boardTop - .001);
        expect(p.y + half).toBeLessThanOrEqual(height - 120 + .001);
      }
    });
  }
  it(`reserverer 44px knapper utenfor brett/HUD/hånd på ${width}`, () => {
    const p = rotationControlsLayout(width, height);
    expect(p.height).toBe(44);
    expect(p.left.x - p.width / 2).toBeGreaterThanOrEqual(8);
    expect(p.right.x + p.width / 2).toBeLessThanOrEqual(width - 8);
    expect(p.left.y - 22).toBeGreaterThanOrEqual(96);
    expect(p.left.y + 22).toBeLessThanOrEqual(height - 132);
    expect(p.mode).toBe(width === 360 ? 'bottom' : width === 844 ? 'sides' : 'toolbar');
    if (p.mode === 'toolbar') expect(p.left.y + 22).toBeLessThan(p.boardTop);
  });
}

import { getCampaignLevel } from '../../content/campaign';
import { rulesFor } from '../../core/level';
import { BoardSession } from '../session';
import { solve } from '../../core/solver';

for (const id of ['w2-01', 'w2-07']) for (const dir of ['left', 'right'] as const) {
  it(`bruker ekte ${id}-ID-er og ett trekk ved hel ${dir}-rotasjon`, () => {
    const level = getCampaignLevel(id)!;
    const session = new BoardSession({ ...level, rules: rulesFor(level), solver: { solve: (request) => Promise.resolve(solve(request)), cancelAll: () => undefined }, onChange: () => undefined });
    const ids = level.tiles.map((tile) => tile.id);
    expect(session.dispatch({ type: 'rotate', from: 0, to: ids.length - 1, dir }).ok).toBe(true);
    expect(session.view().tiles.map((tile) => tile.id)).toEqual(dir === 'left' ? [...ids.slice(1), ids[0]] : [ids.at(-1), ...ids.slice(0, -1)]);
    expect(session.view().movesUsed).toBe(1);
    session.dispose();
  });
}
it('avviser helrotasjon atomisk når en brikke er låst', () => {
  const level = getCampaignLevel('w2-07')!;
  const session = new BoardSession({ ...level, tiles: level.tiles.map((tile, index) => ({ ...tile, locked: index === 2 })), rules: rulesFor(level), solver: { solve: (request) => Promise.resolve(solve(request)), cancelAll: () => undefined }, onChange: () => undefined });
  const before = session.view();
  expect(session.dispatch({ type: 'rotate', from: 0, to: level.tiles.length - 1, dir: 'left' })).toMatchObject({ ok: false, reason: 'segmentContainsLocked' });
  expect(session.view().tiles).toEqual(before.tiles);
  expect(session.view().movesUsed).toBe(0);
  session.dispose();
});

it('beholder luft til knapper når portrettvinduet krymper til 500px', () => {
  const controls = rotationControlsLayout(360, 500);
  const layout = computeLayout({ count: 7, width: 360, height: 500 - 120 - controls.boardTop });
  for (const slot of layout.slots) for (const button of [controls.left, controls.right]) {
    const x = slot.x * layout.scale;
    const y = controls.boardTop + slot.y * layout.scale;
    expect(Math.abs(button.x - x) >= (controls.width + layout.tile * layout.scale) / 2 + 8 ||
      Math.abs(button.y - y) >= (controls.height + layout.tile * layout.scale) / 2 + 8).toBe(true);
  }
});
