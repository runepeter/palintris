import { expect, test } from '@playwright/test';

test('viser lasting til ressursene er klare og henter skriftene lokalt', async ({ page }) => {
  const remote: string[] = [];
  page.on('request', (request) => {
    if (!new URL(request.url()).hostname.match(/^(localhost|127\.0\.0\.1)$/)) remote.push(request.url());
  });
  let release = (): void => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/assets/mirror-realm.webp', async (route) => { await gate; await route.continue(); });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('status')).toContainText('Åpner speilverdenen');
  release();
  await expect(page.getByRole('status')).toBeHidden();
  expect(await page.evaluate(() => document.fonts.check('700 18px Nunito') && document.fonts.check('600 24px Cinzel'))).toBe(true);
  expect(remote).toEqual([]);
});

test('viser ny lasting når en ressurs feiler og lar spilleren prøve igjen', async ({ page }) => {
  await page.route('**/assets/jewel-tiles.webp', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Prøv igjen' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Kunne ikke laste spillet');
  await page.unroute('**/assets/jewel-tiles.webp');
  await page.getByRole('button', { name: 'Prøv igjen' }).click();
  await expect(page.getByRole('status')).toBeHidden();
  await page.mouse.click(111, 645);
  await page.waitForFunction(() => window.__palintris?.mode === 'sticky');
});
