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
