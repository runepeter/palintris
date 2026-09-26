import { mkdir } from 'node:fs/promises';
import { test } from '@playwright/test';
import { hook } from './helpers';
import type { TestHook } from '../src/scenes/hookTypes';

const required = <T>(value: T | undefined): T => {
  if (value === undefined) throw new Error('Forventet testverdi mangler');
  return value;
};
import type Phaser from 'phaser';
import { expect, type Page } from '@playwright/test';
import { defaultSave, SAVE_KEY } from '../src/core/storage';
import { startJourney } from './menu-navigation';

const enterRotation = async (page: Page, id: string, learned = true, reduced = false, clear = true): Promise<void> => {
  const data = defaultSave();
  const stars = Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`w1-${String(i + 1).padStart(2, '0')}`, { stars: 3, contentVersion: 1 }]));
  for (let n = 1; n < Number(id.slice(3)); n++) stars[`w2-${String(n).padStart(2, '0')}`] = { stars: 3, contentVersion: 1 };
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: SAVE_KEY, value: JSON.stringify({ ...data, stars, introsSeen: learned ? ['w2-01'] : [], settings: { ...data.settings, reducedMotion: reduced, clearAnimations: clear } }) });
  await page.goto('/');
  await expect(page.getByRole('status')).toBeHidden();
  await page.evaluate(async () => {
    const path = '/src/scenes/BoardScene.ts';
    const { BoardScene } = await import(path) as { BoardScene: { prototype: { create: (this: Phaser.Scene) => void } } };
    const original = BoardScene.prototype.create;
    BoardScene.prototype.create = function (): void {
      (window as unknown as { rotationScene: Phaser.Scene }).rotationScene = this;
      BoardScene.prototype.create = original;
      original.call(this);
    };
  });
  await startJourney(page);
  await page.waitForFunction((level) => window.__palintris?.levelId === level, id);
};
const controls = (page: Page): Promise<Array<{ x: number; y: number; width: number; height: number }>> => page.evaluate(() => {
  const scene = (window as unknown as { rotationScene: Phaser.Scene }).rotationScene;
  const container = scene.children.getByName('rotation-controls') as Phaser.GameObjects.Container | null;
  return container?.visible === true ? container.list.map((child) => {
    const c = child as Phaser.GameObjects.Container;
    return { x: c.x, y: c.y, width: c.width, height: c.height };
  }) : [];
});

for (const viewport of [{ width: 360, height: 640 }, { width: 360, height: 500 }, { width: 667, height: 390 }, { width: 844, height: 390 }]) {
  test(`helrotasjon har egne knapper og sperrer input på ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.clock.install();
    await enterRotation(page, 'w2-07');
    const buttons = await controls(page);
    expect(buttons).toHaveLength(2);
    expect(buttons.every((b) => b.height >= 44)).toBe(true);
    const h = hook(page);
    const original = await h.view();
    const layout = await h.screenLayout();
    for (const button of buttons) for (const slot of layout.slots) {
      expect(Math.abs(button.x - slot.x) >= (button.width + layout.tile) / 2 || Math.abs(button.y - slot.y) >= (button.height + layout.tile) / 2).toBe(true);
    }
    await mkdir('/tmp/palintris-rotation-after', { recursive: true });
    await page.screenshot({ path: `/tmp/palintris-rotation-after/controls-${viewport.width}x${viewport.height}.png`, scale: 'css' });
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    await page.clock.runFor(32);
    await page.mouse.click(required(buttons[0]).x, required(buttons[0]).y);
    expect((await h.view()).tiles.map((t) => t.id)).toEqual([...original.tiles.slice(1), required(original.tiles[0])].map((t) => t.id));
    await page.mouse.click(required(buttons[0]).x, required(buttons[0]).y);
    await page.keyboard.press('r');
    await page.keyboard.press('z');
    const zones = await h.zones();
    await page.mouse.click(zones.undo.x, zones.undo.y);
    await page.mouse.click(zones.reset.x, zones.reset.y);
    expect((await h.view()).movesUsed).toBe(1);
    await page.clock.runFor(1000);
    await page.keyboard.press('z');
    expect((await h.view()).movesUsed).toBe(0);
  });
}

for (const viewport of [{ width: 360, height: 640 }, { width: 844, height: 390 }]) test(`første rotasjon beholder introgeometrien til buen har landet ${viewport.width}`, async ({ page }) => {
  await page.setViewportSize(viewport);
  await page.clock.install();
  await enterRotation(page, 'w2-01', false);
  const h = hook(page);
  expect(await controls(page)).toEqual([]);
  const old = await h.view();
  const start = await h.slot(0);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  for (let i = 1; i < old.tiles.length; i++) await page.keyboard.press('Shift+ArrowRight');
  await page.keyboard.press('q');
  await page.clock.runFor(300);
  expect(await h.introVisible()).toBe(true);
  const rendered = await page.evaluate((id) => (window.__palintris as TestHook).renderedTiles().find((tile) => tile.id === id), required(old.tiles[0]).id);
  expect(required(rendered).y).toBeLessThan(start.y - 4);
  await page.clock.runFor(600);
  expect(await h.introVisible()).toBe(false);
});

const rendered = (page: Page): Promise<ReturnType<TestHook['renderedTiles']>> => page.evaluate(() => (window.__palintris as TestHook).renderedTiles());
const trailSize = (page: Page): Promise<number> => page.evaluate(() => {
  const scene = (window as unknown as { rotationScene: Phaser.Scene }).rotationScene;
  return (scene.children.getByName('rotation-trail') as Phaser.GameObjects.Graphics).commandBuffer.length;
});

for (const viewport of [{ width: 360, height: 640 }, { width: 844, height: 390 }]) {
  for (const id of ['w2-01', 'w2-07']) for (const dir of ['left', 'right'] as const) {
    test(`synlig wrap ${id} ${dir} ${viewport.width}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.clock.install();
      await enterRotation(page, id);
      const h = hook(page);
      const old = await h.view();
      const layout = await h.screenLayout();
      const wrapId = required(old.tiles[dir === 'left' ? 0 : old.tiles.length - 1]).id;
      const from = required(layout.slots[dir === 'left' ? 0 : old.tiles.length - 1]);
      const to = required(layout.slots[dir === 'left' ? old.tiles.length - 1 : 0]);
      const otherId = required(old.tiles[dir === 'left' ? 1 : 0]).id;
      const otherFrom = required(layout.slots[dir === 'left' ? 1 : 0]);
      const otherTo = required(layout.slots[dir === 'left' ? 0 : 1]);
      const buttons = await controls(page);
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
      await page.clock.runFor(32);
      await mkdir('/tmp/palintris-rotation-after', { recursive: true });
      await page.screenshot({ path: `/tmp/palintris-rotation-after/${id}-${viewport.width}x${viewport.height}.png`, scale: 'css' });
      await page.mouse.click(required(buttons[dir === 'left' ? 0 : 1]).x, required(buttons[0]).y);
      for (const fraction of [25, 50, 75]) {
        await page.clock.runFor(190);
        const tiles = await rendered(page);
        const tile = required(tiles.find((t) => t.id === wrapId));
        const other = required(tiles.find((t) => t.id === otherId));
        const t = (other.x - otherFrom.x) / (otherTo.x - otherFrom.x);
        expect(t).toBeGreaterThan(0);
        expect(t).toBeLessThan(1);
        expect(other.y).toBeCloseTo(otherFrom.y + (otherTo.y - otherFrom.y) * t, 1);
        if (id === 'w2-01') expect(tile.y).toBeLessThan(from.y - 3);
        else expect(Math.abs(tile.x - from.x)).toBeGreaterThan(3);
        expect(tile.x - layout.tile / 2).toBeGreaterThanOrEqual(-.1);
        expect(tile.x + layout.tile / 2).toBeLessThanOrEqual(viewport.width + .1);
        expect(tile.y - layout.tile / 2).toBeGreaterThanOrEqual(95.9);
        expect(tile.y + layout.tile / 2).toBeLessThanOrEqual(viewport.height - 119.9);
        expect(await trailSize(page)).toBeGreaterThan(0);
        const cues = await page.evaluate(() => {
          const scene = (window as unknown as { rotationScene: Phaser.Scene }).rotationScene;
          return scene.children.list.filter((child) => child.type === 'Text' && (child as Phaser.GameObjects.Text).text.includes('Roterer'))
            .map((child) => { const b = (child as Phaser.GameObjects.Text).getBounds(); return { left: b.left, right: b.right }; });
        });
        expect(cues).toHaveLength(1);
        for (const cue of cues) { expect(cue.left).toBeGreaterThanOrEqual(0); expect(cue.right).toBeLessThanOrEqual(viewport.width); }
        await page.screenshot({ path: `/tmp/palintris-rotation-after/${id}-${dir}-${viewport.width}-${fraction}.png`, scale: 'css' });
      }
      await page.clock.runFor(210);
      const final = (await rendered(page)).find((t) => t.id === wrapId);
      if (final !== undefined) { expect(final.x).toBeCloseTo(to.x, 1); expect(final.y).toBeCloseTo(to.y, 1); }
    });
  }
}

for (const reduced of [true, false]) {
  test(`kort rotasjon har retning, inputvern og landing: redusert=${reduced}`, async ({ page }) => {
    await page.clock.install();
    await enterRotation(page, 'w2-07', true, reduced, false);
    const button = required((await controls(page))[0]);
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
    await page.clock.runFor(32);
    await page.mouse.click(button.x, button.y);
    await page.clock.runFor(32);
    expect(await trailSize(page)).toBeGreaterThan(0);
    await page.screenshot({ path: `/tmp/palintris-rotation-after/reduced-${reduced}-transition.png`, scale: 'css' });
    await page.keyboard.press('r');
    expect((await hook(page).view()).movesUsed).toBe(1);
    await page.clock.runFor(240);
    expect(await hook(page).busy()).toBe(false);
    expect(await trailSize(page)).toBeGreaterThan(0);
    await page.screenshot({ path: `/tmp/palintris-rotation-after/reduced-${reduced}-landing.png`, scale: 'css' });
    await page.clock.runFor(400);
    expect(await trailSize(page)).toBe(0);
  });
}

test('resize under wrap rydder buen og snapper alle ID-er til sluttvisningen', async ({ page }) => {
  await page.clock.install();
  await enterRotation(page, 'w2-07');
  const button = required((await controls(page))[0]);
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.clock.runFor(32);
  await page.mouse.click(button.x, button.y);
  await page.clock.runFor(190);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.clock.runFor(100);
  expect(await trailSize(page)).toBe(0);
  expect(await hook(page).busy()).toBe(false);
  const layout = await hook(page).screenLayout();
  const tiles = await rendered(page);
  const view = await hook(page).view();
  view.tiles.forEach((tile, index) => {
    const drawn = required(tiles.find((t) => t.id === tile.id));
    expect(drawn.x).toBeCloseTo(required(layout.slots[index]).x, 1);
    expect(drawn.y).toBeCloseTo(required(layout.slots[index]).y, 1);
  });
  await page.keyboard.press('z');
  expect((await hook(page).view()).movesUsed).toBe(0);
});
