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
  const errors: string[] = [], qualityRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().includes('/quality-presentation.ts')) qualityRequests.push(request.url()); });
  await trackCanvases(page); await openHollow(page);
  expect(qualityRequests).toEqual([]); expect(await liveCanvases(page)).toBe(1);
  const theme = page.getByRole('combobox', { name: 'Theme', exact: true });
  const frozen = await state(page);
  const normal = await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  await chooseOption(theme, 'quality');
  await expect(page.locator('.hollow-app')).toHaveAttribute('data-appearance', 'quality');
  await page.clock.runFor(50);
  expect(await state(page)).toBe(frozen);
  expect(await page.evaluate(() => (window as any).retainedHollow === (window as any).hollowProbe)).toBe(true);
  const quality = await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  expect(quality).not.toBe(normal); expect(await liveCanvases(page)).toBe(3);
  await page.clock.runFor(1000);
  expect(await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).toBe(quality);
  await chooseOption(theme, 'assets'); await expect(page.locator('.hollow-app')).toHaveAttribute('data-appearance', 'assets');
  expect(await liveCanvases(page)).toBe(1); expect(await state(page)).toBe(frozen);
  await chooseOption(theme, 'normal'); await page.clock.runFor(50);
  expect(await released(page)).toBe(true);
  expect(await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).toBe(normal);
  await chooseOption(theme, 'quality'); await expect(page.locator('.hollow-app')).toHaveAttribute('data-appearance', 'quality');
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await page.clock.runFor(200);
  expect(await state(page)).not.toBe(frozen);
  await page.keyboard.press('Escape'); await page.getByRole('button', { name: 'Restart', exact: true }).click(); await page.clock.runFor(100);
  await expect(page.locator('.hollow-app')).toHaveAttribute('data-appearance', 'quality');
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

test('Lumen preparation cancellation cannot attach artwork after selection, resume or disposal', async ({ page }) => {
  for (const action of ['normal', 'resume', 'quit']) {
    await trackCanvases(page);
    let finish: (() => Promise<void>) | undefined;
    await page.route(/\/src\/games\/clockwork-hollow\/quality-presentation\.ts(?:\?.*)?$/, route => new Promise<void>(resolve => {
      finish = async () => { const response = await route.fetch(); await route.fulfill({ response }); resolve(); };
    }));
    await openHollow(page);
    const theme = page.getByRole('combobox', { name: 'Theme', exact: true }), frozen = await state(page);
    await chooseOption(theme, 'quality'); await expect.poll(() => !!finish).toBe(true);
    if (action === 'normal') await chooseOption(theme, 'normal');
    else await page.getByRole('button', { name: action === 'resume' ? 'Resume' : 'Game selection', exact: true }).click();
    await finish!(); await page.clock.runFor(50);
    if (action !== 'quit') {
      await expect(page.locator('.hollow-app')).toHaveAttribute('data-appearance', 'normal');
      expect(await liveCanvases(page)).toBe(1);
      if (action === 'normal') expect(await state(page)).toBe(frozen);
    } else { await expect(page.locator('canvas')).toHaveCount(0); expect(await liveCanvases(page)).toBe(0); }
    await page.unrouteAll({ behavior: 'wait' });
  }
});

test('Lumen failed preparation and drawing recover with the journey intact and caches released', async ({ page }) => {
  await trackCanvases(page);
  await page.route(/\/src\/games\/clockwork-hollow\/quality-presentation\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const originalDrawing = createLumenDrawing;
      createLumenDrawing = context => {
        const drawing = originalDrawing(context), scenery = drawing.scenery;
        drawing.scenery = (...args) => { scenery(...args); if (window.lumenFailure) throw new Error('Drawing failed'); };
        return drawing;
      };` });
  });
  await openHollow(page);
  const theme = page.getByRole('combobox', { name: 'Theme', exact: true }), frozen = await state(page);
  await page.evaluate(() => { (window as any).lumenFailure = true; });
  await chooseOption(theme, 'quality');
  await expect(page.locator('.game-menu-display-status')).toContainText('Keeping Verdant clockwork');
  expect(await state(page)).toBe(frozen); expect(await liveCanvases(page)).toBe(1);
  await page.evaluate(() => { (window as any).lumenFailure = false; });
  await chooseOption(theme, 'quality'); await expect(page.locator('.hollow-app')).toHaveAttribute('data-appearance', 'quality');
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await page.clock.runFor(100);
  await page.evaluate(() => { (window as any).lumenFailure = true; });
  await page.clock.runFor(50);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await expect(page.locator('.hollow-app')).toHaveAttribute('data-appearance', 'normal');
  await expect(page.locator('.game-menu-display-status')).toContainText('Restored Verdant clockwork');
  expect(await liveCanvases(page)).toBe(1);
  const recovered = await state(page); await page.clock.runFor(1000); expect(await state(page)).toBe(recovered);
  expect(await page.evaluate(() => (window as any).retainedHollow === (window as any).hollowProbe)).toBe(true);
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await page.clock.runFor(100);
  expect(await state(page)).not.toBe(recovered);
});


test('a failed Quality import keeps the active Bellgarden images and selection', async ({ page }) => {
  await openHollow(page);
  const theme = page.getByRole('combobox', { name: 'Theme', exact: true });
  await chooseOption(theme, 'assets');
  await expect(page.locator('.hollow-app')).toHaveAttribute('data-appearance', 'assets');
  const frozen = await state(page);
  await page.route(/\/src\/games\/clockwork-hollow\/quality-presentation\.ts(?:\?.*)?$/, route => route.abort());
  await chooseOption(theme, 'quality');
  await expect(page.locator('.game-menu-display-status')).toContainText('Keeping Porcelain Bellgarden');
  await expect(theme).toHaveAttribute('value', 'assets');
  expect(await state(page)).toBe(frozen); expect(await released(page)).toBe(false);
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  expect(await released(page)).toBe(true);
});
