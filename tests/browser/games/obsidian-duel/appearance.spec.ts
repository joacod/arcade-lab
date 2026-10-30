import { test, expect, type Page } from '@playwright/test';
import { chooseOption } from '../../menu.ts';

async function openDuel(page: Page, controlled = false) {
  if (controlled) await page.route(/\/src\/games\/obsidian-duel\/assets\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const prepareOriginal = prepareFoundry; prepareFoundry = signal => {
        foundryImages.stage = window.duelStageURL; return prepareOriginal(signal);
      };` });
  });
  await page.route(/\/src\/games\/obsidian-duel\/game\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const original = createMatch; createMatch = (...args) => { const m = original(...args); window.duelProbe = m; return m; };` });
  });
  await page.addInitScript(() => {
    const images: HTMLImageElement[] = []; (window as any).duelImages = images;
    const Original = window.Image;
    window.Image = class extends Original { constructor() { super(); images.push(this); } };
  });
  await page.clock.install(); await page.goto('/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.getByRole('button', { name: 'Open game: Obsidian Duel', exact: true }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.clock.runFor(3100);
  await page.keyboard.down('d'); await page.keyboard.down('w'); await page.keyboard.down('j');
  await page.clock.runFor(120); await page.keyboard.press('Escape');
  await page.keyboard.up('d'); await page.keyboard.up('w'); await page.keyboard.up('j');
  await page.evaluate(() => { (window as any).retainedDuel = (window as any).duelProbe; });
}
const state = (page: Page) => page.evaluate(() => JSON.stringify((window as any).duelProbe));
const released = (page: Page) => page.evaluate(() => (window as any).duelImages.every((image: HTMLImageElement) => !image.hasAttribute('src')));
const stageURL = (page: Page, url: string) => page.evaluate(url => { (window as any).duelStageURL = url; }, url);

test('Eclipse Foundry replaces the complete presentation while retaining the duel and releasing artwork', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await openDuel(page);
  expect(await page.evaluate(() => (window as any).duelImages.length)).toBe(0);
  const theme = page.getByRole('combobox', { name: 'Theme', exact: true });
  const frozen = await state(page);
  await page.clock.runFor(50);
  const normal = await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  await chooseOption(theme, 'assets');
  await expect(page.locator('.duel-app')).toHaveAttribute('data-appearance', 'assets');
  await page.clock.runFor(50);
  expect(await state(page)).toBe(frozen);
  expect(await page.evaluate(() => (window as any).retainedDuel === (window as any).duelProbe)).toBe(true);
  expect(await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).not.toBe(normal);
  expect(await page.evaluate(() => (window as any).duelImages.map((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight])))
    .toEqual([[1600, 896], [1024, 160], [1024, 160], [512, 128]]);
  await chooseOption(theme, 'normal'); await page.clock.runFor(50);
  expect(await released(page)).toBe(true); expect(await state(page)).toBe(frozen);
  expect(await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).toBe(normal);
  await chooseOption(theme, 'assets');
  await expect(page.locator('.duel-app')).toHaveAttribute('data-appearance', 'assets');
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await page.clock.runFor(200);
  expect(await state(page)).not.toBe(frozen);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Restart', exact: true }).click(); await page.clock.runFor(3300);
  await expect(page.locator('.duel-app')).toHaveAttribute('data-appearance', 'assets');
  await expect(page.locator('.duel-arena-label')).toContainText('ECLIPSE FOUNDRY');
  await page.screenshot({ path: info.outputPath('eclipse-foundry.png') });
  await page.setViewportSize({ width: 390, height: 844 }); await page.clock.runFor(50);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await page.clock.runFor(300);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: info.outputPath('eclipse-foundry-narrow.png') });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  expect(await released(page)).toBe(true); await expect(page.locator('canvas')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('failed and superseded artwork, resume and disposal cannot replace the working duel', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await openDuel(page, true);
  const theme = page.getByRole('combobox', { name: 'Theme', exact: true }), frozen = await state(page);
  await stageURL(page, '/duel-invalid.svg');
  await page.route('**/duel-invalid.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' }));
  await chooseOption(theme, 'assets');
  await expect(page.locator('.game-menu-display-status')).toContainText('Keeping Tempest citadel');
  await expect(theme).toHaveAttribute('value', 'normal');
  expect(await state(page)).toBe(frozen); expect(await released(page)).toBe(true);
  await stageURL(page, '/duel-failure.svg');
  await page.route('**/duel-failure.svg', route => route.abort());
  await chooseOption(theme, 'assets');
  await expect(page.locator('.game-menu-display-status')).toContainText('Keeping Tempest citadel');
  expect(await state(page)).toBe(frozen); expect(await released(page)).toBe(true);
  let finish: (() => Promise<void>) | undefined;
  await page.route(/\/duel-(delayed|resumed|disposed)\.svg$/, route => new Promise<void>(resolve => {
    finish = async () => { await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="896"/>' }); resolve(); };
  }));
  for (const action of ['normal', 'resume', 'quit']) {
    finish = undefined;
    await stageURL(page, `/duel-${action === 'normal' ? 'delayed' : action === 'resume' ? 'resumed' : 'disposed'}.svg`);
    await chooseOption(theme, 'assets'); await expect.poll(() => !!finish).toBe(true);
    await expect(page.locator('.duel-app')).toHaveAttribute('data-appearance', 'normal');
    await expect(page.locator('.duel-arena-label')).toContainText('TEMPEST CITADEL');
    if (action === 'normal') await chooseOption(theme, 'normal');
    else await page.getByRole('button', { name: action === 'resume' ? 'Resume' : 'Game selection', exact: true }).click();
    await finish!(); await page.clock.runFor(50);
    expect(await released(page)).toBe(true);
    if (action !== 'quit') {
      await expect(page.locator('.duel-app')).toHaveAttribute('data-appearance', 'normal');
      if (action === 'normal') expect(await state(page)).toBe(frozen);
      if (action === 'resume') await page.keyboard.press('Escape');
    } else await expect(page.locator('canvas')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('a candidate draw failure restores the active arena and releases its images', async ({ page }) => {
  await openDuel(page);
  const frozen = await state(page);
  await page.evaluate(() => {
    const context = document.querySelector('canvas')!.getContext('2d')!, draw = context.drawImage;
    context.drawImage = function (...args: any[]) {
      if (args[0] instanceof HTMLImageElement && args[0].naturalWidth === 1600) throw new Error('Candidate could not draw');
      return (draw as any).apply(this, args);
    } as typeof draw;
  });
  await chooseOption(page.getByRole('combobox', { name: 'Theme', exact: true }), 'assets');
  await expect(page.locator('.game-menu-display-status')).toContainText('Keeping Tempest citadel');
  await expect(page.locator('.duel-app')).toHaveAttribute('data-appearance', 'normal');
  expect(await state(page)).toBe(frozen); expect(await released(page)).toBe(true);
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await page.clock.runFor(100);
  expect(await state(page)).not.toBe(frozen);
});
