import { expect, test } from '@playwright/test';
import { defaultSave, SAVE_KEY } from '../src/core/storage';
import { openChallenges, startJourney, waitForSceneFrame } from './menu-navigation';

test('Start reisen opens the first campaign board directly', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toBeHidden();
  await startJourney(page);
  await page.waitForFunction(() => window.__palintris?.levelId === 'w1-01');
  expect(await page.evaluate(() => window.__palintris?.mode)).toBe('campaign');
});

test('Fortsett reisen uses the highest unlocked world and keeps saved stars', async ({ page }) => {
  const stars = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`w1-${String(i + 1).padStart(2, '0')}`, { stars: 1, contentVersion: 1 }]));
  const save = { ...defaultSave(), stars };
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: SAVE_KEY, value: JSON.stringify(save) });
  await page.goto('/');
  await expect(page.getByRole('status')).toBeHidden();
  await startJourney(page);
  await page.waitForFunction(() => window.__palintris?.levelId === 'w2-01');
  expect(await page.evaluate((key) => Object.keys((JSON.parse(localStorage.getItem(key) ?? '{}') as { stars: Record<string, unknown> }).stars).length, SAVE_KEY)).toBe(12);
});

test('Utfordringer opens Blitz and Daglig from their own choices', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toBeHidden();
  await openChallenges(page);
  await page.mouse.click(195, 844 * 0.63);
  await page.waitForFunction(() => window.__palintris?.mode === 'blitz');
  await page.mouse.click(42, 30);
  await page.waitForFunction(() => window.__palintris === undefined);
  await openChallenges(page);
  await page.mouse.click(195, 844 * 0.46);
  await waitForSceneFrame(page);
  await page.mouse.click(195, 844 * 0.58);
  await page.waitForFunction(() => window.__palintris?.mode === 'daily');
});

for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
  test(`lobby and challenges navigation at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByRole('status')).toBeHidden();
    await page.screenshot({ path: `/tmp/palintris-journey-visual/lobby-${viewport.width}x${viewport.height}.png` });
    await openChallenges(page);
    await page.screenshot({ path: `/tmp/palintris-journey-visual/challenges-${viewport.width}x${viewport.height}.png` });
    await page.mouse.click(viewport.width / 2, viewport.height - 43);
    await waitForSceneFrame(page);
    await startJourney(page);
    await page.waitForFunction(() => window.__palintris?.mode === 'campaign');
  });
}
