import { readFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import type Phaser from 'phaser';
import { expect, test, type Page } from '@playwright/test';
import { defaultSave, SAVE_KEY, type SaveData } from '../src/core/storage';
import { rulesFor, type Level } from '../src/core/level';
import { solve } from '../src/core/solver';
import { drag, hook } from './helpers';
import { startJourney, waitForSceneFrame } from './menu-navigation';

type GlimtWindow = Window & { glimtScene: Phaser.Scene };
const campaign = JSON.parse(readFileSync('src/content/campaign.v1.json', 'utf8')) as { levels: Level[] };
const labels = (page: Page): Promise<Array<{ text: string; x: number; y: number; hitWidth: number; hitHeight: number }>> => page.evaluate(() => {
  const walk = (objects: Phaser.GameObjects.GameObject[]): Array<{ text: string; x: number; y: number; hitWidth: number; hitHeight: number }> => objects.flatMap(object => {
    if ('visible' in object && object.visible === false) return [];
    if (object.type === 'Text') {
      const label = object as Phaser.GameObjects.Text;
      const bounds = label.getBounds();
      const hit = label.parentContainer?.input?.hitArea as { width?: number; height?: number } | undefined;
      return [{ text: label.text, x: bounds.centerX, y: bounds.centerY, hitWidth: hit?.width ?? 0, hitHeight: hit?.height ?? 0 }];
    }
    return object.type === 'Container' ? walk((object as Phaser.GameObjects.Container).list) : [];
  });
  return walk((window as unknown as GlimtWindow).glimtScene.children.list);
});
const star = { stars: 3, contentVersion: 1 };
const levelIds = (world: number, count: number): string[] => Array.from({ length: count }, (_, i) => `w${world}-${String(i + 1).padStart(2, '0')}`);
const enterWithStars = async (page: Page, ids: readonly string[], expected: string, introsSeen: readonly string[] = ['w1-01', 'w2-01']): Promise<void> => {
  await page.clock.install();
  const base = defaultSave();
  const data: SaveData = { ...base, stars: Object.fromEntries(ids.map(id => [id, star])), introsSeen: [...introsSeen], settings: { ...base.settings, reducedMotion: true } };
  await page.addInitScript(({ key, value }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
  }, { key: SAVE_KEY, value: JSON.stringify(data) });
  await page.route('**/src/main.ts*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}\nObject.defineProperty(window, 'glimtScene', { get: () => game.scene.getScenes(true).find(scene => scene.scene.key !== 'Boot') });` });
  });
  await page.goto('/');
  await expect(page.getByRole('status')).toBeHidden();
  await waitForSceneFrame(page);
  await startJourney(page);
  await page.waitForFunction(id => window.__palintris?.levelId === id, expected);
  await hook(page).waitIdle();
};
const seedAndEnter = (page: Page, rotation: boolean | 'fresh'): Promise<void> => rotation === 'fresh' ? enterWithStars(page, [], 'w1-01')
  : rotation ? enterWithStars(page, [...levelIds(1, 12), 'w2-01'], 'w2-02') : enterWithStars(page, levelIds(1, 3), 'w1-04');
const hasMarks = (page: Page): Promise<boolean> => page.evaluate(() =>
  (window as unknown as GlimtWindow).glimtScene.children.getByName('speilglimt-marks') !== null);
const capture = async (page: Page, name: string): Promise<void> => {
  const directory = `/tmp/palintris-speilglimt-${process.env['PALINTRIS_CAPTURE_PHASE'] ?? 'after'}`;
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: `${directory}/${name}.png`, scale: 'css' });
};

const save = (page: Page): Promise<SaveData> => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}') as SaveData, SAVE_KEY);
const clickLabel = async (page: Page, prefix: string): Promise<void> => {
  const target = (await labels(page)).find(entry => entry.text.startsWith(prefix));
  if (target === undefined) throw new Error(`Missing label: ${prefix}`);
  await page.mouse.click(target.x, target.y);
  await waitForSceneFrame(page);
};
const solveSwapBoard = async (page: Page, id: string): Promise<void> => {
  const level = campaign.levels.find(l => l.id === id);
  if (level === undefined) throw new Error(id);
  const board = hook(page);
  for (let n = 0; n < level.budget; n++) {
    await board.waitIdle();
    const view = await board.view();
    const result = solve({ rules: rulesFor(level), tiles: view.tiles, hand: view.hand, maxMoves: view.budgetLeft, limits: { states: 50000 }, includeFirstMove: true });
    if (result.status !== 'solved' || result.firstMove?.type !== 'swap') throw new Error(`Missing swap for ${id}`);
    await drag(page, await board.slot(result.firstMove.a), await board.slot(result.firstMove.b));
    if (result.moves === 1) break;
  }
  await expect.poll(async () => (await labels(page)).map(entry => entry.text)).toContain('Spill igjen');
  await page.clock.runFor(600);
};

test('tre ekte seire tjener glimt; hjelp vises uten trekk og bevares etter resize og reload', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 500 });
  await seedAndEnter(page, 'fresh');
  expect((await labels(page)).some(label => label.text.startsWith('Speilglimt'))).toBe(false);
  for (const id of ['w1-01', 'w1-02', 'w1-03']) {
    await solveSwapBoard(page, id);
    if (id === 'w1-03') expect((await labels(page)).some(entry => entry.text.startsWith('Speilglimt · 1'))).toBe(true);
    await clickLabel(page, 'Neste speil');
    await hook(page).waitIdle();
  }
  await page.waitForFunction(() => window.__palintris?.levelId === 'w1-04');
  await expect.poll(async () => (await hook(page).view()).solveStatus.kind).toBe('known');
  const before = await hook(page).state();
  await clickLabel(page, 'Speilglimt');
  expect((await save(page)).tools?.speilglimtSpent).toBe(1);
  expect(await hook(page).state()).toEqual(before);
  expect((await labels(page)).map(entry => entry.text)).toContain('Bytt de to markerte brikkene.');
  await clickLabel(page, 'Speilglimt');
  await page.setViewportSize({ width: 844, height: 390 });
  await waitForSceneFrame(page);
  await clickLabel(page, 'Speilglimt');
  expect((await save(page)).tools?.speilglimtSpent).toBe(1);
  expect(await hook(page).state()).toEqual(before);
  await mkdir('/tmp/palintris-speilglimt-after', { recursive: true });
  await page.screenshot({ path: '/tmp/palintris-speilglimt-after/paid-hint-844x390.png', scale: 'css' });
  await solveSwapBoard(page, 'w1-04');
  expect((await labels(page)).some(entry => entry.text.includes('løst med hjelp'))).toBe(true);
  expect((await save(page)).campaign?.firstAttempts['w1-04']?.assisted).toBe(true);
  await page.screenshot({ path: '/tmp/palintris-speilglimt-after/assisted-result-844x390.png', scale: 'css' });
  await page.reload();
  await expect(page.getByRole('status')).toBeHidden();
  expect((await save(page)).tools?.speilglimtSpent).toBe(1);
  expect((await save(page)).campaign?.firstAttempts['w1-04']?.assisted).toBe(true);
});

test('skrivefeil bruker ikke glimt eller viser betalt hint; neste forsøk virker', async ({ page }) => {
  await seedAndEnter(page, false);
  await expect.poll(async () => (await hook(page).view()).solveStatus.kind).toBe('known');
  const before = await save(page);
  await page.evaluate(() => {
    const original = Object.getOwnPropertyDescriptor(Storage.prototype, 'setItem');
    if (original === undefined) throw new Error('Storage.setItem mangler');
    Object.defineProperty(window, 'restoreGlimtStorage', { value: (): void => { Object.defineProperty(Storage.prototype, 'setItem', original); } });
    Storage.prototype.setItem = (): void => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); };
  });
  await clickLabel(page, 'Speilglimt');
  expect((await save(page)).tools).toEqual(before.tools);
  expect((await labels(page)).map(entry => entry.text)).not.toContain('Bytt de to markerte brikkene.');
  await page.evaluate(() => (window as unknown as { restoreGlimtStorage(): void }).restoreGlimtStorage());
  await clickLabel(page, 'Speilglimt');
  expect((await save(page)).tools?.speilglimtSpent).toBe(1);
  expect((await labels(page)).map(entry => entry.text)).toContain('Bytt de to markerte brikkene.');
});

for (const viewport of [{ width: 360, height: 640 }, { width: 360, height: 500 }, { width: 844, height: 390 }]) {
  for (const rotation of [false, true]) test(`Speilglimt har plass ved ${viewport.width}x${viewport.height} rotasjon=${rotation}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await seedAndEnter(page, rotation);
    const directory = `/tmp/palintris-speilglimt-${process.env['PALINTRIS_CAPTURE_PHASE'] ?? 'after'}`;
    await mkdir(directory, { recursive: true });
    await page.screenshot({ path: `${directory}/board-${viewport.width}x${viewport.height}-${rotation ? 'rotate' : 'swap'}.png`, scale: 'css' });
    const glimt = (await labels(page)).find(label => label.text.startsWith('Speilglimt'));
    expect(glimt).toBeDefined();
    expect(glimt?.hitWidth).toBeGreaterThanOrEqual(44);
    expect(glimt?.hitHeight).toBeGreaterThanOrEqual(44);
    if (glimt === undefined) throw new Error('Missing Speilglimt');
    expect(glimt.x).toBeGreaterThanOrEqual(glimt.hitWidth / 2);
    expect(glimt.x).toBeLessThanOrEqual(viewport.width - glimt.hitWidth / 2);
    expect(glimt.y).toBeGreaterThanOrEqual(glimt.hitHeight / 2);
    expect(glimt.y).toBeLessThanOrEqual(viewport.height - glimt.hitHeight / 2);
  });
}

test('reset på urørt brett beholder betalt glimt; et ekte trekk fjerner markeringen', async ({ page }) => {
  await seedAndEnter(page, false);
  await expect.poll(async () => (await hook(page).view()).solveStatus.kind).toBe('known');
  await clickLabel(page, 'Speilglimt');
  expect(await hasMarks(page)).toBe(true);
  await clickLabel(page, 'Reset');
  expect(await hasMarks(page)).toBe(true);
  await clickLabel(page, 'Speilglimt');
  expect((await save(page)).tools?.speilglimtSpent).toBe(1);
  const view = await hook(page).view();
  const level = campaign.levels.find(l => l.id === 'w1-04');
  if (level === undefined) throw new Error('w1-04');
  const other = solve({ rules: rulesFor(level), tiles: view.tiles, hand: view.hand, maxMoves: view.budgetLeft, limits: { states: 50000 }, includeFirstMove: true });
  if (other.status !== 'solved' || other.firstMove?.type !== 'swap') throw new Error('Mangler bytte');
  await drag(page, await hook(page).slot(other.firstMove.a), await hook(page).slot(other.firstMove.b));
  await expect.poll(() => hasMarks(page)).toBe(false);
});

const w5Stars = [...[1, 2, 3, 4].flatMap(world => levelIds(world, 12)), 'w5-01', 'w5-02', 'journey-quota-01', 'journey-center-01'];
const allIntros = ['w1-01', 'w2-01', 'w3-01', 'w4-01', 'w5-01', 'w5-02', 'journey-quota-01', 'journey-center-01'];

test('hånd med joker og fjern har lesbar glimtknapp og hint ved 360x500', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 500 });
  await enterWithStars(page, w5Stars, 'w5-03', allIntros);
  await expect.poll(async () => (await hook(page).view()).solveStatus.kind).toBe('known');
  await capture(page, 'hand-w5-360x500');
  const texts = (await labels(page)).map(entry => entry.text);
  expect(texts.some(text => text.startsWith('Joker'))).toBe(true);
  expect(texts.some(text => text.startsWith('Fjern'))).toBe(true);
  const scale = await page.evaluate(() => {
    const walk = (objects: Phaser.GameObjects.GameObject[]): number[] => objects.flatMap(object => object.type === 'Text' && (object as Phaser.GameObjects.Text).text.startsWith('Vis neste trekk')
      ? [(object as Phaser.GameObjects.Text).scaleX] : object.type === 'Container' ? walk((object as Phaser.GameObjects.Container).list) : []);
    return walk((window as unknown as GlimtWindow).glimtScene.children.list);
  });
  expect(scale).toEqual([1]);
  await clickLabel(page, 'Speilglimt');
  expect(await hasMarks(page)).toBe(true);
  await capture(page, 'hint-w5-360x500');
});

for (const viewport of [{ width: 360, height: 640 }, { width: 844, height: 390 }]) {
  test(`verdensåpning vises sammen med glimt ved ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await enterWithStars(page, levelIds(1, 11), 'w1-12');
    await solveSwapBoard(page, 'w1-12');
    const texts = (await labels(page)).map(entry => entry.text);
    expect(texts).toContain('Verden 2 låst opp!');
    expect(texts.some(text => text.startsWith('Speilglimt · 4'))).toBe(true);
    await capture(page, `result-unlock-${viewport.width}x${viewport.height}`);
  });
}
