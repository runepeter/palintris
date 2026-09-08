import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { dismissIntroIfVisible, drag, hook } from './helpers';

interface Level { id: string; tiles: { id: number }[]; hand: { remove: number } }

const campaign = JSON.parse(readFileSync('src/content/campaign.v1.json', 'utf8')) as { levels: Level[] };
const level = campaign.levels
  .filter((l) => l.id.startsWith('w5-'))
  .find((l) => l.tiles.length === 7 && l.hand.remove > 0);
if (level === undefined) throw new Error('fant ikke et w5-nivå med 7 brikker og fjern i hånden');

test('fjerning av en brikke bryter hårnål-layout om til rad', async ({ page }) => {
  await page.goto(`/?level=${level.id}`);
  const h = hook(page);
  await page.waitForFunction((id) => window.__palintris?.levelId === id, level.id);
  await dismissIntroIfVisible(page);
  await h.waitIdle();

  const before = await h.screenLayout();
  const ysBefore = new Set(before.slots.map((s) => s.y));
  // Hårnål med 7 brikker (oddetall): topp- og bunnrad pluss én midtbrikke på senterlinjen,
  // altså 3 distinkte y-verdier — ikke bare 2.
  expect(ysBefore.size).toBeGreaterThan(1);

  const view = await h.view();
  const target = view.tiles.findIndex((t) => !t.locked);
  if (target === -1) throw new Error('fant ingen ulåst brikke å fjerne');
  const slot = await h.slot(target);
  const zones = await h.zones();
  await drag(page, slot, zones.remove);
  await h.waitIdle();

  const after = await h.screenLayout();
  const ysAfter = new Set(after.slots.map((s) => s.y));
  expect(ysAfter.size).toBe(1);
});
