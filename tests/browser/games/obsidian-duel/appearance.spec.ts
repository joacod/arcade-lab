import { test, expect, type Page } from '@playwright/test';
import { chooseOption } from '../../menu.ts';

async function openDuel(page: Page, controlled: 'assets' | 'quality' | false = false) {
  if (controlled) {
    const module = controlled === 'assets' ? 'assets' : 'quality-assets';
    const prepare = controlled === 'assets' ? 'prepareFoundry' : 'prepareSanctum';
    const images = controlled === 'assets' ? 'foundryImages' : 'sanctumImages';
    await page.route(new RegExp(`/src/games/obsidian-duel/${module}\\.ts(?:\\?.*)?$`), async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: `${await response.text()}
        const prepareOriginal = ${prepare}; ${prepare} = signal => {
          ${images}.stage = window.duelStageURL; return prepareOriginal(signal);
        };` });
    });
  }
  await page.route(/\/src\/games\/obsidian-duel\/game\.ts(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const original = createMatch; createMatch = (...args) => { const m = original(...args); window.duelProbe = m; return m; };` });
  });
  await page.addInitScript(() => {
    const images: HTMLImageElement[] = []; (window as any).duelImages = images;
    const originalContext = HTMLCanvasElement.prototype.getContext;
    (window as any).duelContexts = [];
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: any[]) {
      const ctx = (originalContext as any).call(this, type, ...args);
      if (type === 'webgl2' && ctx && !(window as any).duelContexts.includes(ctx)) (window as any).duelContexts.push(ctx);
      return ctx;
    } as any;
    const Original = window.Image;
    window.Image = class extends Original { constructor() { super(); images.push(this); } };
  });
  await page.clock.install(); await page.goto('/');
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
  await page.getByRole('button', { name: 'Open game: Obsidian Duel', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).duelImages.length === 2 && (window as any).duelImages.every((image: HTMLImageElement) => image.complete && image.naturalWidth > 0))).toBe(true);
  await page.evaluate(() => { (window as any).duelBaselineImages = (window as any).duelImages.splice(0); });
  await page.clock.runFor(50);
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
    .toEqual([[1600, 896], [2560, 2240], [2560, 2240], [512, 256]]);
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

for (const mode of ['assets', 'quality'] as const) test(`${mode}: failed and superseded artwork, resume and disposal cannot replace the working duel`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await openDuel(page, mode);
  const theme = page.getByRole('combobox', { name: 'Theme', exact: true }), frozen = await state(page);
  await stageURL(page, '/duel-invalid.svg');
  await page.route('**/duel-invalid.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' }));
  await chooseOption(theme, mode);
  await expect(page.locator('.game-menu-display-status')).toContainText('Keeping Tempest citadel');
  await expect(theme).toHaveAttribute('value', 'normal');
  expect(await state(page)).toBe(frozen); expect(await released(page)).toBe(true);
  await stageURL(page, '/duel-failure.svg');
  await page.route('**/duel-failure.svg', route => route.abort());
  await chooseOption(theme, mode);
  await expect(page.locator('.game-menu-display-status')).toContainText('Keeping Tempest citadel');
  expect(await state(page)).toBe(frozen); expect(await released(page)).toBe(true);
  let finish: (() => Promise<void>) | undefined;
  await page.route(/\/duel-(delayed|resumed|disposed)\.svg$/, route => new Promise<void>(resolve => {
    finish = async () => { await route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="896"/>' }); resolve(); };
  }));
  for (const action of ['normal', 'resume', 'quit']) {
    finish = undefined;
    await stageURL(page, `/duel-${action === 'normal' ? 'delayed' : action === 'resume' ? 'resumed' : 'disposed'}.svg`);
    await chooseOption(theme, mode); await expect.poll(() => !!finish).toBe(true);
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


test('Moonfall Sanctum uses complete image sprites, preserves the duel, freezes, resumes and releases artwork', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const requests: string[] = []; page.on('request', request => requests.push(request.url()));
  await openDuel(page);
  expect(requests.filter(url => /obsidian-duel\/(quality-|art\/moonfall)/.test(url))).toEqual([]);
  const theme = page.getByRole('combobox', { name: 'Theme', exact: true }), frozen = await state(page);
  const baseline = await page.locator('canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await chooseOption(theme, 'quality');
  await expect(page.locator('.duel-app')).toHaveAttribute('data-theme', 'quality');
  expect(await state(page)).toBe(frozen);
  expect(await page.evaluate(() => (window as any).duelContexts.length)).toBe(0);
  expect(requests.filter(url => /three|vgpu/.test(url))).toEqual([]);
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
  await chooseOption(theme, 'assets');
  await expect(page.locator('.duel-app')).toHaveAttribute('data-theme', 'assets');
  expect(await page.evaluate(() => (window as any).duelImages.slice(0, 4).every((image: HTMLImageElement) => !image.hasAttribute('src')))).toBe(true);
  expect(await state(page)).toBe(frozen);
  await chooseOption(theme, 'quality');
  await expect(page.locator('.duel-app')).toHaveAttribute('data-theme', 'quality');
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

test('Quality trial drawing preserves active sprites; reduced motion freezes decoration; runtime failure suspends and restores Normal', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await openDuel(page);
  const theme = page.getByRole('combobox', { name: 'Theme', exact: true }), frozen = await state(page);
  await chooseOption(theme, 'assets'); await expect(page.locator('.duel-app')).toHaveAttribute('data-theme', 'assets');
  await page.evaluate(() => {
    const ctx = document.querySelector('canvas')!.getContext('2d')!, original = ctx.drawImage;
    (window as any).restoreDuelDraw = () => { ctx.drawImage = original; };
    ctx.drawImage = function (...args: any[]) {
      if (args[0] instanceof HTMLImageElement && args[0].src.includes('moonfall-sanctum')) throw new Error('Sanctum draw interrupted');
      return (original as any).apply(this, args);
    } as any;
  });
  await chooseOption(theme, 'quality');
  await expect(page.locator('.game-menu-display-status')).toContainText('Keeping Eclipse Foundry');
  await expect(theme).toHaveAttribute('value', 'assets');
  expect(await state(page)).toBe(frozen);
  expect(await page.evaluate(() => (window as any).duelImages.slice(-4).every((image: HTMLImageElement) => !image.hasAttribute('src')))).toBe(true);
  expect(await page.evaluate(() => (window as any).duelImages.slice(0,4).every((image: HTMLImageElement) => image.hasAttribute('src')))).toBe(true);
  await page.evaluate(() => (window as any).restoreDuelDraw());
  await chooseOption(theme, 'quality'); await expect(page.locator('.duel-app')).toHaveAttribute('data-theme', 'quality');
  await page.getByRole('button', { name: 'Game setup', exact: true }).click(); await page.clock.runFor(50);
  const still = await page.locator('canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.clock.runFor(1100);
  expect(await page.locator('canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(still);
  await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.clock.runFor(50);
  await page.evaluate(() => {
    const ctx = document.querySelector('canvas')!.getContext('2d')!, original = ctx.drawImage;
    ctx.drawImage = function (...args: any[]) {
      if (args[0] instanceof HTMLImageElement && args[0].src.includes('moonfall-sanctum')) throw new Error('Runtime draw interrupted');
      return (original as any).apply(this, args);
    } as any;
  });
  await page.clock.runFor(50);
  await expect(page.locator('.duel-app')).toHaveAttribute('data-theme', 'normal');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await expect(page.locator('.game-menu-display-status')).toContainText('Your match is preserved');
  expect(await released(page)).toBe(true);
  const recovered = await state(page); await page.clock.runFor(400); expect(await state(page)).toBe(recovered);
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await page.clock.runFor(100);
  expect(await state(page)).not.toBe(recovered);
});

for (const action of ['normal', 'resume', 'quit'] as const) test(`late Quality import cannot activate after ${action}`, async ({ page }) => {
  await openDuel(page);
  let finish: (() => Promise<void>) | undefined;
  await page.route(/\/src\/games\/obsidian-duel\/quality-assets\.ts(?:\?.*)?$/, route => new Promise<void>(resolve => {
    finish = async () => { await route.continue(); resolve(); };
  }));
  const frozen = await state(page), theme = page.getByRole('combobox', { name: 'Theme', exact: true });
  await chooseOption(theme, 'quality'); await expect.poll(() => !!finish).toBe(true);
  await expect(page.locator('.duel-app')).toHaveAttribute('data-appearance', 'normal');
  if (action === 'normal') await chooseOption(theme, 'normal');
  else await page.getByRole('button', { name: action === 'resume' ? 'Resume' : 'Game selection', exact: true }).click();
  await finish!(); await page.clock.runFor(100);
  expect(await page.evaluate(() => (window as any).duelImages.length)).toBe(0);
  if (action === 'quit') await expect(page.locator('canvas')).toHaveCount(0);
  else {
    if (action === 'resume') await page.keyboard.press('Escape');
    await expect(theme).toHaveAttribute('value', 'normal');
    await expect(page.locator('.duel-app')).toHaveAttribute('data-theme', 'normal');
    if (action === 'normal') expect(await state(page)).toBe(frozen);
  }
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
  for (const mode of ['normal', 'assets', 'quality']) {
    if (mode !== 'normal') {
      await chooseOption(page.getByRole('combobox', { name: 'Theme', exact: true }), mode);
      await expect(page.locator('.duel-app')).toHaveAttribute('data-theme', mode);
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
