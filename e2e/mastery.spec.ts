import type Phaser from 'phaser';
import { expect, test, type Page } from '@playwright/test';
import { defaultSave, SAVE_KEY, type SaveData } from '../src/core/storage';
import { dismissIntroIfVisible, drag, hook, tap } from './helpers';
import { startJourney } from './menu-navigation';

const saved = (page: Page): Promise<SaveData> => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}') as SaveData, SAVE_KEY);
const elapsed = async (page: Page): Promise<number> => {
  const record = (await saved(page)).campaign?.firstAttempts['w1-01'];
  if (record === undefined) throw new Error('Førsteforsøk mangler');
  return record.activeMs;
};
const seed = async (page: Page, data: SaveData): Promise<void> => {
  await page.addInitScript(({ key, value }) => { if (localStorage.getItem(key) === null) localStorage.setItem(key, value); }, { key: SAVE_KEY, value: JSON.stringify(data) });
};
const enter = async (page: Page, id = 'w1-01'): Promise<void> => {
  await page.goto('/');
  await expect(page.getByRole('status')).toBeHidden();
  await startJourney(page);
  await page.waitForFunction((level) => window.__palintris?.levelId === level, id);
};

test('registrerer også det synkrone vinnertrekket i første reelle forsøk', async ({ page }) => {
  await page.clock.install();
  await enter(page);
  await dismissIntroIfVisible(page);
  const h = hook(page);
  await h.waitIdle();
  await drag(page, await h.slot(2), await h.slot(3));
  await expect.poll(async () => (await saved(page)).campaign?.firstAttempts['w1-01']?.end?.reason).toBe('solved');
  expect((await saved(page)).campaign?.firstAttempts['w1-01']?.movesMade).toBe(1);
});

test('reload etter trekk beholder ett nøytralt avbrutt førsteforsøk', async ({ page }) => {
  await page.clock.install();
  await seed(page, { ...defaultSave(), stars: { 'w1-01': { stars: 3, contentVersion: 1 }, 'w1-02': { stars: 3, contentVersion: 1 } } });
  await enter(page, 'w1-03');
  const h = hook(page);
  await h.waitIdle();
  await drag(page, await h.slot(1), await h.slot(2));
  await h.waitIdle();
  await expect.poll(async () => (await saved(page)).campaign?.firstAttempts['w1-03']?.movesMade).toBe(1);
  await enter(page, 'w1-03');
  expect((await saved(page)).campaign?.firstAttempts['w1-03']?.end?.reason).toBe('interrupted');
  expect(Object.keys((await saved(page)).campaign?.firstAttempts ?? {})).toEqual(['w1-03']);
});

test('intro og skjult fane teller ikke, synlig tenketid før første trekk teller', async ({ page }) => {
  await page.clock.install();
  await enter(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.clock.runFor(3000);
  expect((await saved(page)).campaign?.firstAttempts['w1-01']?.activeMs).toBe(0);
  await dismissIntroIfVisible(page);
  await page.clock.runFor(2200);
  const before = await elapsed(page);
  expect(before).toBeGreaterThan(1000);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  const hiddenAt = await elapsed(page);
  await page.clock.runFor(2500);
  expect(await elapsed(page)).toBe(hiddenAt);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.runFor(1200);
  const resumed = await elapsed(page);
  expect(resumed - hiddenAt).toBeGreaterThan(900);
  expect(resumed - hiddenAt).toBeLessThan(1400);
});

test('DEV-forhåndsvisning beholder QA-tilgang uten mestringssignaler', async ({ page }) => {
  await page.clock.install();
  await page.goto('/?level=w1-01');
  await page.waitForFunction(() => window.__palintris?.levelId === 'w1-01');
  await dismissIntroIfVisible(page);
  const h = hook(page);
  await h.waitIdle();
  await drag(page, await h.slot(2), await h.slot(3));
  await expect.poll(async () => (await saved(page)).stars?.['w1-01']?.stars).toBe(3);
  expect((await saved(page)).campaign).toBeUndefined();
});

test('bestått prøve fortsetter til neste intro uten falske repetisjonsstjerner', async ({ page }) => {
  await seed(page, { ...defaultSave(), stars: { 'w1-01': { stars: 3, contentVersion: 1 }, 'w1-15': { stars: 2, contentVersion: 1 } },
    campaign: { firstAttempts: {}, access: { offeredCheckpoints: ['w1-15'], masteredWorlds: [1] } } });
  await enter(page, 'w2-01');
  expect((await saved(page)).stars['w1-08']).toBeUndefined();
});

for (const viewport of [{ width: 360, height: 640 }, { width: 844, height: 390 }]) {
  test(`tilbud, prøve og bonuskart på ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.clock.install();
    const base = defaultSave();
    await seed(page, { ...base, settings: { ...base.settings, reducedMotion: true }, stars: {
      'w1-01': { stars: 3, contentVersion: 1 }, 'w1-02': { stars: 3, contentVersion: 1 },
    }, campaign: { firstAttempts: Object.fromEntries(['w1-01', 'w1-02'].map((id, index) => [id, { levelId: id, contentVersion: 1, ordinal: index + 1, activeMs: 1000, movesMade: 1, undoCount: 0, end: { reason: 'solved' as const, movesUsed: 1 } }])), access: { offeredCheckpoints: [], masteredWorlds: [] } } });
    await page.goto('/');
    await expect(page.getByRole('status')).toBeHidden();
    const { width: w, height: h } = viewport;
    const landscape = w > h;
    const buttonsX = landscape ? w / 2 + Math.min(170, w * 0.2) : w / 2;
    const buttonsTop = h * (landscape ? 0.39 : 0.66);
    await startJourney(page);
    await page.waitForFunction(() => window.__palintris?.levelId === 'w1-03');
    const first = hook(page);
    for (const [a, b] of [[1, 2], [0, 1]] as const) {
      await first.waitIdle();
      await drag(page, await first.slot(a), await first.slot(b));
    }
    await page.waitForFunction(() => window.__palintris === undefined);
    expect((await saved(page)).campaign?.access.offeredCheckpoints).toEqual(['w1-15']);
    await page.waitForTimeout(350);
    await page.screenshot({ path: `/tmp/palintris-mastery-visual/result-offer-${w}x${h}.png` });
    await page.mouse.click(buttonsX + 70, buttonsTop + 70);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.mouse.click(w / 2, h - 56);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.screenshot({ path: `/tmp/palintris-mastery-visual/offer-${w}x${h}.png` });
    await page.mouse.click(w * (landscape ? 0.27 : 0.5), landscape ? h * 0.86 : h * 0.68 - 197);
    await page.waitForFunction(() => window.__palintris?.levelId === 'w1-15');
    const board = hook(page);
    for (const [a, b] of [[0, 1], [3, 4], [2, 3]] as const) {
      await board.waitIdle();
      await drag(page, await board.slot(a), await board.slot(b));
    }
    await page.waitForFunction(() => window.__palintris === undefined);
    expect((await saved(page)).campaign?.access.masteredWorlds).toEqual([1]);
    expect((await saved(page)).stars['w1-08']).toBeUndefined();
    await page.waitForTimeout(350);
    await page.screenshot({ path: `/tmp/palintris-mastery-visual/passed-${w}x${h}.png` });
    await page.mouse.click(buttonsX + 70, buttonsTop + 70);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.screenshot({ path: `/tmp/palintris-mastery-visual/map-${w}x${h}.png` });
    await page.mouse.click(w / 2, h - 56);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await startJourney(page);
    await page.waitForFunction(() => window.__palintris?.levelId === 'w2-01');
  });
}

test('segmentvalg teller mens pause og trekkanimasjon står stille; pagehide lagrer resten', async ({ page }) => {
  await page.clock.install();
  const stars = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`w1-${String(i + 1).padStart(2, '0')}`, { stars: 1, contentVersion: 1 }]));
  await seed(page, { ...defaultSave(), stars: { ...stars, 'w2-01': { stars: 3, contentVersion: 1 } } });
  await page.goto('/');
  await expect(page.getByRole('status')).toBeHidden();
  // Capture the real scene on creation; no product-only test API or fake lifecycle.
  await page.evaluate(async () => {
    const path = '/src/scenes/BoardScene.ts';
    const { BoardScene } = await import(path) as { BoardScene: { prototype: { create: (this: Phaser.Scene) => void } } };
    const original = BoardScene.prototype.create;
    BoardScene.prototype.create = function (): void {
      (window as unknown as { testBoard: Phaser.Scene }).testBoard = this;
      BoardScene.prototype.create = original;
      original.call(this);
    };
  });
  await startJourney(page);
  await page.waitForFunction(() => window.__palintris?.levelId === 'w2-02');
  const h = hook(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.clock.runFor(100);
  await tap(page, await h.slot(0));
  await tap(page, await h.slot(2));
  expect(await h.menu()).not.toBeNull();
  const beforeMenu = await h.clockMs();
  await page.clock.runFor(400);
  expect(await h.clockMs()).toBeGreaterThan(beforeMenu + 300);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  expect((await saved(page)).campaign?.firstAttempts['w2-02']?.activeMs).toBeCloseTo(await h.clockMs(), 0);
  await page.evaluate(() => (window as unknown as { testBoard: Phaser.Scene }).testBoard.scene.pause());
  const pausedAt = await h.clockMs();
  await page.clock.runFor(600);
  expect(await h.clockMs()).toBe(pausedAt);
  await page.evaluate(() => (window as unknown as { testBoard: Phaser.Scene }).testBoard.scene.resume());
  await page.clock.runFor(100);
  const menu = await h.menu();
  const rotate = menu?.find((entry) => entry.action === 'rotateLeft');
  if (rotate === undefined) throw new Error('Rotasjonsmeny mangler');
  const beforeMove = await h.clockMs();
  await tap(page, rotate);
  expect(await h.busy()).toBe(true);
  await page.clock.runFor(100);
  expect(await h.clockMs()).toBe(beforeMove);
});

test('menyavslutning lagrer kort tenketid; seiersanimasjonen endrer ikke forsøket', async ({ page }) => {
  await page.clock.install();
  await enter(page);
  await dismissIntroIfVisible(page);
  const h = hook(page);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.clock.runFor(350);
  const beforeExit = await h.clockMs();
  expect(beforeExit).toBeGreaterThan(200);
  await page.mouse.click(42, 30);
  expect(await elapsed(page)).toBeCloseTo(beforeExit, 0);
  await page.clock.runFor(400);
  expect(await elapsed(page)).toBeCloseTo(beforeExit, 0);
  await startJourney(page);
  await page.clock.runFor(100);
  await page.waitForFunction(() => window.__palintris?.levelId === 'w1-01');
  await page.clock.resume();
  await h.waitIdle();
  await drag(page, await h.slot(2), await h.slot(3));
  const completed = (await saved(page)).campaign?.firstAttempts['w1-01'];
  expect(completed?.end?.reason).toBe('solved');
  await page.waitForFunction(() => window.__palintris === undefined);
  expect((await saved(page)).campaign?.firstAttempts['w1-01']).toEqual(completed);
});
