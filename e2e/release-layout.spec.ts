import { expect, test } from '@playwright/test';
import { SAVE_KEY } from '../src/core/storage';
import { dismissIntroIfVisible, hook, tap } from './helpers';

test('resultatet fortsetter fra sentrert knapp på desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?level=w1-01');
  await page.waitForFunction(() => window.__palintris?.levelId === 'w1-01');
  await dismissIntroIfVisible(page);
  const h = hook(page);
  await tap(page, await h.slot(2));
  await tap(page, await h.slot(3));
  await page.waitForFunction(() => window.__palintris === undefined);
  await page.mouse.click(720, 594);
  await page.waitForFunction(() => window.__palintris?.levelId === 'w1-02', undefined, { timeout: 5000 });
});

test('smale innstillingsknapper har minst 44 pikslers treffhøyde', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/?level=w1-01');
  await page.waitForFunction(() => window.__palintris?.levelId === 'w1-01');
  await page.mouse.click(224, 30);
  await page.waitForFunction(() => window.__palintris === undefined);
  await page.mouse.click(507, 342);
  await page.mouse.click(522, 103);
  await expect.poll(() => page.evaluate((key) => {
    const save = localStorage.getItem(key);
    return save === null ? null : (JSON.parse(save) as { settings: { sound: boolean } }).settings.sound;
  }, SAVE_KEY)).toBe(false);
});
