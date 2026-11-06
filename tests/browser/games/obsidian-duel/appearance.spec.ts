import { test, expect, type Page } from '@playwright/test';

import { chooseTheme } from '../../menu.ts';

async function openDuel(page: Page) {
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
  await expect.poll(() => page.evaluate(() => (window as any).duelImages.length === 4 && (window as any).duelImages.every((image: HTMLImageElement) => image.complete && image.naturalWidth > 0))).toBe(true);
  await page.evaluate(() => { (window as any).duelBaselineImages = (window as any).duelImages.splice(0); });
  await page.clock.runFor(50);
  await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.clock.runFor(3100);
  await page.keyboard.down('ArrowRight'); await page.keyboard.down('ArrowUp'); await page.keyboard.down('z');
  await page.clock.runFor(120); await page.keyboard.press('Escape');
  await page.keyboard.up('ArrowRight'); await page.keyboard.up('ArrowUp'); await page.keyboard.up('z');
  await page.evaluate(() => { (window as any).retainedDuel = (window as any).duelProbe; });
}
const state = (page: Page) => page.evaluate(() => JSON.stringify((window as any).duelProbe));
const released = (page: Page) => page.evaluate(() => (window as any).duelImages.every((image: HTMLImageElement) => !image.hasAttribute('src')));
test('Moonfall Sanctum uses complete image sprites, preserves the duel, freezes, resumes and releases artwork', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const requests: string[] = []; page.on('request', request => requests.push(request.url()));
  await openDuel(page);
  expect(requests.filter(url => /obsidian-duel\/(deluxe-|art\/moonfall)/.test(url))).toEqual([]);
  const theme = page.getByRole('group', { name: 'Theme', exact: true }), frozen = await state(page);
  const baseline = await page.locator('canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await chooseTheme(theme, 'deluxe');
  await expect(page.locator('.duel-app')).toHaveAttribute('data-theme', 'deluxe');
  expect(await state(page)).toBe(frozen);
  expect(await page.evaluate(() => (window as any).duelImages.map((image: HTMLImageElement) => [image.naturalWidth, image.naturalHeight])))
    .toEqual([[1600, 896], [2560, 2240], [2560, 2240], [1536, 768]]);
  expect(await page.evaluate(() => (window as any).duelImages.filter((image: HTMLImageElement) => /\/(nera|kael)\.png/.test(image.src)).every((image: HTMLImageElement) => image.src.includes('moonfall-sanctum')))).toBe(true);
  expect(await page.evaluate(() => (window as any).duelProbe === (window as any).retainedDuel)).toBe(true);
  await page.clock.runFor(50);
  const image = await page.locator('canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL());
  expect(image).not.toBe(baseline);
  await page.clock.runFor(1500);
  expect(await page.locator('canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(image);
  expect(await state(page)).toBe(frozen);
  await chooseTheme(theme, 'arcade');
  await expect(page.locator('.duel-app')).toHaveAttribute('data-theme', 'arcade');
  expect(await page.evaluate(() => (window as any).duelImages.slice(0, 4).every((image: HTMLImageElement) => !image.hasAttribute('src')))).toBe(true);
  expect(await state(page)).toBe(frozen);
  await chooseTheme(theme, 'deluxe');
  await expect(page.locator('.duel-app')).toHaveAttribute('data-theme', 'deluxe');
  expect(await page.evaluate(() => (window as any).duelImages.slice(0, -4).every((image: HTMLImageElement) => !image.hasAttribute('src')))).toBe(true);
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await page.clock.runFor(500);
  expect(await state(page)).not.toBe(frozen);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Restart', exact: true }).click(); await page.clock.runFor(4000);
  await expect(page.locator('.duel-arena-label')).toContainText('MOONFALL SANCTUM');
  await page.screenshot({ path: info.outputPath('moonfall-sanctum.png') });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.getByRole('button', { name: 'Exit fullscreen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  await page.setViewportSize({ width: 390, height: 844 }); await page.clock.runFor(80);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await page.clock.runFor(350);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.screenshot({ path: info.outputPath('moonfall-sanctum-narrow.png') });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Game selection', exact: true }).click();
  expect(await released(page)).toBe(true);
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).duelBaselineImages.every((image: HTMLImageElement) => !image.hasAttribute('src')))).toBe(true); expect(errors).toEqual([]);
});

test('combat artwork confirms actual contact and keeps special release and knockdown free of false hit bursts', async ({ page }) => {
  await page.route(/\/src\/games\/obsidian-duel\/presentation\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const originalDrawing = createPresentation; createPresentation = (...args) => {
        const drawing = originalDrawing(...args); window.duelDrawing = drawing; return drawing;
      };` });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openDuel(page);
  for (const mode of ['arcade', 'deluxe']) {
    if (mode !== 'arcade') {
      await chooseTheme(page.getByRole('group', { name: 'Theme', exact: true }), mode);
      await expect(page.locator('.duel-app')).toHaveAttribute('data-appearance', mode);
    }
    const result = await page.evaluate(() => {
      const drawing = (window as any).duelDrawing, match = (window as any).duelProbe;
      const before = JSON.stringify(match), canvas = document.querySelector('canvas')!;
      const { width, height } = canvas.getBoundingClientRect(), host = { width, height, ratio: devicePixelRatio };
      const paint = () => { drawing.draw(match, host, 'paused', 0); return canvas.toDataURL(); };
      const event = { x: 500, z: 92, fighter: 1, strength: 1 };
      drawing.reset(); paint(); const baseline = paint();
      drawing.consume([{ ...event, type: 'special' }, { ...event, type: 'knockdown' }]);
      const release = paint();
      drawing.consume([{ ...event, type: 'hit' }]); const hit = paint();
      drawing.reset(); drawing.consume([{ ...event, type: 'block' }]); const block = paint();
      return { releaseUnchanged: release === baseline, hitVisible: hit !== baseline, guardDistinct: block !== hit && block !== baseline, unchangedMatch: before === JSON.stringify(match) };
    });
    expect(result, mode).toEqual({ releaseUnchanged: true, hitVisible: true, guardDistinct: true, unchangedMatch: true });
  }
});
