import { mkdir } from 'node:fs/promises';
import type Phaser from 'phaser';
import { expect, test, type Page } from '@playwright/test';
import { defaultSave, SAVE_KEY, type SaveData } from '../src/core/storage';
import { hook } from './helpers';
import { startJourney, waitForSceneFrame } from './menu-navigation';

type SceneWindow = Window & { progressScene: Phaser.Scene };
const star = { stars: 3, contentVersion: 1 };
const levelIds = (world: number, count: number): string[] => Array.from({ length: count }, (_, i) => `w${world}-${String(i + 1).padStart(2, '0')}`);

const texts = (page: Page): Promise<string[]> => page.evaluate(() => {
  const walk = (objects: Phaser.GameObjects.GameObject[]): string[] => objects.flatMap(object => {
    if ('visible' in object && object.visible === false) return [];
    if (object.type === 'Text') return [(object as Phaser.GameObjects.Text).text];
    return object.type === 'Container' ? walk((object as Phaser.GameObjects.Container).list) : [];
  });
  return walk((window as unknown as SceneWindow).progressScene.children.list);
});

for (const viewport of [{ width: 360, height: 640 }, { width: 844, height: 390 }]) {
  test(`w5-01-introen forklarer både joker og Fjern ved ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const base = defaultSave();
    const data: SaveData = {
      ...base,
      stars: Object.fromEntries([...[1, 2, 3, 4].flatMap(world => levelIds(world, 12)), 'journey-quota-01', 'journey-center-01'].map(id => [id, star])),
      introsSeen: ['w1-01', 'w2-01', 'w3-01', 'w4-01', 'journey-quota-01', 'journey-center-01'],
      settings: { ...base.settings, reducedMotion: true },
    };
    await page.addInitScript(({ key, value }) => {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    }, { key: SAVE_KEY, value: JSON.stringify(data) });
    await page.route('**/src/main.ts*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: `${await response.text()}\nObject.defineProperty(window, 'progressScene', { get: () => game.scene.getScenes(true).find(scene => scene.scene.key !== 'Boot') });` });
    });
    await page.goto('/');
    await expect(page.getByRole('status')).toBeHidden();
    await waitForSceneFrame(page);
    await startJourney(page);
    await page.waitForFunction(() => window.__palintris?.levelId === 'w5-01');
    await expect.poll(() => hook(page).introVisible()).toBe(true);
    await waitForSceneFrame(page);
    const directory = `/tmp/palintris-progresjon-${process.env['PALINTRIS_CAPTURE_PHASE'] ?? 'after'}`;
    await mkdir(directory, { recursive: true });
    await page.screenshot({ path: `${directory}/intro-w5-01-${viewport.width}x${viewport.height}.png`, scale: 'css' });
    expect((await texts(page)).some(text => text.includes('Fjern:'))).toBe(true);
  });
}
