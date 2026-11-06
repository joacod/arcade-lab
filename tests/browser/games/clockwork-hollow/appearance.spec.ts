import { test, expect, type Page } from '@playwright/test';

import { chooseTheme } from '../../menu.ts';

async function openHollow(page: Page) {
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
  await expect.poll(() => page.evaluate(() => (window as any).hollowImages.length === 10 && (window as any).hollowImages.every((image: HTMLImageElement) => image.complete && image.naturalWidth > 0))).toBe(true);
  await page.evaluate(() => { (window as any).hollowBaselineImages = (window as any).hollowImages.splice(0); });
  await page.clock.runFor(50);
  await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.clock.runFor(100);
  await page.keyboard.down('d'); await page.keyboard.down('Space'); await page.clock.runFor(120);
  await page.keyboard.press('Escape'); await page.keyboard.up('d'); await page.keyboard.up('Space');
  await page.evaluate(() => { (window as any).retainedHollow = (window as any).hollowProbe; });
}
const state = (page: Page) => page.evaluate(() => JSON.stringify((window as any).hollowProbe));
const released = (page: Page) => page.evaluate(() => (window as any).hollowImages.every((image: HTMLImageElement) => !image.hasAttribute('src')));
async function trackCanvases(page: Page) {
  await page.addInitScript(() => {
    const canvases: HTMLCanvasElement[] = []; (window as any).lumenCanvases = canvases;
    const create = document.createElement.bind(document);
    document.createElement = ((tag: string, options?: ElementCreationOptions) => {
      const element = create(tag, options);
      if (tag === 'canvas') canvases.push(element as HTMLCanvasElement);
      return element;
    }) as typeof document.createElement;
  });
}
const liveCanvases = (page: Page) => page.evaluate(() => (window as any).lumenCanvases.filter((canvas: HTMLCanvasElement) => canvas.width > 1).length);

test('Lumen conservatory retains a paused journey, bounds its artwork and presents all districts', async ({ page }, info) => {
  const errors: string[] = [], deluxeRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().includes('/deluxe-presentation.ts') || request.url().includes('/art/lumen/')) deluxeRequests.push(request.url()); });
  await trackCanvases(page); await openHollow(page);
  expect(deluxeRequests).toEqual([]); expect(await liveCanvases(page)).toBe(1);
  const theme = page.getByRole('group', { name: 'Theme', exact: true });
  const frozen = await state(page);
  const arcadePixels = await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  await chooseTheme(theme, 'deluxe');
  await expect(page.locator('.hollow-app')).toHaveAttribute('data-appearance', 'deluxe');
  await page.clock.runFor(50);
  expect(await state(page)).toBe(frozen);
  expect(await page.evaluate(() => (window as any).retainedHollow === (window as any).hollowProbe)).toBe(true);
  const deluxe = await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  expect(deluxe).not.toBe(arcadePixels); expect(await liveCanvases(page)).toBe(3);
  expect(await page.evaluate(() => (window as any).hollowImages.map((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight])))
    .toEqual([[2304, 240], [768, 144], [1024, 160]]);
  await page.clock.runFor(1000);
  expect(await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).toBe(deluxe);
  await chooseTheme(theme, 'arcade'); await expect(page.locator('.hollow-app')).toHaveAttribute('data-appearance', 'arcade');
  expect(await liveCanvases(page)).toBe(1); expect(await state(page)).toBe(frozen);
  await page.clock.runFor(50);
  expect(await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).toBe(arcadePixels);
  await chooseTheme(theme, 'deluxe'); await expect(page.locator('.hollow-app')).toHaveAttribute('data-appearance', 'deluxe');
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await page.clock.runFor(200);
  expect(await state(page)).not.toBe(frozen);
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Restart', exact: true }).click(); await page.clock.runFor(100);
  await expect(page.locator('.hollow-app')).toHaveAttribute('data-appearance', 'deluxe');
  expect(await page.evaluate(() => (window as any).hollowProbe.elapsed)).toBeLessThan(.2);
  for (let level = 0; level < 3; level++) {
    await page.evaluate(() => {
      const run = (window as any).hollowProbe;
      // Frame a lantern, moving beetle and pressure cue from safe ground.
      const x = [4330, 9030, 11050][run.levelIndex];
      Object.assign(run.player, { x, y: [610, 570, 420][run.levelIndex], vx: 0, vy: 0 });
    });
    await page.clock.runFor(1400);
    expect(await page.evaluate(() => (window as any).hollowProbe.status)).toBe('active');
    expect(await liveCanvases(page)).toBe(3);
    await page.screenshot({ path: info.outputPath(`lumen-${level}.png`) });
    // Inspect the goal independently of scenery and the awakened-bell outcome.
    await page.evaluate(() => { const run = (window as any).hollowProbe; Object.assign(run.player, { x: run.level.goal.x - 130, y: run.level.goal.y + 40, vx: 0, vy: 0 }); });
    await page.clock.runFor(1000);
    await page.screenshot({ path: info.outputPath(`lumen-bell-${level}.png`) });
    await page.evaluate(() => { const run = (window as any).hollowProbe; Object.assign(run.player, { x: run.level.goal.x, y: run.level.goal.y + 60, vx: 0, vy: 0 }); });
    await page.clock.runFor(100);
    if (level < 2) { await page.getByRole('button', { name: /^Continue to/ }).click(); await page.clock.runFor(100); }
  }
  await expect(page.getByRole('heading', { name: 'Victory', exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath('lumen-victory.png') });
  await page.getByRole('button', { name: 'Restart', exact: true }).click(); await page.clock.runFor(100);
  await page.setViewportSize({ width: 390, height: 844 }); await page.clock.runFor(50);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await page.clock.runFor(1000);
  const still = await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  await page.clock.runFor(500);
  expect(await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).toBe(still);
  await page.screenshot({ path: info.outputPath('lumen-narrow.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await expect(page.getByLabel('Bells awakened', { exact: true })).toBeVisible();
  await page.keyboard.down('d'); await page.clock.runFor(150); await page.keyboard.up('d');
  expect(await page.evaluate(() => (window as any).hollowProbe.player.x)).toBeGreaterThan(120);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  expect(await liveCanvases(page)).toBe(0); expect(await released(page)).toBe(true);
  expect(errors).toEqual([]);
});


test('reused environments render independently of content identity and sequence', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await openHollow(page);
  for (const mode of ['arcade', 'deluxe']) {
    if (mode !== 'arcade') {
      await chooseTheme(page.getByRole('group', { name: 'Theme', exact: true }), mode);
      await expect(page.locator('.hollow-app')).toHaveAttribute('data-appearance', mode);
    }
    await page.clock.runFor(50);
    const before = await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
    await page.evaluate(() => { const run = (window as any).hollowProbe; run.level = { ...run.level, id: `extra-${run.level.id}` }; });
    await page.clock.runFor(50);
    expect(await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL()), mode).toBe(before);
  }
});
