import { test, expect } from '@playwright/test';

for (const name of ['Last Light Clearing', 'Clockwork Hollow', 'Midnight Circuit', 'Obsidian Duel', 'Blastline', 'Skybreak']) {
  test(`${name} waits for required artwork and can retry without remounting`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    const artwork = /\/src\/games\/[^/]+\/art\/.*\.(svg|png|webp)(?:\?.*)?$/;
    await page.route(artwork, route => route.abort());
    await page.getByRole('button', { name: `Open game: ${name}`, exact: true }).click();
    await expect(page.locator('.game-menu-art-status')).toContainText('Artwork could not load');
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Game selection', exact: true })).toBeEnabled();

    await expect(page.getByRole('radio', { name: /^Deluxe/ })).toBeEnabled();
    await page.unroute(artwork);
    await page.getByRole('button', { name: 'Retry artwork', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
    await expect(page.locator('.game-menu-art-status')).toBeHidden();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Game selection', exact: true }).click();
    await expect(page.locator('canvas')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

const presentations = [
  { name: 'Last Light Clearing', slug: 'last-light-clearing', create: 'createRun', arcade: '/ember-ruins/', deluxe: '/rekindled/', image: '**/art/rekindled/keeper.webp' },
  { name: 'Clockwork Hollow', slug: 'clockwork-hollow', create: 'createRun', arcade: '/bellgarden/', deluxe: '/lumen/', image: '**/art/lumen/keeper.png' },
  { name: 'Midnight Circuit', slug: 'midnight-circuit', create: 'createRun', arcade: '/signal-rain/', deluxe: '/afterglow/', image: '**/art/afterglow/fighters/fighters.webp' },
  { name: 'Obsidian Duel', slug: 'obsidian-duel', create: 'createMatch', arcade: '/eclipse-foundry/', deluxe: '/moonfall-sanctum/', image: '**/art/moonfall-sanctum/nera.png' },
  { name: 'Blastline', slug: 'blastline', create: 'createRun', arcade: '/ember-coast/', deluxe: '/ember-reforged/', image: '**/art/ember-reforged/operators.png' },
  { name: 'Skybreak', slug: 'skybreak', create: 'createRun', arcade: '/coastal-sortie/assets-', deluxe: '/coastal-sortie/quality-', image: '**/art/coastal-sortie/quality-fleet.png' },
];
for (const game of presentations) test(`${game.name} retains its run through replacement, cancellation and Arcade recovery`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route(new RegExp(`/src/games/${game.slug}/game\\.ts(?:\\?.*)?$`), async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}
      const originalRun = ${game.create}; ${game.create} = (...args) => { const run = originalRun(...args); window.presentationRun = run; return run; };` });
  });
  await page.addInitScript(() => {
    const probe = { images: [] as HTMLImageElement[], fail: '' }; (window as any).artProbe = probe;
    const Original = window.Image;
    window.Image = class extends Original {
      constructor() { super(); probe.images.push(this); }
      get src() { return super.src; }
      set src(value: string) { super.src = value && !value.startsWith('data:') ? `${value}${value.includes('?') ? '&' : '?'}fixture=${probe.images.length}` : value; }
    };
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (...args: any[]) {
      if (probe.fail && args[0] instanceof HTMLImageElement && args[0].src.includes(probe.fail)) throw new Error('drawing fixture');
      return draw.apply(this, args as Parameters<typeof draw>);
    };
  });
  await page.clock.install(); await page.goto('/');
  await page.getByRole('button', { name: `Open game: ${game.name}`, exact: true }).click();
  const choice = (mode: string) => page.locator(`.menu-theme input[value="${mode}"]`);
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  await expect(choice('arcade')).toBeChecked();
  await expect(page.locator('.menu-theme input')).toHaveCount(2);
  await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.clock.runFor(160);
  await page.keyboard.press('Escape');
  await page.evaluate(() => { (window as any).retainedPresentationRun = (window as any).presentationRun; });
  const state = () => page.evaluate(() => JSON.stringify((window as any).presentationRun));
  const frozen = await state();
  // Network failure and candidate draw failure both retain the working Arcade.
  await page.route(`${game.image}*`, route => route.abort());
  await choice('deluxe').click(); await expect(page.locator('.menu-theme')).toHaveAttribute('aria-busy', 'false');
  await expect(choice('arcade')).toBeChecked(); expect(await state()).toBe(frozen);
  await page.unroute(`${game.image}*`);
  await page.evaluate(part => { (window as any).artProbe.fail = part; }, game.deluxe);
  await choice('deluxe').click(); await expect(page.locator('.menu-theme')).toHaveAttribute('aria-busy', 'false');
  await expect(choice('arcade')).toBeChecked(); expect(await state()).toBe(frozen);
  await page.evaluate(() => { (window as any).artProbe.fail = ''; });
  // A late candidate cannot replace Arcade after selecting it again.
  let release!: () => void, requested = false;
  let gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(`${game.image}*`, async route => { requested = true; await gate; await route.continue(); });
  await choice('deluxe').click(); await expect.poll(() => requested).toBe(true);
  await choice('arcade').click(); release();
  await expect(page.locator('.menu-theme')).toHaveAttribute('aria-busy', 'false');
  await page.unroute(`${game.image}*`); await page.clock.runFor(32);
  await expect(choice('arcade')).toBeChecked(); expect(await state()).toBe(frozen);
  // Successful switching preserves the exact state object and paused frame.
  await choice('deluxe').click(); await expect(choice('deluxe')).toBeChecked();
  await page.clock.runFor(32);
  const pixels = () => page.locator('canvas').first().evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
  const still = await pixels(); await page.clock.runFor(100);
  expect(await pixels()).toBe(still); expect(await state()).toBe(frozen);
  expect(await page.evaluate(() => (window as any).retainedPresentationRun === (window as any).presentationRun)).toBe(true);
  // Runtime Deluxe failure prepares Arcade and requires deliberate Resume.
  await page.evaluate(part => { (window as any).artProbe.fail = part; }, game.deluxe);
  await page.clock.runFor(32);
  await expect(choice('arcade')).toBeChecked();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeEnabled();
  expect(await state()).toBe(frozen);
  expect(await page.evaluate(part => (window as any).artProbe.images.filter((image: HTMLImageElement) => image.src.includes(part)).length, game.deluxe)).toBe(0);
  // Arcade has no fallback: gate Resume, release its images and retry in place.
  await page.evaluate(part => { (window as any).artProbe.fail = part; }, game.arcade);
  await page.clock.runFor(32);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Retry artwork', exact: true })).toBeVisible();
  expect(await state()).toBe(frozen);
  await page.evaluate(() => { (window as any).artProbe.fail = ''; });
  await page.getByRole('button', { name: 'Retry artwork', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeEnabled();
  await expect(choice('arcade')).toBeChecked(); expect(await state()).toBe(frozen);
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await page.clock.runFor(100);
  expect(await state()).not.toBe(frozen);
  if (game.slug === 'last-light-clearing') {
    // A failed renderer during an upgrade must still allow recovery and deliberate resumption.
    await page.evaluate(async () => {
      const path = '/src/games/last-light-clearing/progression.ts';
      const { grantXP } = await import(path); grantXP((window as any).presentationRun, 10);
    });
    await page.clock.runFor(32);
    const choosing = await state();
    await page.evaluate(part => { (window as any).artProbe.fail = part; }, game.arcade);
    await page.clock.runFor(32);
    await expect(page.getByRole('button', { name: 'Retry artwork', exact: true })).toBeVisible();
    await page.locator('.upgrade-choices button').first().click(); expect(await state()).toBe(choosing);
    await page.evaluate(() => { (window as any).artProbe.fail = ''; });
    await page.getByRole('button', { name: 'Retry artwork', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Retry artwork', exact: true })).toBeHidden();
    await page.locator('.upgrade-choices button').first().click(); await page.clock.runFor(32);
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
  }
  await page.keyboard.press('Escape');
  // Disposal invalidates preparation and releases current and late resources.
  requested = false; gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(`${game.image}*`, async route => { requested = true; await gate; await route.continue(); });
  await choice('deluxe').click(); await expect.poll(() => requested).toBe(true);
  await page.getByRole('button', { name: 'Game selection', exact: true }).click(); release();
  await page.unrouteAll({ behavior: 'wait' });
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as any).artProbe.images.every((image: HTMLImageElement) => !image.hasAttribute('src')))).toBe(true);
  // Fresh launch always returns to Arcade, even after a Deluxe selection.
  await page.getByRole('button', { name: `Open game: ${game.name}`, exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeEnabled();
  await expect(choice('arcade')).toBeChecked(); expect(errors).toEqual([]);
});
