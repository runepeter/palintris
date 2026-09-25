import { expect, test, type Page } from '@playwright/test';
import { hook, tap } from './helpers';

type ExpeditionUi = { phase: string; buttons: { id: string; x: number; y: number }[] };
const ui = (page: Page): Promise<ExpeditionUi | null> => page.evaluate(() =>
  (window as Window & { __expedition?: ExpeditionUi }).__expedition ?? null);
const clickAction = async (page: Page, id: string): Promise<void> => {
  await expect.poll(async () => (await ui(page))?.buttons.some((b) => b.id === id)).toBe(true);
  const button = (await ui(page))?.buttons.find((b) => b.id === id);
  if (button === undefined) throw new Error(`Missing ${id}`);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.mouse.click(button.x, button.y);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
};

test('ekspedisjonen starter fra menyen og bevarer bindende trekk ved omlasting', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toBeHidden();
  await page.mouse.click(195, 415);
  await expect.poll(async () => (await ui(page))?.phase).toBe('entrance');
  await clickAction(page, 'start');
  await clickAction(page, 'safe');
  await page.waitForFunction(() => window.__palintris?.mode === 'expedition');
  const h = hook(page);
  const initial = await h.view();
  const { isPalindrome } = await import('../src/core/palindrome');
  const index = initial.tiles.findIndex((_, i) => {
    if (i >= initial.tiles.length - 1) return false;
    const tiles = [...initial.tiles];
    const a = tiles[i];
    const b = tiles[i + 1];
    if (a === undefined || b === undefined) return false;
    [tiles[i], tiles[i + 1]] = [b, a];
    return !isPalindrome(tiles);
  });
  expect(index).toBeGreaterThanOrEqual(0);
  await tap(page, await h.slot(index));
  await tap(page, await h.slot(index + 1));
  await expect.poll(async () => (await h.view()).movesUsed).toBe(1);
  await h.waitIdle();
  const before = await h.view();
  await page.keyboard.press('KeyZ');
  await page.keyboard.press('KeyR');
  expect((await h.view()).movesUsed).toBe(1);
  await page.reload();
  await expect(page.getByRole('status')).toBeHidden();
  await page.mouse.click(195, 415);
  await clickAction(page, 'resume');
  await page.waitForFunction(() => window.__palintris?.mode === 'expedition');
  expect((await h.view()).tiles).toEqual(before.tiles);
  expect((await h.view()).movesUsed).toBe(1);
});

// All state changes go through the rendered controls; the save is read only to plan legal moves.
const saved = (page: Page): Promise<string> => page.evaluate(() => localStorage.getItem('palintris.expedition.v1') ?? '');

const solveCurrent = async (page: Page): Promise<void> => {
  const { ExpeditionMode } = await import('../src/game/modes/expedition');
  const { createBoard, apply } = await import('../src/core/board');
  const { legalMoves, stateKey } = await import('../src/core/solver');
  const { isPalindrome } = await import('../src/core/palindrome');
  const raw = await saved(page);
  const mode = new ExpeditionMode({ getItem: () => raw, setItem: () => undefined });
  const level = mode.load('current');
  if (level === null) throw new Error('No active board');
  const h = hook(page);
  const view = await h.view();
  const board = createBoard(view.tiles, view.hand);
  type Move = import('../src/core/commands').MoveCommand;
  const queue = [{ board, moves: [] as Move[] }];
  const seen = new Set([stateKey(board.tiles, board.hand)]);
  let solution: Move[] | null = null;
  for (let i = 0; i < queue.length && i < 100000; i++) {
    const current = queue[i];
    if (current === undefined) break;
    if (isPalindrome(current.board.tiles)) { solution = current.moves; break; }
    if (current.moves.length >= view.budgetLeft) continue;
    for (const move of legalMoves(level.rules, current.board)) {
      const r = apply(level.rules, current.board, move);
      if (!r.ok) continue;
      if (isPalindrome(r.value.tiles)) { solution = [...current.moves, move]; break; }
      const key = stateKey(r.value.tiles, r.value.hand);
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ board: r.value, moves: [...current.moves, move] });
    }
    if (solution !== null) break;
  }
  if (solution === null) throw new Error('No legal solution');
  const { drag } = await import('./helpers');
  for (const move of solution) {
    await h.waitIdle();
    if (move.type === 'swap') await drag(page, await h.slot(move.a), await h.slot(move.b));
    else if (move.type === 'rotate' || move.type === 'mirror') {
      await tap(page, await h.slot(move.from));
      await tap(page, await h.slot(move.to));
      const action = move.type === 'mirror' ? 'mirror' : move.dir === 'left' ? 'rotateLeft' : 'rotateRight';
      const button = (await h.menu())?.find((item) => item.action === action);
      if (button === undefined) throw new Error(`No ${action} control`);
      await tap(page, button);
    }
  }
  await expect.poll(async () => (await ui(page))?.phase, { timeout: 15000 }).not.toBe(undefined);
};

test('ni rom, fire relikvier og seier via ekte spillkontroller', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install();
  await page.goto('/');
  await expect(page.getByRole('status')).toBeHidden();
  await page.mouse.click(195, 415);
  await clickAction(page, 'start');
  for (let floor = 1; floor <= 9; floor++) {
    await clickAction(page, floor % 3 === 0 ? 'guardian' : 'safe');
    await page.waitForFunction(() => window.__palintris?.mode === 'expedition');
    if (floor === 3) await page.screenshot({ path: testInfo.outputPath('guardian-board.png') });
    await solveCurrent(page);
    if (floor % 2 === 0 && floor < 9) {
      expect((await ui(page))?.phase).toBe('reward');
      if (floor === 2) {
        await page.screenshot({ path: testInfo.outputPath('relic-draft.png') });
        const before = await saved(page);
        await page.reload();
        await expect(page.getByRole('status')).toBeHidden();
        await page.mouse.click(195, 415);
        await expect.poll(async () => (await ui(page))?.phase).toBe('reward');
        expect(await saved(page)).toBe(before);
      }
      const choices = (await ui(page))?.buttons.filter((b) => b.id.startsWith('relic-')) ?? [];
      expect(choices).toHaveLength(3);
      const choice = choices[0];
      if (choice === undefined) throw new Error('No relic offer');
      await clickAction(page, choice.id);
    }
  }
  expect((await ui(page))?.phase).toBe('won');
  await page.screenshot({ path: testInfo.outputPath('expedition-victory.png') });
  const result = JSON.parse(await saved(page)) as { records: {wins: number}; state: { relics: string[]; score: number } };
  expect(result.records.wins).toBe(1);
  expect(result.state.relics).toHaveLength(4);
  expect(result.state.score).toBeGreaterThan(1000);
  await page.reload();
  await expect(page.getByRole('status')).toBeHidden();
  await page.mouse.click(195, 415);
  await clickAction(page, 'restart');
  expect((await ui(page))?.phase).toBe('route');
  expect((JSON.parse(await saved(page)) as typeof result).records.wins).toBe(1);
  expect(errors).toEqual([]);
});

test('liv krever bekreftelse, siste liv avslutter, ny reise fungerer', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByRole('status')).toBeHidden();
  await page.mouse.click(195, 415);
  await clickAction(page, 'start');
  for (let lives = 3; lives > 0; lives--) {
    await clickAction(page, 'risk');
    await page.waitForFunction(() => window.__palintris?.mode === 'expedition');
    await tap(page, (await hook(page).zones()).reset);
    if (lives === 3) {
      await page.mouse.click(107, 475);
      expect((JSON.parse(await saved(page)) as {state:{lives:number}}).state.lives).toBe(3);
      await tap(page, (await hook(page).zones()).reset);
      await page.screenshot({ path: testInfo.outputPath('sacrifice-confirm.png') });
    }
    await page.mouse.click(283, 475);
    await expect.poll(async () => (await ui(page))?.phase).toBe(lives === 1 ? 'lost' : 'route');
  }
  await page.screenshot({ path: testInfo.outputPath('expedition-defeat.png') });
  await clickAction(page, 'restart');
  expect((JSON.parse(await saved(page)) as {state:{lives:number}}).state.lives).toBe(3);
});

test('avbryt livsoffer slipper ikke dra-bevegelser gjennom til brettet', async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => localStorage.setItem('palintris.expedition.v1', JSON.stringify({
    version: 1, records: {bestScore: 0, wins: 0, runs: 0},
    state: {seed: 43, floor: 3, phase: 'board', lives: 3, score: 315, streak: 2,
      relics: ['extraMove'], route: 'guardian', commands: [], lastResult: null},
  })));
  await page.goto('/');
  await expect(page.getByRole('status')).toBeHidden();
  await page.mouse.click(195, 415);
  await clickAction(page, 'resume');
  await page.waitForFunction(() => window.__palintris?.mode === 'expedition');
  const h = hook(page);
  await tap(page, (await h.zones()).reset);
  const a = await h.slot(6);
  const b = await h.slot(5);
  const { drag } = await import('./helpers');
  await drag(page, {x: a.x, y: 460}, {x: b.x, y: 460});
  expect((await h.view()).movesUsed).toBe(0);
  expect((await h.state()).name).toBe('idle');
});
