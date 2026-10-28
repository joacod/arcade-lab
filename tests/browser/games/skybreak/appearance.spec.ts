import { test, expect } from '@playwright/test';
import { openOptions } from '../../menu.ts';

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
      themes.fixture = { ...themes['deep-space'], name: 'Test fleet', art: { images: { ship: '/flight-test.svg' },
        actors: { player: actor, straight: actor, crossing: actor, swoop: actor, interceptor: actor } } };
      themes.failure = { ...themes.fixture, name: 'Unavailable fleet', art: { ...themes.fixture.art, images: { ship: '/flight-failure.svg' } } };
      themes.disposal = { ...themes.fixture, name: 'Pending fleet', art: { ...themes.fixture.art, images: { ship: '/flight-disposal.svg' } } };` });
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
  await openOptions(page);
  const appearance = page.getByRole('combobox', { name: 'Appearance', exact: true });
  await appearance.selectOption('fixture');
  await expect(page.locator('.skybreak-asset-status')).toContainText('Preparing');
  await expect.poll(() => !!finish).toBe(true);
  await appearance.selectOption('deep-space');
  await finish!();
  await page.clock.runFor(100);
  await expect(page.locator('.skybreak-app')).toHaveAttribute('data-theme', 'deep-space');
  expect(await state()).toBe(frozen);
  await expect(page.locator('.skybreak-asset-status')).toBeHidden();

  await page.route('**/flight-failure.svg', route => route.abort());
  await appearance.selectOption('failure');
  await expect(page.locator('.skybreak-asset-status')).toContainText('Keeping Deep Space');
  await expect(appearance).toHaveValue('deep-space'); expect(await state()).toBe(frozen);
  await page.getByRole('button', { name: 'Restart', exact: true }).click(); await page.clock.runFor(50);
  await expect(page.locator('.skybreak-app')).toHaveAttribute('data-theme', 'deep-space');
  expect(await page.evaluate(() => (window as any).flightProbe.elapsed)).toBeLessThan(0.1);
  await page.keyboard.press('Escape'); await openOptions(page);

  finish = undefined;
  await page.route('**/flight-disposal.svg', route => new Promise<void>(resolve => {
    finish = async () => {
      await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"/>' }); resolve();
    };
  }));
  await appearance.selectOption('disposal'); await expect.poll(() => !!finish).toBe(true);
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  await finish!(); await page.clock.runFor(100);
  await expect(page.locator('.skybreak-app')).toHaveCount(0); await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByRole('button', { name: 'Play Skybreak', exact: true }).click();
  await expect(page.locator('.skybreak-app')).toHaveAttribute('data-theme', 'pacific');
  expect(errors).toEqual([]);
});
