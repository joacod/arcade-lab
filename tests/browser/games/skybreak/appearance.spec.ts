import { test, expect } from '@playwright/test';
import { openMenu } from '../../menu.ts';

test('Skybreak retains its run through failed, superseded and disposed appearance loads', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/\/src\/games\/skybreak\/game\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const original = createRun; createRun = () => { const run = original(); window.flightProbe = run; return run; };` });
  });
  // Supply a controlled external sheet independently of optional local installations.
  await page.route(/\/src\/games\/skybreak\/themes\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const actor = { image: 'ship', rect: [0, 0, 16, 16], footprint: [50, 50], frames: 1, stride: 0, seconds: 0.1, rotation: 0 };
      themes.assets = { ...themes.normal, name: 'Test fleet', scene: 'orbit', art: { images: { ship: '/flight-test.svg' },
        actors: { player: actor, straight: actor, crossing: actor, swoop: actor, interceptor: actor } } };` });
  });
  let finish: (() => Promise<void>) | undefined;
  await page.route('**/flight-test.svg', route => new Promise<void>(resolve => {
    finish = async () => {
      await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path fill="white" d="M8 0 16 16 0 16Z"/></svg>' });
      resolve();
    };
  }));
  await page.clock.install(); await page.goto('/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.getByRole('button', { name: 'Play Skybreak', exact: true }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.clock.runFor(2000);
  await page.keyboard.press('Escape');
  const state = () => page.evaluate(() => JSON.stringify((window as any).flightProbe));
  const frozen = await state();
  await openMenu(page);
  const appearance = page.getByRole('combobox', { name: 'Theme', exact: true });
  await appearance.selectOption('assets');
  await expect(page.locator('.skybreak-asset-status')).toContainText('Preparing');
  await expect.poll(() => !!finish).toBe(true);
  await appearance.selectOption('normal');
  await finish!();
  await page.clock.runFor(100);
  await expect(page.locator('.skybreak-app')).toHaveAttribute('data-theme', 'normal');
  expect(await state()).toBe(frozen);
  await expect(page.locator('.skybreak-asset-status')).toBeHidden();

  await page.route('**/flight-failure.svg', route => route.abort());
  await page.evaluate(async () => { const path = '/src/games/skybreak/themes.ts'; const { themes } = await import(path); themes.assets.art.images.ship = '/flight-failure.svg'; });
  await appearance.selectOption('assets');
  await expect(page.locator('.skybreak-asset-status')).toContainText('Keeping Pacific Run');
  await expect(appearance).toHaveValue('normal'); expect(await state()).toBe(frozen);
  await page.evaluate(async () => { const path = '/src/games/skybreak/themes.ts'; const { themes } = await import(path); themes.assets.art.images.ship = '/flight-ready.svg'; });
  await page.route('**/flight-ready.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path fill="white" d="M8 0 16 16 0 16Z"/></svg>' }));
  await appearance.selectOption('assets');
  await expect(page.locator('.skybreak-app')).toHaveAttribute('data-theme', 'assets');
  expect(await state()).toBe(frozen);
  await page.getByRole('button', { name: 'Restart', exact: true }).click(); await page.clock.runFor(50);
  await expect(page.locator('.skybreak-app')).toHaveAttribute('data-theme', 'assets');
  expect(await page.evaluate(() => (window as any).flightProbe.elapsed)).toBeLessThan(0.1);
  await page.keyboard.press('Escape'); await openMenu(page);

  await appearance.selectOption('normal');
  finish = undefined;
  await page.route('**/flight-disposal.svg', route => new Promise<void>(resolve => {
    finish = async () => {
      await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"/>' }); resolve();
    };
  }));
  await page.evaluate(async () => { const path = '/src/games/skybreak/themes.ts'; const { themes } = await import(path); themes.assets.art.images.ship = '/flight-disposal.svg'; });
  await appearance.selectOption('assets'); await expect.poll(() => !!finish).toBe(true);
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  await finish!(); await page.clock.runFor(100);
  await expect(page.locator('.skybreak-app')).toHaveCount(0); await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByRole('button', { name: 'Play Skybreak', exact: true }).click();
  await expect(page.locator('.skybreak-app')).toHaveAttribute('data-theme', 'normal');
  expect(errors).toEqual([]);
});
