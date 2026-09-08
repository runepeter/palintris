import { expect, test } from '@playwright/test';
import { hook } from './helpers';

test.use({ deviceScaleFactor: 2 });

test('Retina bruker fysisk oppløsning og beholder treffpunkter etter resize', async ({ page }) => {
  await page.goto('/?level=w3-02');
  const h = hook(page);
  await page.waitForFunction(() => window.__palintris !== undefined);
  await h.dismissIntro();
  const buffer = (): Promise<number[]> => page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => [canvas.width, canvas.height]);
  expect(await buffer()).toEqual([780, 1688]);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(buffer).toEqual([1688, 780]);
  await h.waitIdle();
  const before = await h.view();
  const a = await h.slot(0);
  const b = await h.slot(1);
  await page.mouse.click(a.x, a.y);
  await page.mouse.click(b.x, b.y);
  await h.waitIdle();
  expect((await h.view()).movesUsed).toBe(before.movesUsed + 1);
  const undo = (await h.zones()).undo;
  await page.mouse.click(undo.x, undo.y);
  await h.waitIdle();
  expect((await h.view()).movesUsed).toBe(before.movesUsed);
});
