import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { dismissIntroIfVisible, drag, hook, pauseAnimationClock, tap } from './helpers';

type Cmd =
  | { type: 'swap'; a: number; b: number }
  | { type: 'rotate'; from: number; to: number; dir: 'left' | 'right' }
  | { type: 'mirror'; from: number; to: number }
  | { type: 'insertWild'; at: number }
  | { type: 'remove'; tileId: number };

interface Level { id: string; solution: Cmd[]; tiles: { id: number }[] }

const LEVEL_ID = 'w3-02';
const campaign = JSON.parse(readFileSync('src/content/campaign.v1.json', 'utf8')) as { levels: Level[] };
const level = campaign.levels.find((l) => l.id === LEVEL_ID);
if (level === undefined) throw new Error(`fant ikke ${LEVEL_ID}`);

const perform = async (page: Page, cmd: Cmd): Promise<void> => {
  const h = hook(page);
  await h.waitIdle();
  if (cmd.type === 'swap') {
    await drag(page, await h.slot(cmd.a), await h.slot(cmd.b));
    return;
  }
  if (cmd.type === 'rotate' && cmd.to - cmd.from === 1) {
    await drag(page, await h.slot(cmd.from), await h.slot(cmd.to));
    return;
  }
  if (cmd.type === 'rotate' || cmd.type === 'mirror') {
    await tap(page, await h.slot(cmd.from));
    await tap(page, await h.slot(cmd.to));
    const menu = await h.menu();
    if (menu === null) throw new Error('segmentmeny åpnet ikke');
    const action = cmd.type === 'mirror' ? 'mirror' : cmd.dir === 'left' ? 'rotateLeft' : 'rotateRight';
    const btn = menu.find((m) => m.action === action);
    if (btn === undefined) throw new Error(`meny mangler handling ${action}`);
    await tap(page, btn);
    return;
  }
  throw new Error(`w3-02 skal ikke ha hånd-trekk: ${cmd.type}`);
};

test('løser et hårnålnivå med drag og trykk, angrer underveis, får stjerner', async ({ page }) => {
  await page.clock.install();
  await page.goto(`/?level=${LEVEL_ID}`);
  const h = hook(page);
  await page.waitForFunction(() => window.__palintris?.levelId === 'w3-02');
  await h.waitIdle();
  const start = await h.view();
  expect(start.tiles.length).toBeGreaterThanOrEqual(7);
  expect(start.solved).toBe(false);

  const [first, ...rest] = level.solution;
  if (first === undefined) throw new Error(`${LEVEL_ID} har ingen løsningssteg`);
  await perform(page, first);
  await h.waitIdle();
  expect((await h.view()).movesUsed).toBe(1);

  await tap(page, (await h.zones()).undo);
  await h.waitIdle();
  expect((await h.view()).movesUsed).toBe(0);

  await perform(page, first);
  for (const cmd of rest) await perform(page, cmd);
  await page.waitForFunction(() => window.__palintris?.view().solved === true, undefined, { timeout: 15_000 });
  const done = await h.view();
  expect(done.stars).toBeGreaterThanOrEqual(1);
  expect(done.movesUsed).toBe(level.solution.length);
});

test('første trekk fyller harmonimåleren og bygger flyt', async ({ page }) => {
  await page.clock.install();
  await page.goto('/?level=w1-01');
  const h = hook(page);
  await page.waitForFunction(() => window.__palintris?.levelId === 'w1-01');
  await dismissIntroIfVisible(page);
  await h.waitIdle();
  expect(await h.feedback()).toEqual({ matched: 0, total: 2, gained: 0, flow: 0 });

  await drag(page, await h.slot(2), await h.slot(3));
  await page.waitForFunction(() => window.__palintris?.feedback().matched === 2);
  expect(await h.feedback()).toEqual({ matched: 2, total: 2, gained: 2, flow: 1 });
});

test('langt drag på byttebrett blir fortsatt nabobytte', async ({ page }) => {
  await page.goto('/?level=w1-02');
  const h = hook(page);
  await page.waitForFunction(() => window.__palintris?.levelId === 'w1-02');
  await dismissIntroIfVisible(page);

  const from = await h.slot(3);
  const to = await h.slot(2);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.waitForTimeout(350);
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
  await page.waitForFunction(() => window.__palintris?.view().movesUsed === 1);

  expect((await h.view()).movesUsed).toBe(1);
  expect(await h.menu()).toBeNull();
});

test('viser bare rotasjon før speiling er låst opp', async ({ page }) => {
  await page.goto('/?level=w2-01');
  const h = hook(page);
  await page.waitForFunction(() => window.__palintris?.levelId === 'w2-01');
  await dismissIntroIfVisible(page);

  await tap(page, await h.slot(0));
  await tap(page, await h.slot(2));
  const actions = (await h.menu())?.map((item) => item.action);
  expect(actions).toEqual(['rotateLeft', 'rotateRight']);
});

test('angre og reset avbryter ikke en tydelig trekkanimasjon', async ({ page }) => {
  await page.clock.install();
  await page.goto('/?level=w2-01');
  const h = hook(page);
  await page.waitForFunction(() => window.__palintris?.levelId === 'w2-01');
  await dismissIntroIfVisible(page);
  await pauseAnimationClock(page);

  const rotateLeft = async (): Promise<void> => {
    expect(await h.busy()).toBe(false);
    await tap(page, await h.slot(0));
    await tap(page, await h.slot(2));
    const action = (await h.menu())?.find((item) => item.action === 'rotateLeft');
    if (action === undefined) throw new Error('venstrerotasjon mangler');
    await tap(page, action);
  };

  await rotateLeft();
  expect(await h.busy()).toBe(true);
  await tap(page, (await h.zones()).undo);
  expect(await h.busy()).toBe(true);
  await page.clock.runFor(1000);
  expect(await h.busy()).toBe(false);
  expect((await h.view()).movesUsed).toBe(1);

  await rotateLeft();
  expect(await h.busy()).toBe(true);
  await tap(page, (await h.zones()).reset);
  expect(await h.busy()).toBe(true);
  await page.clock.runFor(1000);
  expect(await h.busy()).toBe(false);
  expect((await h.view()).movesUsed).toBe(2);
});
