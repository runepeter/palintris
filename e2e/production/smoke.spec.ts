import { expect, test, type Page } from '@playwright/test';
import { SAVE_KEY, type SaveData } from '../../src/core/storage';

const nextFrame = async (page: Page): Promise<void> => {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
};

const click = async (page: Page, x: number, y: number): Promise<void> => {
  await page.mouse.click(x, y);
  await nextFrame(page);
};

test('produksjonsbygget starter, løser første speil og beholder fremgangen', async ({ page }) => {
  const errors: string[] = [];
  const failed: string[] = [];
  const external: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) failed.push(response.url()); });
  page.on('request', (request) => { if (new URL(request.url()).origin !== 'http://127.0.0.1:4173') external.push(request.url()); });
  await page.goto('/?level=w6-15');
  await expect(page.getByRole('status')).toBeHidden();
  await expect(page.locator('canvas')).toBeVisible();
  expect(await page.evaluate(() => '__palintris' in window)).toBe(false);
  await nextFrame(page);
  await click(page, 195, 515);
  await click(page, 39, 361);
  for (const key of ['ArrowRight', 'ArrowRight', 'Space', 'ArrowRight']) {
    await page.keyboard.press(key);
    await nextFrame(page);
  }
  const save = (): Promise<SaveData> => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}') as SaveData, SAVE_KEY);
  await expect.poll(async () => (await save()).stars?.['w1-01']?.stars).toBe(3);
  await page.reload();
  await expect(page.getByRole('status')).toBeHidden();
  expect((await save()).stars['w1-01']?.stars).toBe(3);
  await nextFrame(page);
  await click(page, 278, 645);
  await click(page, 295, 130);
  await expect.poll(async () => (await save()).settings?.sound).toBe(false);
  await page.reload();
  await expect(page.getByRole('status')).toBeHidden();
  expect((await save()).settings.sound).toBe(false);
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
  expect(external).toEqual([]);
});

test('produksjonsbygget åpner også når nettleseren blokkerer lokal lagring', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', {
    get: () => { throw new DOMException('Access denied', 'SecurityError'); },
  }));
  await page.goto('/');
  await expect(page.getByRole('status')).toBeHidden();
  await expect(page.locator('canvas')).toBeVisible();
  await nextFrame(page);
  await click(page, 278, 645);
  await click(page, 295, 130);
  expect(errors).toEqual([]);
});
