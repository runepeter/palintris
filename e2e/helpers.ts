import type { Page } from '@playwright/test';
// TestHook is the real window.__palintris shape (src/scenes/hookTypes.ts); importing
// it here (type-only, no Phaser/Vite pulled in) also brings in its declare global,
// so specs' window.__palintris stays in sync instead of duplicating the shape.
import type { TestHook } from '../src/scenes/hookTypes';

export interface Hook {
  slot(i: number): Promise<ReturnType<TestHook['screenLayout']>['slots'][number]>;
  view(): Promise<ReturnType<TestHook['view']>>;
  feedback(): Promise<ReturnType<TestHook['feedback']>>;
  screenLayout(): Promise<ReturnType<TestHook['screenLayout']>>;
  menu(): Promise<ReturnType<TestHook['menu']>>;
  zones(): Promise<ReturnType<TestHook['zones']>>;
  busy(): Promise<boolean>;
  state(): Promise<ReturnType<TestHook['state']>>;
  clockMs(): Promise<number>;
  bannerVisible(): Promise<boolean>;
  introVisible(): Promise<boolean>;
  dismissIntro(): Promise<void>;
  waitIdle(): Promise<unknown>;
}

export const hook = (page: Page): Hook => ({
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
  feedback: () =>
    page.evaluate(() => {
      if (window.__palintris === undefined) throw new Error('__palintris mangler');
      return window.__palintris.feedback();
    }),
  screenLayout: () =>
    page.evaluate(() => {
      if (window.__palintris === undefined) throw new Error('__palintris mangler');
      return window.__palintris.screenLayout();
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
  busy: () =>
    page.evaluate(() => {
      if (window.__palintris === undefined) throw new Error('__palintris mangler');
      return window.__palintris.busy();
    }),
  state: () =>
    page.evaluate(() => {
      if (window.__palintris === undefined) throw new Error('__palintris mangler');
      return window.__palintris.state();
    }),
  clockMs: () =>
    page.evaluate(() => {
      if (window.__palintris === undefined) throw new Error('__palintris mangler');
      return window.__palintris.clockMs();
    }),
  bannerVisible: () =>
    page.evaluate(() => {
      if (window.__palintris === undefined) throw new Error('__palintris mangler');
      return window.__palintris.bannerVisible();
    }),
  introVisible: () =>
    page.evaluate(() => {
      if (window.__palintris === undefined) throw new Error('__palintris mangler');
      return window.__palintris.introVisible();
    }),
  dismissIntro: () =>
    page.evaluate(() => {
      if (window.__palintris === undefined) throw new Error('__palintris mangler');
      window.__palintris.dismissIntro();
    }),
  waitIdle: () => page.waitForFunction(() => window.__palintris !== undefined && !window.__palintris.busy()),
});

export const drag = async (page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + (to.x - from.x) / 2, from.y + (to.y - from.y) / 2, { steps: 4 });
  await page.mouse.move(to.x, to.y, { steps: 4 });
  await page.mouse.up();
};

export const tap = async (page: Page, p: { x: number; y: number }): Promise<void> => {
  await page.mouse.click(p.x, p.y);
};

/** Lukker introoverlayet hvis det er synlig ved sidelast, ellers no-op. */
export const dismissIntroIfVisible = async (page: Page): Promise<void> => {
  const h = hook(page);
  if (await h.introVisible()) await h.dismissIntro();
};
