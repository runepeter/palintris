import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
// TestHook is the real window.__palintris shape (src/scenes/testHook.ts); importing
// it here (type-only, no Phaser/Vite pulled in) also brings in its declare global,
// so this file's window.__palintris stays in sync instead of duplicating the shape.
import type { TestHook } from '../src/scenes/hookTypes';

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

interface Hook {
  slot(i: number): Promise<ReturnType<TestHook['screenLayout']>['slots'][number]>;
  view(): Promise<ReturnType<TestHook['view']>>;
  menu(): Promise<ReturnType<TestHook['menu']>>;
  zones(): Promise<ReturnType<TestHook['zones']>>;
  waitIdle(): Promise<unknown>;
}

const hook = (page: Page): Hook => ({
  slot: (i: number) =>
    page.evaluate((idx) => {
      if (window.__palintris === undefined) throw new Error('__palintris mangler');
      const slot = window.__palintris.screenLayout().slots[idx];
      if (slot === undefined) throw new Error(`slot ${idx} finnes ikke`);
      return slot;
    }, i),
  view: () =>
    page.evaluate(() => {
      if (window.__palintris === undefined) throw new Error('__palintris mangler');
      return window.__palintris.view();
    }),
  menu: () =>
    page.evaluate(() => {
      if (window.__palintris === undefined) throw new Error('__palintris mangler');
      return window.__palintris.menu();
    }),
  zones: () =>
    page.evaluate(() => {
      if (window.__palintris === undefined) throw new Error('__palintris mangler');
      return window.__palintris.zones();
    }),
  waitIdle: () => page.waitForFunction(() => window.__palintris !== undefined && !window.__palintris.busy()),
});

const drag = async (page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + (to.x - from.x) / 2, from.y + (to.y - from.y) / 2, { steps: 4 });
  await page.mouse.move(to.x, to.y, { steps: 4 });
  await page.mouse.up();
};

const tap = async (page: Page, p: { x: number; y: number }): Promise<void> => {
  await page.mouse.click(p.x, p.y);
};

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
