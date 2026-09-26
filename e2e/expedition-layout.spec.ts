import type {} from '../src/scenes/hookTypes';
import { expect, test } from '@playwright/test';
import { openExpedition } from './menu-navigation';

for (const viewport of [{width:360,height:640}, {width:390,height:844}, {width:844,height:390}, {width:1440,height:900}]) {
  test(`relikvievalg og vokter ved ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.addInitScript(() => localStorage.setItem('palintris.expedition.v1', JSON.stringify({
      version: 1, records: {bestScore:0,wins:0,runs:0},
      state: {seed:43,floor:3,phase:'reward',lives:3,score:315,streak:2,relics:[],route:null,commands:[],
        lastResult:{kind:'solved',points:165,perfect:true}},
    })));
    await page.goto('/');
    await expect(page.getByRole('status')).toBeHidden();
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await openExpedition(page);
    await page.waitForFunction(() => window.__expedition?.phase === 'reward');
    const choices = await page.evaluate(() => window.__expedition?.buttons.filter((b) => b.id.startsWith('relic-')) ?? []);
    expect(choices).toHaveLength(3);
    for (const button of choices) {
      expect(button.x).toBeGreaterThanOrEqual(22);
      expect(button.x).toBeLessThanOrEqual(viewport.width - 22);
      expect(button.y).toBeGreaterThanOrEqual(22);
      expect(button.y).toBeLessThanOrEqual(viewport.height - 22);
    }
    await page.screenshot({path:`/tmp/palintris-visual/draft-${viewport.width}.png`});
    const choice = choices[0];
    if (choice === undefined) throw new Error('No choice');
    await page.mouse.click(choice.x, choice.y);
    await page.waitForFunction(() => window.__expedition?.phase === 'route');
    await page.screenshot({path:`/tmp/palintris-visual/guardian-${viewport.width}.png`});
  });
}
