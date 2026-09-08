import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { dismissIntroIfVisible, drag, hook } from './helpers';

interface Level { id: string; hand: { wild: number; remove: number } }

const campaign = JSON.parse(readFileSync('src/content/campaign.v1.json', 'utf8')) as { levels: Level[] };

// w6-01 har verken intro eller låste brikker, og hånden har både joker og fjern-ladning.
const DEFAULT_ID = 'w6-01';
const pickLevelId = (): string => {
  const def = campaign.levels.find((l) => l.id === DEFAULT_ID);
  if (def !== undefined && def.hand.wild > 0 && def.hand.remove > 0) return DEFAULT_ID;
  const fallback = campaign.levels.find((l) => /^w[56]-/.test(l.id) && l.hand.wild > 0 && l.hand.remove > 0);
  if (fallback === undefined) throw new Error('fant ingen w5/w6-nivå med både joker og fjern i hånden');
  return fallback.id;
};

const LEVEL_ID = pickLevelId();

test('joker inn i mellomrom og brikke ut i hånden', async ({ page }) => {
  await page.goto(`/?level=${LEVEL_ID}`);
  const h = hook(page);
  await page.waitForFunction((id) => window.__palintris?.levelId === id, LEVEL_ID);
  await dismissIntroIfVisible(page);
  await h.waitIdle();

  const start = await h.view();
  expect(start.hand.wild).toBeGreaterThan(0);
  expect(start.hand.remove).toBeGreaterThan(0);
  const startCount = start.tiles.length;

  // Joker: dra fra hånd-sonen til gapet ved folden.
  const layout = await h.screenLayout();
  const at = Math.floor(startCount / 2);
  const gap = layout.gaps.find((g) => g.at === at);
  if (gap === undefined) throw new Error(`gap ${at} finnes ikke`);
  const zonesBefore = await h.zones();
  await drag(page, zonesBefore.wild, gap);
  await h.waitIdle();

  const afterWild = await h.view();
  expect(afterWild.hand.wild).toBe(start.hand.wild - 1);
  expect(afterWild.tiles.length).toBe(startCount + 1);

  // Fjern: dra en ulåst brikke ned i hånd-sonen.
  const target = afterWild.tiles.findIndex((t) => !t.locked);
  if (target === -1) throw new Error('fant ingen ulåst brikke å fjerne');
  const slot = await h.slot(target);
  const zonesAfterWild = await h.zones();
  await drag(page, slot, zonesAfterWild.remove);
  await h.waitIdle();

  const afterRemove = await h.view();
  expect(afterRemove.hand.remove).toBe(afterWild.hand.remove - 1);
  expect(afterRemove.tiles.length).toBe(afterWild.tiles.length - 1);
});
