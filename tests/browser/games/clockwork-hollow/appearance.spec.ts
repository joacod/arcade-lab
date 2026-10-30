import { test, expect, type Page } from '@playwright/test';
import { chooseOption } from '../../menu.ts';

async function openHollow(page: Page, controlled = false) {
  if (controlled) await page.route(/\/src\/games\/clockwork-hollow\/assets\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const prepareOriginal = prepareBellgarden; prepareBellgarden = signal => {
        bellgardenImages.keeper = window.hollowKeeperURL; return prepareOriginal(signal);
      };` });
  });
  await page.route(/\/src\/games\/clockwork-hollow\/game\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const original = createRun; createRun = (...args) => { const run = original(...args); window.hollowProbe = run; return run; };` });
  });
  await page.addInitScript(() => {
    const images: HTMLImageElement[] = []; (window as any).hollowImages = images;
    const Original = window.Image;
    window.Image = class extends Original { constructor() { super(); images.push(this); } };
  });
  await page.clock.install(); await page.goto('/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.getByRole('button', { name: 'Open game: Clockwork Hollow', exact: true }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.clock.runFor(100);
  await page.keyboard.down('d'); await page.keyboard.down('Space'); await page.clock.runFor(120);
  await page.keyboard.press('Escape'); await page.keyboard.up('d'); await page.keyboard.up('Space');
  await page.evaluate(() => { (window as any).retainedHollow = (window as any).hollowProbe; });
}
const state = (page: Page) => page.evaluate(() => JSON.stringify((window as any).hollowProbe));
const released = (page: Page) => page.evaluate(() => (window as any).hollowImages.every((image: HTMLImageElement) => !image.hasAttribute('src')));
const keeperURL = (page: Page, url: string) => page.evaluate(url => { (window as any).hollowKeeperURL = url; }, url);

test('Bellgarden loads its bundle, retains the run across modes and restart, and releases images', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await openHollow(page);
  expect(await page.evaluate(() => (window as any).hollowImages.length)).toBe(0);
  const theme = page.getByRole('combobox', { name: 'Theme', exact: true });
  const frozen = await state(page);
  const normal = await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  await chooseOption(theme, 'assets');
  await expect(page.locator('.hollow-app')).toHaveAttribute('data-appearance', 'assets');
  await page.clock.runFor(50);
  expect(await state(page)).toBe(frozen);
  expect(await page.evaluate(() => (window as any).retainedHollow === (window as any).hollowProbe)).toBe(true);
  expect(await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).not.toBe(normal);
  expect(await page.evaluate(() => (window as any).hollowImages.map((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight])))
    .toEqual([[512, 80], [256, 48], [1024, 160], [384, 192], ...Array.from({ length: 6 }, () => [960, 640])]);
  await chooseOption(theme, 'normal'); await page.clock.runFor(50);
  expect(await released(page)).toBe(true); expect(await state(page)).toBe(frozen);
  expect(await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).toBe(normal);
  await chooseOption(theme, 'assets');
  await expect(page.locator('.hollow-app')).toHaveAttribute('data-appearance', 'assets');
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await page.clock.runFor(200);
  expect(await state(page)).not.toBe(frozen);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Restart', exact: true }).click(); await page.clock.runFor(100);
  await expect(page.locator('.hollow-app')).toHaveAttribute('data-appearance', 'assets');
  expect(await page.evaluate(() => (window as any).hollowProbe.elapsed)).toBeLessThan(.2);
  // Inspect the image treatment in each district through the existing bell transition.
  for (let district = 0; district < 3; district++) {
    await page.evaluate(() => {
      const run = (window as any).hollowProbe, point = run.level.checkpoints[run.levelIndex === 0 ? 1 : 0];
      Object.assign(run.player, point, { vx: 0, vy: 0 });
    });
    await page.clock.runFor(1800);
    expect(await page.evaluate(() => (window as any).hollowProbe.status)).toBe('active');
    await page.screenshot({ path: info.outputPath(`bellgarden-${district}.png`) });
    await page.evaluate(() => { const run = (window as any).hollowProbe; Object.assign(run.player, { x: run.level.goal.x, y: run.level.goal.y + 60, vx: 0, vy: 0 }); });
    await page.clock.runFor(100);
    if (district < 2) {
      await page.getByRole('button', { name: /^Continue to/ }).click(); await page.clock.runFor(100);
    }
  }
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  expect(await released(page)).toBe(true);
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('failed, superseded, resumed and disposed image preparation keeps the active journey', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await openHollow(page, true);
  const theme = page.getByRole('combobox', { name: 'Theme', exact: true });
  const frozen = await state(page);
  // Redirect only the keeper sheet. The remaining bundled images still prepare normally.
  await keeperURL(page, '/hollow-invalid.svg');
  await page.route('**/hollow-invalid.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' }));
  await chooseOption(theme, 'assets');
  await expect(page.locator('.game-menu-display-status')).toContainText('Keeping Verdant clockwork');
  await expect(theme).toHaveAttribute('value', 'normal');
  expect(await state(page)).toBe(frozen); expect(await released(page)).toBe(true);
  await keeperURL(page, '/hollow-failure.svg');
  await page.route('**/hollow-failure.svg', route => route.abort());
  await chooseOption(theme, 'assets');
  await expect(page.locator('.game-menu-display-status')).toContainText('Keeping Verdant clockwork');
  expect(await state(page)).toBe(frozen); expect(await released(page)).toBe(true);
  await keeperURL(page, '/hollow-delayed.svg');
  let finish: (() => Promise<void>) | undefined;
  await page.route(/\/hollow-(delayed|resumed|disposed)\.svg$/, route => new Promise<void>(resolve => {
    finish = async () => { await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="80"/>' }); resolve(); };
  }));
  await chooseOption(theme, 'assets'); await expect.poll(() => !!finish).toBe(true);
  await chooseOption(theme, 'normal'); await finish!(); await page.clock.runFor(50);
  await expect(page.locator('.hollow-app')).toHaveAttribute('data-appearance', 'normal');
  expect(await state(page)).toBe(frozen); expect(await released(page)).toBe(true);
  finish = undefined;
  await keeperURL(page, '/hollow-resumed.svg');
  await chooseOption(theme, 'assets'); await expect.poll(() => !!finish).toBe(true);
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await finish!(); await page.clock.runFor(50);
  await expect(page.locator('.hollow-app')).toHaveAttribute('data-appearance', 'normal'); expect(await released(page)).toBe(true);
  await page.keyboard.press('Escape'); finish = undefined;
  await keeperURL(page, '/hollow-disposed.svg');
  await chooseOption(theme, 'assets'); await expect.poll(() => !!finish).toBe(true);
  await page.getByRole('button', { name: 'Game selection', exact: true }).click(); await finish!(); await page.clock.runFor(50);
  expect(await released(page)).toBe(true); await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open game: Clockwork Hollow', exact: true }).click();
  await expect(page.locator('.hollow-app')).toHaveAttribute('data-appearance', 'normal');
  expect(errors).toEqual([]);
});
