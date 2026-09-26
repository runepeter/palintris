import { mkdir } from 'node:fs/promises';
import type Phaser from 'phaser';
import { expect, test, type Page } from '@playwright/test';
import { defaultSave, SAVE_KEY } from '../src/core/storage';
import { drag, hook } from './helpers';
import { waitForSceneFrame } from './menu-navigation';

type FeedbackWindow = Window & { feedbackScene: Phaser.Scene };
const texts = (page: Page): Promise<Array<{ text: string; x: number; y: number }>> => page.evaluate(() => {
  const walk = (objects: Phaser.GameObjects.GameObject[]): Array<{ text: string; x: number; y: number }> => objects.flatMap(object => {
    if ('visible' in object && object.visible === false) return [];
    if (object.type === 'Text') {
      const label = object as Phaser.GameObjects.Text;
      const bounds = label.getBounds();
      return [{ text: label.text, x: bounds.centerX, y: bounds.centerY }];
    }
    return object.type === 'Container' ? walk((object as Phaser.GameObjects.Container).list) : [];
  });
  return walk((window as unknown as FeedbackWindow).feedbackScene.children.list);
});
const clickLabel = async (page: Page, label: string): Promise<void> => {
  const target = (await texts(page)).find(entry => entry.text === label);
  if (target === undefined) throw new Error(`Missing label: ${label}`);
  await page.mouse.click(target.x, target.y);
  await waitForSceneFrame(page);
};
const enter = async (page: Page, legacy: boolean): Promise<void> => {
  await page.clock.install();
  const data = defaultSave();
  const stars = legacy ? Object.fromEntries(Array.from({ length: 15 }, (_, n) => [`w1-${String(n + 1).padStart(2, '0')}`, { stars: 3, contentVersion: 1 }])) : {};
  await page.addInitScript(({ key, value }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
  }, { key: SAVE_KEY, value: JSON.stringify({ ...data, stars, introsSeen: ['w1-01'], settings: { ...data.settings, reducedMotion: true } }) });
  await page.route('**/src/main.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}\nObject.defineProperty(window, 'feedbackScene', { get: () => game.scene.getScenes(true).find(scene => scene.scene.key !== 'Boot') });` });
  });
  await page.goto('/');
  await expect(page.getByRole('status')).toBeHidden();
  await waitForSceneFrame(page);
  if (legacy) {
    await clickLabel(page, 'Kart');
    await clickLabel(page, '◀');
    await clickLabel(page, '1');
  } else await clickLabel(page, 'Start reisen  →');
  await page.waitForFunction(() => window.__palintris?.levelId === 'w1-01');
  const board = hook(page);
  await board.waitIdle();
  await drag(page, await board.slot(2), await board.slot(3));
  await expect.poll(async () => (await texts(page)).map(entry => entry.text)).toContain('Spill igjen');
  await page.clock.runFor(600);
};

for (const viewport of [{ width: 360, height: 640 }, { width: 844, height: 390 }]) test(`gammel løst verden lover ikke nye førsteforsøk ${viewport.width}`, async ({ page }) => {
  await page.setViewportSize(viewport);
  await enter(page, true);
  const directory = `/tmp/palintris-mastery-feedback-${process.env['PALINTRIS_CAPTURE_PHASE'] ?? 'after'}`;
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: `${directory}/legacy-result-${viewport.width}.png`, scale: 'css' });
  expect((await texts(page)).map(entry => entry.text).filter(text => text.includes('sterke forsøk'))).toEqual([]);
  await clickLabel(page, 'Neste speil  →');
  await page.waitForFunction(() => window.__palintris?.levelId === 'w2-01');
});

test('ny spiller ser fortsatt opptjeningen mot mestringsprøven', async ({ page }) => {
  await enter(page, false);
  expect((await texts(page)).map(entry => entry.text)).toContain('1/3 sterke forsøk mot mestringsprøven');
});
