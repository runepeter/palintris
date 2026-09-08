import { expect, test } from '@playwright/test';
import type { SaveData } from '../src/core/storage';
import { matches } from '../src/core/palindrome';
import { hook } from './helpers';

test('menyknappen avslutter kampanjen og lar spilleren starte igjen', async ({ page }) => {
  await page.goto('/?level=w3-02');
  await page.waitForFunction(() => window.__palintris !== undefined);
  await page.mouse.click(42, 30);
  await page.waitForFunction(() => window.__palintris === undefined);
  await page.mouse.click(195, 515);
  await page.mouse.click(39, 361);
  await page.waitForFunction(() => window.__palintris?.levelId === 'w1-01');
  expect((await hook(page).view()).movesUsed).toBe(0);
});

test('menyknappen virker mens blitzklokken oppdateres', async ({ page }) => {
  await page.goto('/?mode=blitz');
  await page.waitForFunction(() => window.__palintris?.mode === 'blitz');
  await page.mouse.move(42, 30);
  await page.mouse.down();
  await page.waitForTimeout(1100);
  await page.mouse.up();
  await page.waitForFunction(() => window.__palintris === undefined);
});

test('avsluttet dagsbrett lagres og klokken står stille i menyen', async ({ page }) => {
  await page.goto('/?mode=daily');
  await page.waitForFunction(() => window.__palintris?.mode === 'daily');
  const h = hook(page);
  const start = (await h.view()).tiles;
  const index = start.findIndex((tile, i) => {
    const next = start[i + 1];
    if (next === undefined || tile.locked || next.locked) return false;
    const swapped = [...start];
    swapped[i] = next;
    swapped[i + 1] = tile;
    return swapped.some((t, j) => {
      const opposite = swapped[swapped.length - 1 - j];
      return opposite !== undefined && !matches(t, opposite);
    });
  });
  expect(index).toBeGreaterThanOrEqual(0);
  const a = await h.slot(index);
  const b = await h.slot(index + 1);
  await page.mouse.click(a.x, a.y);
  await page.mouse.click(b.x, b.y);
  await h.waitIdle();
  const tiles = (await h.view()).tiles;
  await page.waitForTimeout(250);
  const elapsed = await page.evaluate(() => window.__palintris?.clockMs() ?? 0);
  await page.mouse.click(42, 30);
  await page.waitForFunction(() => window.__palintris === undefined);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('palintris.save.v1') ?? '{}') as SaveData);
  expect(saved.daily.inProgress?.elapsedMs).toBeGreaterThanOrEqual(Math.round(elapsed));
  await page.waitForTimeout(300);
  const later = await page.evaluate(() => JSON.parse(localStorage.getItem('palintris.save.v1') ?? '{}') as SaveData);
  expect(later.daily.inProgress).toEqual(saved.daily.inProgress);
  await page.goto('/?mode=daily');
  await page.waitForFunction(() => window.__palintris?.mode === 'daily');
  expect((await h.view()).tiles).toEqual(tiles);
});
