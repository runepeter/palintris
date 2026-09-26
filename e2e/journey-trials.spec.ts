import { mkdir } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import type Phaser from 'phaser';
import { defaultSave, SAVE_KEY, type SaveData } from '../src/core/storage';
import { drag, hook, tap } from './helpers';
import { startJourney, waitForSceneFrame } from './menu-navigation';

type TrialWindow = Window & { trialScene: Phaser.Scene };
const setup = async (page: Page, quotaDone = false, activeWorld = false): Promise<void> => {
  await page.clock.install();
  const data = defaultSave();
  const stars = { ...data.stars };
  for (let w = 1; w <= 6; w++) for (let n = 1; n <= 15; n++) if (!activeWorld || w !== 2 || n <= 12) stars[`w${w}-${String(n).padStart(2, '0')}`] = { stars: 3, contentVersion: 1 };
  if (quotaDone) stars['journey-quota-01'] = { stars: 3, contentVersion: 1 };
  await page.addInitScript(({ key, value }) => {
    if (sessionStorage.getItem('trials-fixture') !== null) return;
    localStorage.setItem(key, value);
    sessionStorage.setItem('trials-fixture', '1');
  }, { key: SAVE_KEY, value: JSON.stringify({ ...data, stars, introsSeen: ['journey-quota-01', 'journey-quota-02', 'journey-center-01'], settings: { ...data.settings, reducedMotion: !activeWorld } }) });
  await page.route('**/src/main.ts*', async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    await route.fulfill({ response, body: `${body}\nObject.defineProperty(window, 'trialScene', { get: () => game.scene.getScenes(true).find(scene => scene.scene.key !== 'Boot') });` });
  });
  await page.goto('/');
  await instrument(page);
};
const instrument = async (page: Page): Promise<void> => {
  await expect(page.getByRole('status')).toBeHidden();
  await waitForSceneFrame(page);
};
const labels = (page: Page): Promise<string[]> => page.evaluate(() => {
  const walk = (objects: Phaser.GameObjects.GameObject[]): string[] => objects.flatMap((object) => {
    if (!('visible' in object) || object.visible === false) return [];
    if (object.type === 'Text') return [(object as Phaser.GameObjects.Text).text];
    if (object.type === 'Container') return walk((object as Phaser.GameObjects.Container).list);
    return [];
  });
  return walk((window as unknown as TrialWindow).trialScene.children.list);
});
const clickText = async (page: Page, text: string): Promise<void> => {
  await waitForSceneFrame(page);
  const point = await page.evaluate((label) => {
    const walk = (objects: Phaser.GameObjects.GameObject[]): Phaser.GameObjects.Text | undefined => {
      for (const object of objects) {
        if ('visible' in object && object.visible === false) continue;
        if (object.type === 'Text' && (object as Phaser.GameObjects.Text).text === label) return object as Phaser.GameObjects.Text;
        if (object.type === 'Container') { const found = walk((object as Phaser.GameObjects.Container).list); if (found !== undefined) return found; }
      }
      return undefined;
    };
    const found = walk((window as unknown as TrialWindow).trialScene.children.list);
    if (found === undefined) throw new Error(`Missing text ${label}`);
    const bounds = found.getBounds();
    return { x: bounds.centerX, y: bounds.centerY };
  }, text);
  await page.mouse.click(point.x, point.y);
  await waitForSceneFrame(page);
};
const openMap = async (page: Page, world: number): Promise<void> => {
  const v = page.viewportSize();
  if (v === null) throw new Error('No viewport');
  const wide = v.height < 560 && v.width > v.height * 1.25;
  const width = wide ? Math.min(320, v.width * .42) : Math.min(v.width - 40, 344);
  await page.mouse.click(v.width * (wide ? .72 : .5) - (width + 12) / 4, wide ? v.height * .9 : v.height * .68 + 137);
  await waitForSceneFrame(page);
  for (let w = 6; w > world; w--) await clickText(page, '◀');
};
const tileLabels = (page: Page, id: number): Promise<string[]> => page.evaluate((tileId) => {
  const tile = (window as unknown as TrialWindow).trialScene.children.list.find((child) => 'tileId' in child && child.tileId === tileId) as Phaser.GameObjects.Container | undefined;
  return tile?.list.filter((child) => child.type === 'Text' && (child as Phaser.GameObjects.Text).visible)
    .map((child) => (child as Phaser.GameObjects.Text).text) ?? [];
}, id);
const saved = (page: Page): Promise<SaveData> => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}') as SaveData, SAVE_KEY);
const swap = async (page: Page, a: number, b: number): Promise<void> => {
  const h = hook(page);
  await h.waitIdle();
  await drag(page, await h.slot(a), await h.slot(b));
};
const result = async (page: Page): Promise<void> => {
  await expect.poll(() => labels(page)).toContain('Spill igjen');
  await page.clock.runFor(600);
};
const screenshot = async (page: Page, name: string): Promise<void> => {
  await mkdir('/tmp/palintris-trials-after', { recursive: true });
  await page.screenshot({ path: `/tmp/palintris-trials-after/${name}.png`, scale: 'css' });
};

for (const viewport of [{ width: 360, height: 640 }, { width: 844, height: 390 }]) test(`kart viser avgrenset bonuspanel ${viewport.width}`, async ({ page }) => {
  await page.setViewportSize(viewport);
  await setup(page, true);
  await openMap(page, 2);
  await mkdir('/tmp/palintris-trials-before', { recursive: true });
  // Behold førbildene når senere grønne kjøringer har bonusinngangen.
  if (!(await labels(page)).includes('Bonusbrett')) await page.screenshot({ path: `/tmp/palintris-trials-before/map-${viewport.width}.png`, scale: 'css' });
  expect(await labels(page)).toContain('Bonusbrett');
  const nodes = await page.evaluate(() => (window as unknown as TrialWindow).trialScene.children.list.filter((child) => child.type === 'Container')
    .map((child) => child as Phaser.GameObjects.Container).filter((child) => child.list.some((part) => part.type === 'Text' && /^\d+$/.test((part as Phaser.GameObjects.Text).text)))
    .map((child) => ({ x: child.x, y: child.y, width: child.width, height: child.height })));
  expect(nodes).toHaveLength(15);
  for (const [i, node] of nodes.entries()) {
    expect(node.width).toBeGreaterThanOrEqual(44); expect(node.height).toBeGreaterThanOrEqual(44);
    expect(node.y + node.height / 2).toBeLessThan(viewport.height - 134);
    for (const other of nodes.slice(i + 1)) expect(Math.abs(node.x - other.x) >= (node.width + other.width) / 2 || Math.abs(node.y - other.y) >= (node.height + other.height) / 2).toBe(true);
  }
  await screenshot(page, `map-${viewport.width}`);
  await clickText(page, 'Bonusbrett');
  expect(await labels(page)).toContain('To flytt');
  expect(await labels(page)).toContain('Spar flyttene');
  expect(await labels(page)).not.toContain('15');
  await screenshot(page, `bonus-panel-${viewport.width}`);
  await clickText(page, 'Spar flyttene');
  await page.waitForFunction(() => window.__palintris?.levelId === 'journey-quota-02');
  expect(await labels(page)).toContain('Spar flyttene');
});

test('kvote følger brikkeidentitet gjennom flytt, angre, reset og felle', async ({ page }) => {
  await setup(page);
  await startJourney(page);
  await page.waitForFunction(() => window.__palintris?.levelId === 'journey-quota-01');
  expect(await labels(page)).toContain('To flytt');
  expect(await tileLabels(page, 2)).toContain('2');
  await screenshot(page, 'quota-2');
  await swap(page, 1, 2);
  expect((await hook(page).view()).tiles.find((t) => t.id === 2)?.movesLeft).toBe(1);
  expect(await tileLabels(page, 2)).toContain('1');
  await hook(page).waitIdle();
  await screenshot(page, 'quota-1');
  await hook(page).waitIdle();
  await tap(page, (await hook(page).zones()).undo);
  await hook(page).waitIdle();
  expect((await hook(page).view()).tiles.find((t) => t.id === 2)?.movesLeft).toBe(2);
  await swap(page, 1, 2);
  await swap(page, 1, 2);
  await hook(page).waitIdle();
  expect((await hook(page).view()).tiles.find((t) => t.id === 2)?.movesLeft).toBe(0);
  expect(await tileLabels(page, 2)).toContain('0');
  expect(await hook(page).bannerVisible()).toBe(true);
  expect((await labels(page)).filter((text) => text.startsWith('Harmoni +'))).toEqual([]);
  await screenshot(page, 'quota-trap');
  await swap(page, 1, 2);
  expect((await hook(page).view()).movesUsed).toBe(2);
  await tap(page, (await hook(page).zones()).reset);
  await hook(page).waitIdle();
  expect((await hook(page).view()).tiles.find((t) => t.id === 2)?.movesLeft).toBe(2);
  await swap(page, 1, 2);
  await swap(page, 0, 1);
  await result(page);
  expect((await saved(page)).stars['journey-quota-01']?.stars).toBe(3);
  expect(await labels(page)).toContain('Øv mer: Spar flyttene');
});

for (const viewport of [{ width: 360, height: 640 }, { width: 844, height: 390 }]) test(`midtbonus er frivillig og bevares ${viewport.width}`, async ({ page }) => {
  await page.setViewportSize(viewport);
  await setup(page, true);
  await startJourney(page);
  await page.waitForFunction(() => window.__palintris?.levelId === 'journey-center-01');
  expect(await labels(page)).toContain('Din midtbrikke');
  expect((await labels(page)).some((text) => text.includes('Valgfri bonus'))).toBe(true);
  expect(await tileLabels(page, 0)).toContain('◆');
  expect(await tileLabels(page, 1)).not.toContain('◆');
  await screenshot(page, `center-start-${viewport.width}`);
  await swap(page, 1, 2); await swap(page, 0, 1); await result(page);
  expect((await saved(page)).journeyBadges ?? []).not.toContain('journey-center-01');
  expect((await labels(page)).some((text) => text.includes('Prøv med ◆ i midten'))).toBe(true);
  await screenshot(page, `center-normal-${viewport.width}`);
  await clickText(page, 'Spill igjen');
  await page.waitForFunction(() => window.__palintris?.levelId === 'journey-center-01');
  await swap(page, 0, 1); await swap(page, 1, 2); await swap(page, 0, 1); await result(page);
  expect((await saved(page)).journeyBadges).toContain('journey-center-01');
  expect((await labels(page)).some((text) => text.includes('MIDTBONUS'))).toBe(true);
  expect(await labels(page)).toContain('3 trekk  ·  bonusmål 3');
  expect(await labels(page)).toContain('Perfekt harmoni');
  await screenshot(page, `center-bonus-${viewport.width}`);
  await clickText(page, 'Spill igjen');
  await page.waitForFunction(() => window.__palintris?.levelId === 'journey-center-01');
  await swap(page, 1, 2); await swap(page, 0, 1); await result(page);
  expect((await saved(page)).journeyBadges).toContain('journey-center-01');
  await page.reload(); await instrument(page); await openMap(page, 3); await clickText(page, 'Bonusbrett');
  expect((await labels(page)).some((text) => text.includes('MIDTBONUS'))).toBe(true);
  await screenshot(page, `center-badge-reload-${viewport.width}`);
});

test('tom kvote avviser flytt med norsk hint mens andre brikker kan løse brettet', async ({ page }) => {
  await setup(page, true); await openMap(page, 2); await clickText(page, 'Bonusbrett'); await clickText(page, 'Spar flyttene');
  await page.waitForFunction(() => window.__palintris?.levelId === 'journey-quota-02');
  await swap(page, 0, 1); await swap(page, 1, 2); await hook(page).waitIdle();
  expect((await hook(page).view()).tiles.find((tile) => tile.id === 0)?.movesLeft).toBe(0);
  expect(await hook(page).bannerVisible()).toBe(false);
  await swap(page, 1, 2);
  expect((await hook(page).view()).movesUsed).toBe(2);
  expect(await labels(page)).toContain('Denne brikken har ingen flytt igjen');
  await screenshot(page, 'quota-empty-hint');
  await swap(page, 0, 1); await result(page);
  expect((await saved(page)).stars['journey-quota-02']?.stars).toBe(3);
});


test('kartets pulsering ryddes når bonuspanelet åpnes gjentatte ganger', async ({ page }) => {
  await setup(page, false, true); await openMap(page, 2);
  const tweenCount = (): Promise<number> => page.evaluate(() => (window as unknown as TrialWindow).trialScene.tweens.getTweens().length);
  await page.clock.runFor(600);
  expect(await tweenCount()).toBe(1);
  for (let i = 0; i < 3; i++) {
    await clickText(page, 'Bonusbrett'); await page.clock.runFor(600);
    expect(await tweenCount()).toBe(0);
    await clickText(page, 'Tilbake til kartet'); await page.clock.runFor(600);
    expect(await tweenCount()).toBe(1);
  }
});
