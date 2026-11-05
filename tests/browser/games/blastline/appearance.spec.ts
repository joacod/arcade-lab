import { test, expect, type Page } from '@playwright/test';
import { chooseOption } from '../../menu.ts';

async function openBlastline(page: Page, controlled = false) {
  if (controlled) await page.route(/\/src\/games\/blastline\/assets\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const original = prepareEmberCoast; prepareEmberCoast = signal => {
        emberImages.operators = window.blastOperatorURL; return original(signal);
      };` });
  });
  await page.route(/\/src\/games\/blastline\/game\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const original = createRun; createRun = (...args) => { const run = original(...args); window.blastProbe = run; return run; };` });
  });
  await page.addInitScript(() => {
    const images: HTMLImageElement[] = []; (window as any).blastImages = images;
    const Original = window.Image;
    window.Image = class extends Original { constructor() { super(); images.push(this); } };
  });
  await page.clock.install(); await page.goto('/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.getByRole('button', { name: 'Open game: Blastline', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).blastImages.length === 3 && (window as any).blastImages.every((i: HTMLImageElement) => i.complete && i.naturalWidth))).toBeTruthy();
  await page.evaluate(() => { (window as any).blastBaseline = (window as any).blastImages.splice(0); });
  await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.clock.runFor(100);
  await page.keyboard.down('d'); await page.keyboard.down('j'); await page.clock.runFor(300);
  await page.keyboard.press('Escape'); await page.keyboard.up('d'); await page.keyboard.up('j');
  await page.evaluate(() => { (window as any).retainedBlast = (window as any).blastProbe; });
}
const state = (page: Page) => page.evaluate(() => JSON.stringify((window as any).blastProbe));
const released = (page: Page) => page.evaluate(() => (window as any).blastImages.every((i: HTMLImageElement) => !i.hasAttribute('src')));
const source = (page: Page, url: string) => page.evaluate(url => { (window as any).blastOperatorURL = url; }, url);

test('Ember Coast retains the live operation, presents both missions and releases its bundle', async ({ page }, info) => {
  const errors: string[] = [], requests: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (r.url().includes('/ember-coast/')) requests.push(r.url()); });
  await page.addInitScript(() => {
    const frames: number[] = []; (window as any).blastRunFrames = frames;
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (...args: any[]) {
      if (args[0] instanceof HTMLImageElement && /\/(nova|bolt)-run\.png/.test(args[0].src)) frames.push(args[1] / 128);
      return draw.apply(this, args as Parameters<typeof draw>);
    };
  });
  await openBlastline(page); expect(requests).toEqual([]);
  const theme = page.getByRole('combobox', { name: 'Theme', exact: true }), root = page.locator('.blast-app');
  const frozen = await state(page);
  const pixels = () => page.locator('canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL());
  const normal = await pixels();
  await chooseOption(theme, 'assets'); await expect(root).toHaveAttribute('data-appearance', 'assets');
  await page.clock.runFor(50);
  expect(await pixels()).not.toBe(normal); expect(await state(page)).toBe(frozen);
  expect(await page.evaluate(() => (window as any).retainedBlast === (window as any).blastProbe)).toBe(true);
  expect(await page.evaluate(() => (window as any).blastImages.map((i: HTMLImageElement) => [i.naturalWidth, i.naturalHeight])))
    .toEqual([[640, 1024], [384, 384], [512, 512], [1536, 1024], [768, 640], [768, 640]]);
  await chooseOption(theme, 'normal'); await page.clock.runFor(50);
  expect(await released(page)).toBe(true); expect(await state(page)).toBe(frozen);
  await chooseOption(theme, 'assets'); await expect(root).toHaveAttribute('data-appearance', 'assets');
  await page.evaluate(() => { (window as any).blastRunFrames.length = 0; (window as any).blastProbe.player.immune = 0; });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.keyboard.down('d'); await page.clock.runFor(650); await page.keyboard.up('d');
  expect(await page.evaluate(() => [...new Set((window as any).blastRunFrames)].sort())).toEqual([0, 1, 2, 3, 4, 5]);
  expect(await state(page)).not.toBe(frozen);
  await page.keyboard.press('Escape');
  await page.clock.runFor(50);
  const heldFrame = await page.evaluate(() => (window as any).blastRunFrames.at(-1));
  await page.clock.runFor(500);
  expect(await page.evaluate(() => (window as any).blastRunFrames.at(-1))).toBe(heldFrame);
  await page.getByRole('button', { name: 'Restart', exact: true }).click(); await page.clock.runFor(100);
  await expect(root).toHaveAttribute('data-appearance', 'assets');
  expect(await page.evaluate(() => (window as any).blastProbe.destroyed)).toBe(0);
  await page.clock.runFor(300); await page.screenshot({ path: info.outputPath('ember-coast-border.png') });
  await page.evaluate(() => { const r = (window as any).blastProbe; r.rescued = true; r.relays.forEach((x: any) => x.health = 0); Object.assign(r.player, { x: r.mission.exit.x + 20, y: 618, vx: 0, vy: 0 }); });
  await page.clock.runFor(3200); await expect(root).toHaveAttribute('data-screen', 'interlude');
  await page.getByRole('button', { name: 'Continue', exact: true }).click(); await page.clock.runFor(200);
  await page.evaluate(() => { const r = (window as any).blastProbe; Object.assign(r.player, { operator: 'bolt', x: 10160, y: 590, vx: 0, vy: 0, immune: 10 }); });
  await page.clock.runFor(500); await page.screenshot({ path: info.outputPath('ember-coast-foundry.png') });
  await page.setViewportSize({ width: 390, height: 844 }); await page.clock.runFor(50);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await page.clock.runFor(100);
  await page.screenshot({ path: info.outputPath('ember-coast-mobile.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  expect(await released(page)).toBe(true);
  expect(await page.evaluate(() => (window as any).blastBaseline.every((i: HTMLImageElement) => !i.hasAttribute('src')))).toBe(true);
  await expect(page.locator('canvas')).toHaveCount(0); expect(errors).toEqual([]);
});

test('failed, superseded, resumed and disposed preparation retains the working presentation', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await openBlastline(page, true);
  const theme = page.getByRole('combobox', { name: 'Theme', exact: true }), root = page.locator('.blast-app');
  const frozen = await state(page);
  await source(page, '/blast-invalid.svg');
  await page.route('**/blast-invalid.svg', r => r.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' }));
  await chooseOption(theme, 'assets');
  await expect(page.locator('.game-menu-display-status')).toContainText('Keeping Iron coast');
  expect(await released(page)).toBe(true); expect(await state(page)).toBe(frozen);
  await source(page, '/blast-failure.svg'); await page.route('**/blast-failure.svg', r => r.abort());
  await chooseOption(theme, 'assets');
  await expect(page.locator('.game-menu-display-status')).toContainText('Keeping Iron coast');
  expect(await released(page)).toBe(true); expect(await state(page)).toBe(frozen);
  let finish: (() => Promise<void>) | undefined;
  await page.route(/\/blast-(delayed|resumed|disposed)\.svg$/, route => new Promise<void>(resolve => {
    finish = async () => { await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="1024"/>' }); resolve(); };
  }));
  await source(page, '/blast-delayed.svg'); await chooseOption(theme, 'assets'); await expect.poll(() => !!finish).toBe(true);
  await chooseOption(theme, 'normal'); await finish!(); await page.clock.runFor(50);
  await expect(root).toHaveAttribute('data-appearance', 'normal');
  expect(await released(page)).toBe(true); expect(await state(page)).toBe(frozen);
  finish = undefined; await source(page, '/blast-resumed.svg'); await chooseOption(theme, 'assets'); await expect.poll(() => !!finish).toBe(true);
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await finish!(); await page.clock.runFor(50);
  await expect(root).toHaveAttribute('data-appearance', 'normal'); expect(await released(page)).toBe(true);
  await page.keyboard.press('Escape'); finish = undefined;
  await source(page, '/blast-disposed.svg'); await chooseOption(theme, 'assets'); await expect.poll(() => !!finish).toBe(true);
  await page.getByRole('button', { name: 'Game selection', exact: true }).click(); await finish!(); await page.clock.runFor(50);
  expect(await released(page)).toBe(true); await expect(page.locator('canvas')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('candidate and active drawing failures recover to Normal and release their images', async ({ page }) => {
  await page.route(/\/src\/games\/blastline\/presentation\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const original = createPresentation; createPresentation = (...args) => {
        const view = original(...args), replace = view.replaceTheme, draw = view.draw;
        let usesAssets = false;
        view.replaceTheme = (...args) => { const previous = usesAssets, rollback = replace(...args); usesAssets = !!args[1]; return () => { rollback(); usesAssets = previous; }; };
        view.draw = (...args) => { if (usesAssets && window.blastDrawFailure) throw new Error('Drawing failed'); draw(...args); };
        return view;
      };` });
  });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await openBlastline(page);
  const frozen = await state(page), root = page.locator('.blast-app'), theme = page.getByRole('combobox', { name: 'Theme', exact: true });
  await page.evaluate(() => { (window as any).blastDrawFailure = true; });
  await chooseOption(theme, 'assets');
  await expect(page.locator('.game-menu-display-status')).toContainText('Keeping Iron coast');
  expect(await released(page)).toBe(true); expect(await state(page)).toBe(frozen);
  await page.evaluate(() => { (window as any).blastDrawFailure = false; });
  await chooseOption(theme, 'assets'); await expect(root).toHaveAttribute('data-appearance', 'assets');
  await page.evaluate(() => { (window as any).blastDrawFailure = true; }); await page.clock.runFor(50);
  await expect(root).toHaveAttribute('data-appearance', 'normal');
  await expect(page.locator('.game-menu-display-status')).toContainText('Restored Iron coast');
  expect(await released(page)).toBe(true); expect(await state(page)).toBe(frozen);
  expect(errors).toEqual([]);
});
