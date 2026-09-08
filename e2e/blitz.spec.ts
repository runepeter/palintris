import { expect, test } from '@playwright/test';
import { hook, tap } from './helpers';

test('Blitz trekker tid ved skip og laster spillbart neste brett', async ({ page }) => {
  await page.goto('/?mode=blitz');
  await page.waitForFunction(() => window.__palintris?.mode === 'blitz');
  const h = hook(page);
  await h.waitIdle();
  const firstId = await page.evaluate(() => window.__palintris?.levelId);
  const before = await h.clockMs();

  await tap(page, (await h.zones()).reset);
  await page.waitForFunction((id) => window.__palintris?.levelId !== id, firstId);
  await h.waitIdle();
  const after = await h.clockMs();

  expect(after).toBeLessThanOrEqual(before - 4_500);
  expect((await h.view()).solved).toBe(false);
  expect((await h.view()).movesUsed).toBe(0);
});
