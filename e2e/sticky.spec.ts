import { expect, test } from '@playwright/test';
import { hook } from './helpers';
import { STICKY_LEVELS } from '../src/game/modes/sticky';
import { dismissIntroIfVisible, tap } from './helpers';

test('sticky-forsøket kan åpnes fra menyen', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(1000);
  await page.mouse.click(111, 645);
  await page.waitForFunction(() => window.__palintris?.mode === 'sticky', undefined, { timeout: 5000 });
  expect((await hook(page).view()).tiles.some((tile) => tile.sticky === true)).toBe(true);
});

test('forhåndsviser begge bytter og gjenoppretter paret med Angre', async ({ page }) => {
  await page.goto('/?mode=sticky&level=sticky-02');
  await page.waitForFunction(() => window.__palintris?.levelId === 'sticky-02');
  await dismissIntroIfVisible(page);
  const h = hook(page);
  const before = await h.view();
  const from = await h.slot(1);
  const to = await h.slot(0);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.waitForFunction(() => window.__palintris?.stickyPreview().length === 2);
  await page.screenshot({ path: 'test-results/sticky-preview.png' });
  await page.mouse.up();
  await h.waitIdle();
  expect((await h.view()).movesUsed).toBe(1);
  expect((await h.view()).tiles.map((tile) => tile.id)).toEqual([1, 0, 2, 3, 5, 4]);
  await tap(page, (await h.zones()).undo);
  await h.waitIdle();
  expect((await h.view()).tiles).toEqual(before.tiles);
});

test('spiller alle tre prøvebrett og går tilbake til menyen', async ({ page }) => {
  await page.goto('/?mode=sticky');
  const h = hook(page);
  for (const level of STICKY_LEVELS) {
    await page.waitForFunction((id) => window.__palintris?.levelId === id, level.id);
    await dismissIntroIfVisible(page);
    for (const cmd of level.solution) {
      await h.waitIdle();
      await tap(page, await h.slot(cmd.a));
      await tap(page, await h.slot(cmd.b));
    }
    await page.waitForFunction(() => window.__palintris?.view().solved);
    expect((await h.view()).movesUsed).toBe(level.target);
    expect((await h.view()).stars).toBe(3);
    await page.waitForFunction(() => window.__palintris === undefined);
    await page.mouse.click(195, 557);
  }
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__palintris)).toBeUndefined();
  await page.mouse.click(111, 645);
  await page.waitForFunction(() => window.__palintris?.levelId === 'sticky-01');
});

test('bare koblede par trekkes sammen ved sletting', async ({ page }) => {
  await page.goto('/?mode=sticky');
  await page.waitForFunction(() => window.__palintris?.levelId === 'sticky-01');
  await dismissIntroIfVisible(page);
  const h = hook(page);
  const level = STICKY_LEVELS[0];
  if (level === undefined) throw new Error('Mangler sticky-01');
  for (const cmd of level.solution) {
    await h.waitIdle();
    await tap(page, await h.slot(cmd.a));
    await tap(page, await h.slot(cmd.b));
  }
  await page.waitForFunction(() => window.__palintris?.view().solved);
  const samples = await page.evaluate(() => new Promise<{ bound: number[]; plain: number[]; landed: number[] }>((resolve) => {
    const initial = window.__palintris;
    if (initial === undefined) throw new Error('Mangler brettet før sletting');
    const bound = new Set(initial.view().tiles.filter((tile) => tile.bondedTo !== undefined).map((tile) => tile.id));
    const slots = initial.screenLayout().slots;
    const center = { x: slots.reduce((sum, slot) => sum + slot.x, 0) / slots.length, y: slots.reduce((sum, slot) => sum + slot.y, 0) / slots.length };
    const samples = { bound: [] as number[], plain: [] as number[], landed: [] as number[] };
    const collect = (): void => {
      const h = window.__palintris;
      if (h === undefined) { resolve(samples); return; }
      for (const tile of h.renderedTiles()) {
        if (tile.alpha > 0.1 && tile.alpha < 0.9) (bound.has(tile.id) ? samples.bound : samples.plain).push(tile.scaleX);
        if (bound.has(tile.id) && tile.alpha === 0) samples.landed.push(Math.hypot(tile.x - center.x, tile.y - center.y));
      }
      requestAnimationFrame(collect);
    };
    collect();
  }));
  expect(samples.bound.length).toBeGreaterThan(0);
  expect(samples.plain.length).toBeGreaterThan(0);
  expect(samples.bound.every((scale) => scale < 1)).toBe(true);
  expect(samples.plain.every((scale) => scale > 1)).toBe(true);
  expect(samples.landed.length).toBeGreaterThan(0);
  expect(samples.landed.every((distance) => distance < 1)).toBe(true);
});
