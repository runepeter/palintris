import type { Page } from '@playwright/test';

const landscape = (width: number, height: number): boolean => height < 560 && width > height * 1.25;

export const waitForSceneFrame = async (page: Page): Promise<void> => {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
};

export const startJourney = async (page: Page): Promise<void> => {
  const viewport = page.viewportSize();
  if (viewport === null) throw new Error('Viewport missing');
  const { width, height } = viewport;
  await page.mouse.click(width * (landscape(width, height) ? 0.72 : 0.5), height * (landscape(width, height) ? 0.56 : 0.68));
};

export const openChallenges = async (page: Page): Promise<void> => {
  const viewport = page.viewportSize();
  if (viewport === null) throw new Error('Viewport missing');
  const { width, height } = viewport;
  await page.mouse.click(width * (landscape(width, height) ? 0.72 : 0.5), height * (landscape(width, height) ? 0.73 : 0.68) + (landscape(width, height) ? 0 : 71));
  await waitForSceneFrame(page);
};

export const openExpedition = async (page: Page): Promise<void> => {
  const viewport = page.viewportSize();
  if (viewport === null) throw new Error('Viewport missing');
  await openChallenges(page);
  await page.mouse.click(viewport.width * (landscape(viewport.width, viewport.height) ? 0.2 : 0.5), viewport.height * (landscape(viewport.width, viewport.height) ? 0.43 : 0.29));
};

export const openSticky = async (page: Page): Promise<void> => {
  const viewport = page.viewportSize();
  if (viewport === null) throw new Error('Viewport missing');
  await openChallenges(page);
  await page.mouse.click(viewport.width / 2, viewport.height * (landscape(viewport.width, viewport.height) ? 0.74 : 0.785));
};

export const openSettings = async (page: Page): Promise<void> => {
  const viewport = page.viewportSize();
  if (viewport === null) throw new Error('Viewport missing');
  const { width, height } = viewport;
  const wide = landscape(width, height);
  const menuWidth = wide ? Math.min(320, width * 0.42) : Math.min(width - 40, 344);
  const settingsX = width * (wide ? 0.72 : 0.5) + (menuWidth + 12) / 4;
  await page.mouse.click(settingsX, wide ? height * 0.9 : height * 0.68 + 137);
};
