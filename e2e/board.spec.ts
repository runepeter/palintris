import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

// Minimal local shape of window.__palintris (src/scenes/testHook.ts), kept
// self-contained so e2e/tsconfig.json doesn't need to pull in src's ambient types.
interface PalintrisHook {
  readonly levelId: string;
  view(): { tiles: { id: number }[]; solved: boolean; movesUsed: number; stars: number };
  screenLayout(): { slots: ReadonlyArray<{ x: number; y: number; index: number }> };
  menu(): ReadonlyArray<{ x: number; y: number; action: string }> | null;
  zones(): { wild: { x: number; y: number }; remove: { x: number; y: number }; undo: { x: number; y: number }; reset: { x: number; y: number } };
  busy(): boolean;
}

declare global {
  interface Window {
    __palintris?: PalintrisHook;
  }
}

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

const hook = (page: Page) => ({
  slot: (i: number) => page.evaluate((idx) => window.__palintris!.screenLayout().slots[idx]!, i),
  view: () => page.evaluate(() => window.__palintris!.view()),
  menu: () => page.evaluate(() => window.__palintris!.menu()),
  zones: () => page.evaluate(() => window.__palintris!.zones()),
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
    expect(menu).not.toBeNull();
    const action = cmd.type === 'mirror' ? 'mirror' : cmd.dir === 'left' ? 'rotateLeft' : 'rotateRight';
    const btn = menu!.find((m) => m.action === action)!;
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
  await perform(page, first!);
  await h.waitIdle();
  expect((await h.view()).movesUsed).toBe(1);

  await tap(page, (await h.zones()).undo);
  await h.waitIdle();
  expect((await h.view()).movesUsed).toBe(0);

  await perform(page, first!);
  for (const cmd of rest) await perform(page, cmd);
  await page.waitForFunction(() => window.__palintris?.view().solved === true, undefined, { timeout: 15_000 });
  const done = await h.view();
  expect(done.stars).toBeGreaterThanOrEqual(1);
  expect(done.movesUsed).toBe(level.solution.length);
});
