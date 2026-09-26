import { readFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import type Phaser from 'phaser';
import { expect, test, type Page } from '@playwright/test';
import { rulesFor, type Level } from '../src/core/level';
import { solve } from '../src/core/solver';
import { defaultSave, SAVE_KEY, type SaveData } from '../src/core/storage';
import { drag, hook } from './helpers';
import { startJourney, waitForSceneFrame } from './menu-navigation';

type SceneWindow = Window & { progressScene: Phaser.Scene };
const campaign = JSON.parse(readFileSync('src/content/campaign.v1.json', 'utf8')) as { levels: Level[] };
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

const enter = async (page: Page, stars: readonly string[], introsSeen: readonly string[], expected: string): Promise<void> => {
  const base = defaultSave();
  const data: SaveData = { ...base, stars: Object.fromEntries(stars.map(id => [id, star])), introsSeen: [...introsSeen], settings: { ...base.settings, reducedMotion: true } };
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
  await page.waitForFunction(id => window.__palintris?.levelId === id, expected);
};

const capture = async (page: Page, name: string): Promise<void> => {
  const directory = `/tmp/palintris-progresjon-${process.env['PALINTRIS_CAPTURE_PHASE'] ?? 'after'}`;
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: `${directory}/${name}.png`, scale: 'css' });
};

for (const viewport of [{ width: 360, height: 640 }, { width: 844, height: 390 }]) {
  test(`w5-01-introen forklarer både joker og Fjern ved ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await enter(page, [...[1, 2, 3, 4].flatMap(world => levelIds(world, 12)), 'journey-quota-01', 'journey-center-01'],
      ['w1-01', 'w2-01', 'w3-01', 'w4-01', 'journey-quota-01', 'journey-center-01'], 'w5-01');
    await expect.poll(() => hook(page).introVisible()).toBe(true);
    await waitForSceneFrame(page);
    await capture(page, `intro-w5-01-${viewport.width}x${viewport.height}`);
    const shown = await texts(page);
    expect(shown.some(text => text.includes('Fjern') && !text.startsWith('Fjern ×'))).toBe(true);
    expect(shown.filter(text => text.endsWith('…'))).toEqual([]);
  });

  test(`resultatet forklarer et sterkt førsteforsøk ved ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.clock.install();
    await enter(page, levelIds(1, 3), ['w1-01'], 'w1-04');
    const level = campaign.levels.find(l => l.id === 'w1-04');
    if (level === undefined) throw new Error('w1-04');
    const board = hook(page);
    for (let n = 0; n < level.budget; n++) {
      await board.waitIdle();
      const view = await board.view();
      const result = solve({ rules: rulesFor(level), tiles: view.tiles, hand: view.hand, maxMoves: view.budgetLeft, limits: { states: 50000 }, includeFirstMove: true });
      if (result.status !== 'solved' || result.firstMove?.type !== 'swap') throw new Error('Mangler bytte');
      await drag(page, await board.slot(result.firstMove.a), await board.slot(result.firstMove.b));
      if (result.moves === 1) break;
    }
    await expect.poll(() => texts(page)).toContain('Spill igjen');
    await page.clock.runFor(600);
    await waitForSceneFrame(page);
    await capture(page, `result-strong-${viewport.width}x${viewport.height}`);
    expect(await texts(page)).toContain('✓ Sterkt forsøk: på mål uten angre');
  });
}

const clickText = async (page: Page, text: string): Promise<void> => {
  const point = await page.evaluate(wanted => {
    const walk = (objects: Phaser.GameObjects.GameObject[]): { x: number; y: number }[] => objects.flatMap(object => {
      if ('visible' in object && object.visible === false) return [];
      if (object.type === 'Text' && (object as Phaser.GameObjects.Text).text === wanted) {
        const bounds = (object as Phaser.GameObjects.Text).getBounds();
        return [{ x: bounds.centerX, y: bounds.centerY }];
      }
      return object.type === 'Container' ? walk((object as Phaser.GameObjects.Container).list) : [];
    });
    return walk((window as unknown as SceneWindow).progressScene.children.list)[0] ?? null;
  }, text);
  if (point === null) throw new Error(`Mangler tekst: ${text}`);
  await page.mouse.click(point.x, point.y);
  await waitForSceneFrame(page);
};

for (const viewport of [{ width: 360, height: 640 }, { width: 360, height: 500 }, { width: 844, height: 390 }]) {
  test(`hjelpeknappen viser brettets verktøy og merkes ikke som sett ved ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await enter(page, [...levelIds(1, 12), 'w2-01'], ['w1-01', 'w2-01'], 'w2-02');
    await hook(page).waitIdle();
    await capture(page, `board-w2-02-${viewport.width}x${viewport.height}`);
    expect(await hook(page).introVisible()).toBe(false);
    await clickText(page, '?');
    await expect.poll(() => hook(page).introVisible()).toBe(true);
    const shown = await texts(page);
    expect(shown).toContain('Slik spiller du');
    expect(shown.some(text => text.includes('hold og dra'))).toBe(true);
    expect(shown.filter(text => text.endsWith('…'))).toEqual([]);
    await capture(page, `help-w2-02-${viewport.width}x${viewport.height}`);
    await clickText(page, 'Skjønner');
    await expect.poll(() => hook(page).introVisible()).toBe(false);
    const save = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}') as SaveData, SAVE_KEY);
    expect(save.introsSeen).not.toContain('help');
  });
}
