import { chooseTheme } from '../../menu.ts';
import { test, expect } from '@playwright/test';


async function probe(page: import('@playwright/test').Page) {
  await page.route(/\/src\/games\/skybreak\/game\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const original = createRun; createRun = () => { const run = original(); window.flightProbe = run; return run; };` });
  });
  await page.clock.install(); await page.goto('/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.getByRole('button', { name: 'Open game: Skybreak', exact: true }).click();
}

test('Deluxe preserves an ongoing sortie, freezes its output, survives restart and recovers from drawing failure', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await probe(page);
  const theme = page.getByRole('group', { name: 'Theme', exact: true });
  await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.clock.runFor(2300);
  await page.keyboard.press('Escape');
  const state = () => page.evaluate(() => JSON.stringify((window as any).flightProbe));
  const frozen = await state();
  await chooseTheme(theme, 'deluxe'); await expect(page.locator('.skybreak-app')).toHaveAttribute('data-theme', 'deluxe');
  expect(await state()).toBe(frozen);
  await page.clock.runFor(100);
  const surface = page.locator('.play-surface'); const picture = await surface.screenshot();
  await page.clock.runFor(1200); expect((await surface.screenshot()).equals(picture), 'paused presentation stays unchanged').toBe(true); expect(await state()).toBe(frozen);
  const coastPixels = () => page.locator('canvas').evaluate(canvas => {
    const c = canvas as HTMLCanvasElement, scale = Math.min(c.width / 480, c.height / 800);
    const x = (c.width - 480 * scale) / 2;
    return Array.from(c.getContext('2d')!.getImageData(x + 5 * scale, 310 * scale, 45 * scale, 45 * scale).data);
  });
  const stoppedCoast = await coastPixels();
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await page.clock.runFor(100);
  expect(await state()).not.toBe(frozen);
  expect(await coastPixels(), 'the coast passes beneath the aircraft during active flight').not.toEqual(stoppedCoast);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Restart', exact: true }).click(); await page.clock.runFor(50);
  await expect(page.locator('.skybreak-app')).toHaveAttribute('data-theme', 'deluxe');
  expect(await page.evaluate(() => (window as any).flightProbe.elapsed)).toBeLessThan(0.1);
  // A failed image draw suspends the same sortie and prepares Arcade.
  await page.evaluate(() => {
    const ctx=document.querySelector('canvas')!.getContext('2d')!,draw=ctx.drawImage;
    ctx.drawImage=function(...args: any[]) {
      if (args[0] instanceof HTMLCanvasElement && args[0].width === 1024) throw new Error('Lost coastal artwork');
      return (draw as any).apply(this,args);
    } as any;
  });
  await page.clock.runFor(32);
  await expect(page.locator('.skybreak-app')).toHaveAttribute('data-theme', 'arcade');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeEnabled();
  const recovered = await state(); await page.clock.runFor(500); expect(await state()).toBe(recovered);
  await chooseTheme(theme, 'deluxe'); await expect(page.locator('.skybreak-app')).toHaveAttribute('data-theme', 'deluxe');
  await chooseTheme(theme, 'arcade');
  await expect(page.locator('.skybreak-app')).toHaveAttribute('data-theme', 'arcade');
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(0); expect(errors).toEqual([]);
});

test('Deluxe handles cancelled and failed backdrop preparation without replacing the working renderer', async ({ page }) => {
  await probe(page);
  let finish: (() => Promise<void>) | undefined;
  await page.route('**/tempest-coast/backdrop.webp', route => new Promise<void>(resolve => {
    finish = async () => { await route.continue(); resolve(); };
  }));
  const theme = page.getByRole('group', { name: 'Theme', exact: true });
  await chooseTheme(theme, 'deluxe'); await expect.poll(() => !!finish).toBe(true);
  await expect(page.locator('canvas')).toHaveCount(1);
  await chooseTheme(theme, 'arcade'); await finish!(); await page.clock.runFor(100);
  await expect(page.locator('.skybreak-app')).toHaveAttribute('data-theme', 'arcade');
  await page.unroute('**/tempest-coast/backdrop.webp');
  await page.evaluate(async () => {
    const path = '/src/games/skybreak/themes.ts'; const { themes } = await import(path);
    themes.deluxe.scenery.url += '?failure';
  });
  await page.route('**/tempest-coast/backdrop.webp?failure', route => route.abort());
  await chooseTheme(theme, 'deluxe'); await expect(page.locator('.skybreak-asset-status')).toContainText('Keeping Aurora Fleet');
  await expect(theme.locator('input[value="arcade"]')).toBeChecked(); await expect(page.locator('canvas')).toHaveCount(1);
  await page.evaluate(async () => {
    const path = '/src/games/skybreak/themes.ts'; const { themes } = await import(path);
    themes.deluxe.scenery.url = themes.deluxe.scenery.url.replace('?failure', '?disposal');
  });
  finish = undefined;
  await page.route('**/tempest-coast/backdrop.webp?disposal', route => new Promise<void>(resolve => {
    finish = async () => { await route.continue(); resolve(); };
  }));
  await chooseTheme(theme, 'deluxe'); await expect.poll(() => !!finish).toBe(true);
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  await finish!(); await page.clock.runFor(100);
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('Deluxe uses complete sprites through Canvas 2D and freezes decoration for reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await probe(page);
  const theme = page.getByRole('group', { name: 'Theme', exact: true });
  await chooseTheme(theme, 'deluxe'); await expect(page.locator('.skybreak-app')).toHaveAttribute('data-theme', 'deluxe');
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.clock.runFor(50); // Settle the new theme's layout and backing buffer before comparing frames.
  const picture = await page.locator('.play-surface').screenshot();
  await page.clock.runFor(1800); expect((await page.locator('.play-surface').screenshot()).equals(picture), 'reduced-motion title stays unchanged').toBe(true);
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
});
