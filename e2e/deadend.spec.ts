import { expect, test } from '@playwright/test';
import { dismissIntroIfVisible, drag, hook, tap } from './helpers';

const LEVEL_ID = 'w1-02';

test('blindvei ved tomt budsjett viser banner; angre fjerner den', async ({ page }) => {
  await page.clock.install();
  await page.goto(`/?level=${LEVEL_ID}`);
  const h = hook(page);
  await page.waitForFunction((id) => window.__palintris?.levelId === id, LEVEL_ID);
  await dismissIntroIfVisible(page);
  await h.waitIdle();

  const start = await h.view();
  expect(start.budgetLeft).toBeGreaterThan(0);

  // w1-02 har to nabobrikker med samme symbol (B, B) på plass 0-1: å bytte dem fram og
  // tilbake bruker opp budsjettet uten å endre om brettet er et palindrom. Løseren merker
  // brettet som blindvei så snart gjenværende budsjett er for lite til korteste løsning,
  // altså gjerne før budgetLeft faktisk når 0 — sløyfa stopper derfor på banneret.
  let view = start;
  while (!(await h.bannerVisible()) && view.budgetLeft > 0) {
    const a = await h.slot(0);
    const b = await h.slot(1);
    await drag(page, a, b);
    await h.waitIdle();
    view = await h.view();
  }
  expect((await h.state()).name).toBe('idle');
  expect(await h.bannerVisible()).toBe(true);

  const movesBefore = view.movesUsed;
  const a = await h.slot(0);
  const b = await h.slot(1);
  await drag(page, a, b);
  await h.waitIdle();
  expect((await h.view()).movesUsed).toBe(movesBefore);
  expect(await h.bannerVisible()).toBe(true);

  const zones = await h.zones();
  await tap(page, zones.undo);
  await h.waitIdle();
  expect(await h.bannerVisible()).toBe(false);
});
