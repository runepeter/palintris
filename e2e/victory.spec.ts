import { expect, test } from '@playwright/test';
import { defaultSave, SAVE_KEY } from '../src/core/storage';
import { dismissIntroIfVisible, hook, tap } from './helpers';

test('seieren viser speilet og sletter brikkene før resultatet', async ({ page }) => {
  await page.goto('/?level=w1-01');
  const h = hook(page);
  await page.waitForFunction(() => window.__palintris?.levelId === 'w1-01');
  await dismissIntroIfVisible(page);
  await tap(page, await h.slot(2));
  await tap(page, await h.slot(3));
  await page.waitForFunction(() => window.__palintris?.view().solved);
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => window.__palintris?.view().solved)).toBe(true);
  expect(await h.busy()).toBe(true);
  await page.waitForFunction(() => window.__palintris?.renderedTiles().some((t) => t.alpha < 0.5));
  expect(await page.evaluate(() => window.__palintris?.renderedTiles().some((t) => t.alpha > 0.9))).toBe(true);
  await page.setViewportSize({ width: 320, height: 640 });
  await expect.poll(() => page.evaluate(() => {
    const h = window.__palintris;
    return h?.renderedTiles().every((t) => Math.abs(t.size - h.screenLayout().tile) < 0.01);
  })).toBe(true);
  await page.waitForFunction(() => window.__palintris?.renderedTiles().every((t) => t.alpha === 0));
  expect((await h.view()).solved).toBe(true);
  await page.waitForFunction(() => window.__palintris === undefined);
});

test('meny under seierssekvensen avbryter overgangen til resultatet', async ({ page }) => {
  await page.goto('/?level=w1-01');
  const h = hook(page);
  await page.waitForFunction(() => window.__palintris?.levelId === 'w1-01');
  await dismissIntroIfVisible(page);
  await tap(page, await h.slot(2));
  await tap(page, await h.slot(3));
  await page.waitForFunction(() => window.__palintris?.view().solved);
  await page.mouse.click(42, 30);
  await page.waitForFunction(() => window.__palintris === undefined);
  await page.waitForTimeout(3000);
  await page.mouse.click(195, 515);
  await page.mouse.click(39, 361);
  await page.waitForFunction(() => window.__palintris?.levelId === 'w1-01');
  expect((await h.view()).movesUsed).toBe(0);
});

test('redusert bevegelse toner ut uten å krympe brikkene', async ({ page }) => {
  const save = defaultSave();
  save.settings.reducedMotion = true;
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: SAVE_KEY, value: JSON.stringify(save) });
  await page.goto('/?level=w1-01');
  const h = hook(page);
  await page.waitForFunction(() => window.__palintris?.levelId === 'w1-01');
  await dismissIntroIfVisible(page);
  await tap(page, await h.slot(2));
  await tap(page, await h.slot(3));
  await page.waitForFunction(() => window.__palintris?.renderedTiles().some((t) => t.alpha < 1 && t.alpha > 0));
  expect(await page.evaluate(() => window.__palintris?.renderedTiles().every((t) => t.scaleY === 1))).toBe(true);
  await page.waitForFunction(() => window.__palintris === undefined);
});

test('tydelige trekk av gir en kortere seierssekvens', async ({ page }) => {
  const save = defaultSave();
  save.settings.clearAnimations = false;
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: SAVE_KEY, value: JSON.stringify(save) });
  await page.goto('/?level=w1-01');
  const h = hook(page);
  await page.waitForFunction(() => window.__palintris?.levelId === 'w1-01');
  await dismissIntroIfVisible(page);
  await tap(page, await h.slot(2));
  await tap(page, await h.slot(3));
  await page.waitForFunction(() => window.__palintris?.view().solved);
  await page.waitForFunction(() => window.__palintris === undefined, undefined, { timeout: 1800 });
});
