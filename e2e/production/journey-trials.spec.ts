import { expect, test } from '@playwright/test';
import { defaultSave, SAVE_KEY, type SaveData } from '../../src/core/storage';

test('produksjon spiller kvote og valgfri midtbonus uten utviklingskroker', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  const data = defaultSave();
  const stars = { ...data.stars };
  for (let world = 1; world <= 6; world++) for (let n = 1; n <= 15; n++) stars[`w${world}-${String(n).padStart(2, '0')}`] = { stars: 3, contentVersion: 1 };
  await page.addInitScript(({ key, value }) => {
    if (sessionStorage.getItem('trial-production-seeded') !== null) return;
    localStorage.setItem(key, value);
    sessionStorage.setItem('trial-production-seeded', '1');
  }, { key: SAVE_KEY, value: JSON.stringify({ ...data, stars, settings: { ...data.settings, reducedMotion: true } }) });
  const save = (): Promise<SaveData> => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{}') as SaveData, SAVE_KEY);
  const key = async (value: string): Promise<void> => { await page.keyboard.press(value); await page.clock.runFor(200); };
  const swap = async (left: number): Promise<void> => {
    await key('Escape');
    for (let i = 0; i < 5; i++) await key('ArrowLeft');
    for (let i = 0; i < left; i++) await key('ArrowRight');
    await key('Space'); await key('ArrowRight');
  };
  await page.goto('/');
  await expect(page.getByRole('status')).toBeHidden();
  expect(await page.evaluate(() => '__palintris' in window || '__expedition' in window)).toBe(false);
  await page.clock.runFor(100);
  await page.mouse.click(195, 574);
  await page.clock.runFor(100);
  await page.mouse.click(195, 684);
  await expect.poll(async () => (await save()).introsSeen).toContain('journey-quota-01');
  await swap(1); await swap(0);
  await expect.poll(async () => (await save()).stars['journey-quota-01']?.stars).toBe(3);
  await page.clock.runFor(1600);
  await page.mouse.click(195, 557);
  await page.clock.runFor(100);
  await page.mouse.click(195, 684);
  await expect.poll(async () => (await save()).introsSeen).toContain('journey-center-01');
  await swap(0); await swap(1); await swap(0);
  await expect.poll(async () => (await save()).journeyBadges).toContain('journey-center-01');
  expect((await save()).stars['journey-center-01']?.stars).toBe(3);
  await page.reload();
  await expect(page.getByRole('status')).toBeHidden();
  expect((await save()).journeyBadges).toContain('journey-center-01');
  expect(Object.keys((await save()).stars).filter(id => /^w\d-\d{2}$/.test(id))).toHaveLength(90);
  expect(errors).toEqual([]);
});
